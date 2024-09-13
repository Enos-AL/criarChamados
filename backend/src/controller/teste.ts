import { Request, Response } from 'express';
import { connectToDatabase, getColunasProtegidasChamados, getColunasProtegidasAtualizacaoDeDados, getTabelasPermitidas } from '../config/bd';
import sql from 'mssql';

type QueryResult = { recordset: { COLUMN_NAME: string }[] };

// Interface para a estrutura de requisição
interface DadosRequisicao {
  senha: string;
  dados: {
    [key: string]: string;
  };
}

/**
 * Função auxiliar para verificar se a tabela já existe no banco de dados.
 */
async function verificarSeTabelaExiste(tabela: string, pool: sql.ConnectionPool): Promise<boolean> {
  const query = `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tabela}'`;
  const result = await pool.request().query(query);
  return result.recordset.length > 0;
}

/**
 * Função auxiliar para verificar se todas as colunas já estão presentes na tabela.
 */
async function verificarColunas(tabela: string, colunas: string[], pool: sql.ConnectionPool): Promise<boolean> {
  const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tabela}'`;
  const result: QueryResult = await pool.request().query(query);
  const colunasAtuais = result.recordset.map(row => row.COLUMN_NAME);
  return colunas.every(coluna => colunasAtuais.includes(coluna));
}

/**
 * Cria tabelas e verifica se já estão criadas.
 */
export async function criarTabelas(req: Request, res: Response): Promise<void> {
  try {
    const pool = await connectToDatabase();
    const tabelasPermitidas = getTabelasPermitidas();
    const senhaProtegida = process.env.PERMISSAO_SENHA_PROTEGIDA || '';

    console.log('Requisição para criar tabelas:', req.body);

    const { senha, dados } = req.body as DadosRequisicao;

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

    for (const tabela of tabelasAserCriadas) {
      if (tabela === 'Chamados') {
        const colunasChamados = getColunasProtegidasChamados();
        const tabelaExiste = await verificarSeTabelaExiste('Chamados', pool);
        const colunasEstaoPresentes = tabelaExiste && await verificarColunas('Chamados', colunasChamados, pool);

        if (tabelaExiste && colunasEstaoPresentes) {
          console.log('A tabela Chamados e suas colunas já estão presentes no banco de dados.');
          res.status(200).json({ message: 'As Tabelas (Chamados e colunas) foram verificadas e estão criadas no banco de dados.' });
          continue;
        }

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
        const tabelaExiste = await verificarSeTabelaExiste('AtualizacaoDeDados', pool);
        const colunasEstaoPresentes = tabelaExiste && await verificarColunas('AtualizacaoDeDados', colunasAtualizacao, pool);

        if (tabelaExiste && colunasEstaoPresentes) {
          console.log('A tabela AtualizacaoDeDados e suas colunas já estão presentes no banco de dados.');
          res.status(200).json({ message: 'As Tabelas (AtualizacaoDeDados e colunas) foram verificadas e estão criadas no banco de dados.' });
          continue;
        }

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
