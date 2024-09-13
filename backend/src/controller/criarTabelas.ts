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
 * Cria tabelas e verifica se já estão criadas conforme as permissões do arquivo .env.
 */
export async function criarTabelas(req: Request, res: Response): Promise<void> {
  try {
    const pool = await connectToDatabase();
    const tabelasPermitidas = getTabelasPermitidas(); // Tabelas permitidas conforme o .env
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

    // Loop para verificar as tabelas permitidas
    for (const tabela of tabelasPermitidas) {
      const colunasPermitidas = tabela === 'Chamados' ? getColunasProtegidasChamados() : getColunasProtegidasAtualizacaoDeDados();

      const tabelaExiste = await verificarSeTabelaExiste(tabela, pool);
      const colunasEstaoPresentes = tabelaExiste && await verificarColunas(tabela, colunasPermitidas, pool);

      if (tabelaExiste && colunasEstaoPresentes) {
        console.log(`A tabela ${tabela} e suas colunas já estão presentes no banco de dados.`);
        res.status(200).json({ message: `As Tabelas (${tabela}) foram verificadas e estão criadas no banco de dados. As colunas da tabela ${tabela} foram verificadas e constam no Banco de Dados.` });
        continue;
      }

      const colunasQuery = colunasPermitidas.map(coluna => `${coluna} VARCHAR(255)`).join(', ');

      const createTableQuery = `
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tabela}')
        BEGIN
          CREATE TABLE ${tabela} (
            ${colunasQuery}
          )
        END
      `;
      console.log(`Criando tabela ${tabela} com a query:`, createTableQuery);

      await pool.request().query(createTableQuery);
    }

    res.status(200).json({ message: 'Tabelas criadas com sucesso.' });
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
    res.status(500).json({ message: 'Erro ao criar tabelas.' });
  }
}
