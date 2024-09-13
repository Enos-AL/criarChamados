import { Request, Response } from 'express';
import { connectToDatabase, getColunasProtegidasChamados, getColunasProtegidasAtualizacaoDeDados, getTabelasPermitidas } from '../config/bd';
import sql from 'mssql';

type QueryResult = { recordset: { COLUMN_NAME: string }[] };

/**
 * Função auxiliar para filtrar colunas permitidas a partir do `.env`.
 * @param colunasAtual - Colunas atuais da tabela.
 * @param colunasPermitidas - Colunas permitidas conforme o `.env`.
 */
function filtrarColunasPermitidas(colunasAtual: string[], colunasPermitidas: string[]): string[] {
  return colunasAtual.filter(coluna => colunasPermitidas.includes(coluna));
}

/**
 * Cria tabelas e adiciona colunas conforme permitido.
 * @param req - Request da requisição.
 * @param res - Response da requisição.
 */

interface DadosRequisicao {
  senha: string;
  dados: {
    [key: string]: string;
  };
}

export async function criarTabelas(req: Request, res: Response): Promise<void> {
  try {
    const pool = await connectToDatabase();
    const tabelasPermitidas = getTabelasPermitidas();
    const senhaProtegida = process.env.PERMISSAO_SENHA_PROTEGIDA || ''; // Senha protegida do arquivo .env

    console.log('Requisição para criar tabelas:', req.body);

    const { senha, dados } = req.body as DadosRequisicao;

    // Verificação da senha
    if (senha !== senhaProtegida) {
      console.log('Senha inválida fornecida.');
      res.status(403).json({ message: 'Senha inválida.' });
      return;
    }

    const tabelasAserCriadas = Object.values(dados) as string[];
    const tabelasNaoPermitidas = tabelasAserCriadas.filter(tabela => !tabelasPermitidas.includes(tabela));

    if (tabelasNaoPermitidas.length > 0) {
      console.log('Tabelas não permitidas:', tabelasNaoPermitidas);
      res.status(400).json({ message: `As seguintes tabelas não são permitidas: ${tabelasNaoPermitidas.join(', ')}` });
      return;
    }

    // Criação das tabelas
    for (const tabela of tabelasAserCriadas) {
      if (tabela === 'Chamados') {
        const colunasChamados = getColunasProtegidasChamados();
        const colunasChamadosQuery = colunasChamados.map(coluna => `${coluna} VARCHAR(255)`).join(', ');

        const createTableQuery = `
          IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Chamados')
          BEGIN
            CREATE TABLE Chamados (
              ${colunasChamadosQuery}
            )
          END
        `;
        console.log('Criando tabela Chamados com a query:', createTableQuery);

        await pool.request().query(createTableQuery);
      }

      if (tabela === 'AtualizacaoDeDados') {
        const colunasAtualizacao = getColunasProtegidasAtualizacaoDeDados();
        const colunasAtualizacaoQuery = colunasAtualizacao.map(coluna => `${coluna} VARCHAR(255)`).join(', ');

        const createTableQuery = `
          IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AtualizacaoDeDados')
          BEGIN
            CREATE TABLE AtualizacaoDeDados (
              ${colunasAtualizacaoQuery}
            )
          END
        `;
        console.log('Criando tabela AtualizacaoDeDados com a query:', createTableQuery);

        await pool.request().query(createTableQuery);
      }
    }

    res.status(200).json({ message: 'Tabelas criadas com sucesso.' });
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
    res.status(500).json({ message: 'Erro ao criar tabelas.' });
  }
}

/**
 * Adiciona colunas às tabelas existentes conforme permitido.
 * @param tabelas — Lista de tabelas para as quais adicionar colunas.
 * @param poolConnection — Pool de conexão com o banco de dados.
 * @returns Um objeto contendo arrays de tabelas com sucesso e com erros.
 */
export async function adicionarColunas(
  tabelas: string[],
  poolConnection: sql.ConnectionPool
): Promise<{ success: string[]; errors: string[] }> {
  const success: string[] = [];
  const errors: string[] = [];

  for (const tabela of tabelas) {
    // Obtenha as colunas permitidas para a tabela
    // const colunasPermitidas = obterColunasPermitidasParaTabela(tabela);

    // Crie a query para adicionar as colunas
    const query = `ALTER TABLE ${tabela} ADD ...`; // Substitua ... com a lógica para adicionar colunas

    try {
      await poolConnection.request().query(query);
      success.push(tabela);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      errors.push(`Erro ao adicionar colunas na tabela ${tabela}: ${errorMessage}`);
    }
  }

  return { success, errors };
}

/**
 * Obtém as colunas atuais da tabela.
 * @param tabela - Nome da tabela.
 * @param poolConnection - Pool de conexão com o banco de dados.
 * @returns Lista de colunas atuais.
 */
async function obterColunasAtuais(tabela: string, poolConnection: sql.ConnectionPool): Promise<string[]> {
  const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tabela}'`;
  const result: QueryResult = await poolConnection.request().query(query);
  return result.recordset.map(row => row.COLUMN_NAME);
}
