import { ColumnsMap } from '../config/types';
import { Request, Response } from 'express';
import config from '../config/bd';
import sql from 'mssql';

// Função principal para criar tabelas
export async function criarTabelas(req: Request, res: Response): Promise<void> {
  const pool = await config.connectToDatabase();
  const tabelasPermitidas = config.getTabelasPermitidas();
  const senhaProtegida = config.senhaProtegida;

  console.log('Requisição para criar tabelas:', req.body);

  const { senha, dados } = req.body;

  if (senha !== senhaProtegida) {
    return handleInvalidPassword(senha, dados, pool, res);
  }

  const tabelasAserCriadas = Object.values(dados) as string[];
  const tabelasNaoPermitidas = tabelasAserCriadas.filter(tabela => !tabelasPermitidas.includes(tabela));

  if (tabelasNaoPermitidas.length > 0) {
    return handleDisallowedTables(tabelasNaoPermitidas, dados, pool, res);
  }

  try {
    const tabelasEColunasCriadas = await criarTabelasEColunas(tabelasAserCriadas, tabelasPermitidas, pool);

    if (tabelasEColunasCriadas.length > 0) {
      res.status(200).json({ message: `As seguintes tabelas e colunas foram criadas: ${tabelasEColunasCriadas.join(', ')}` });
    } else {
      res.status(200).json({ message: 'Todas as tabelas e colunas já estão presentes no banco de dados.' });
    }
  } catch (err) {
    handleError(err, req.body.dados, pool, res);
  }
}

// Função para tratar senha inválida
async function handleInvalidPassword(senha: string, dados: any, pool: sql.ConnectionPool, res: Response): Promise<void> {
  console.log('Senha inválida fornecida.');
  const tabelaDeErroExiste = await verificarSeTabelaExiste(config.bdConfig.TABLE_ATUALIZACAO_DE_DADOS, pool);

  if (tabelaDeErroExiste) {
    try {
      await registrarErro('Senha inválida fornecida', dados, pool);
    } catch (error) {
      console.error('Erro ao registrar erro de senha inválida:', (error as Error).message);
      res.status(500).json({ message: 'Erro ao registrar erro de senha inválida: Uma ou mais colunas não estão configuradas corretamente.' });
      return;
    }
  }
  
  res.status(403).json({
    message: tabelaDeErroExiste
      ? 'Senha inválida. Erro registrado na tabela de atualizações.'
      : 'Senha inválida. A tabela para registrar erros não está disponível.'
  });
}

// Função para tratar tabelas não permitidas
async function handleDisallowedTables(tabelasNaoPermitidas: string[], dados: any, pool: sql.ConnectionPool, res: Response): Promise<void> {
  console.log('Tabelas não permitidas:', tabelasNaoPermitidas);
  const tabelaDeErroExiste = await verificarSeTabelaExiste(config.bdConfig.TABLE_ATUALIZACAO_DE_DADOS, pool);

  if (tabelaDeErroExiste) {
    await registrarErro(`Tabelas não permitidas: ${tabelasNaoPermitidas.join(', ')}`, dados, pool);
  }

  res.status(400).json({
    message: tabelaDeErroExiste
      ? `As seguintes tabelas não são permitidas: ${tabelasNaoPermitidas.join(', ')}. Erro registrado na tabela de atualizações.`
      : `As seguintes tabelas não são permitidas: ${tabelasNaoPermitidas.join(', ')}. A tabela para registrar erros não está disponível.`
  });
}

// Função para criar tabelas e colunas
async function criarTabelasEColunas(tabelasAserCriadas: string[], tabelasPermitidas: string[], pool: sql.ConnectionPool): Promise<string[]> {
  const tabelasEColunasCriadas: string[] = [];

  for (const tabela of tabelasAserCriadas) {
    if (tabelasPermitidas.includes(tabela)) {
      const colunas = tabela === tabelasPermitidas[0]
        ? config.getColunasProtegidasChamados()
        : config.getColunasProtegidasAtualizacaoDeDados();

      const colunasQuery = colunas.map(coluna => `[${coluna}] VARCHAR(255)`).join(', ');

      const tabelaExiste = await verificarSeTabelaExiste(tabela, pool);

      if (!tabelaExiste) {
        const createTableQuery = `CREATE TABLE [${tabela}] (${colunasQuery})`;
        console.log(`Criando tabela ${tabela} com a query:`, createTableQuery);
        await pool.request().query(createTableQuery);
        tabelasEColunasCriadas.push(`${tabela} e suas colunas foram criadas.`);
      } else {
        await adicionarColunasFaltantes(tabela, colunas, pool, tabelasEColunasCriadas);
      }
    }
  }

  return tabelasEColunasCriadas;
}

// Função para adicionar colunas faltantes
async function adicionarColunasFaltantes(tabela: string, colunas: string[], pool: sql.ConnectionPool, tabelasEColunasCriadas: string[]): Promise<void> {
  const colunasAtuais = await obterColunasAtuais(tabela, pool);
  const colunasNaoExistem = colunas.filter(coluna => !colunasAtuais.includes(coluna));

  if (colunasNaoExistem.length > 0) {
    const adicionarColunasQuery = colunasNaoExistem.map(coluna => `ALTER TABLE [${tabela}] ADD [${coluna}] VARCHAR(255)`).join('; ');
    console.log(`Adicionando colunas ${colunasNaoExistem.join(', ')} na tabela ${tabela} com a query:`, adicionarColunasQuery);
    await pool.request().query(adicionarColunasQuery);
    tabelasEColunasCriadas.push(`Colunas ${colunasNaoExistem.join(', ')} adicionadas na tabela ${tabela}.`);
  }
}

// Função para tratar erros
async function handleError(err: unknown, dados: any, pool: sql.ConnectionPool, res: Response): Promise<void> {
  if (err instanceof Error) {
    if (err.message.includes('Invalid column name')) {
      console.error('Erro ao registrar erro: Uma ou mais colunas não estão configuradas corretamente.');
      res.status(500).json({ message: 'Erro ao registrar erro: Uma ou mais colunas não estão configuradas corretamente.' });
    } else {
      console.error('Erro ao criar tabelas:', err.message);
      const tabelaDeErroExiste = await verificarSeTabelaExiste(config.bdConfig.TABLE_ATUALIZACAO_DE_DADOS, pool);

      if (tabelaDeErroExiste) {
        try {
          await registrarErro('Erro ao criar tabelas', dados, pool);
        } catch (error) {
          console.error('Erro ao registrar erro ao criar tabelas:', (error as Error).message);
          res.status(500).json({ message: 'Erro ao registrar erro ao criar tabelas: Uma ou mais colunas não estão configuradas corretamente.' });
          return;
        }
        res.status(500).json({ message: 'Erro ao criar tabelas. Erro registrado na tabela de atualizações.' });
      } else {
        res.status(500).json({ message: 'Erro ao criar tabelas. A tabela para registrar erros não está disponível.' });
      }
    }
  } else {
    console.error('Erro desconhecido:', err);
    res.status(500).json({ message: 'Erro desconhecido ao criar tabelas.' });
  }
}

// Função para verificar se a tabela existe
async function verificarSeTabelaExiste(tabela: string, poolConnection: sql.ConnectionPool): Promise<boolean> {
  try {
    const query = `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tabela`;
    const result = await poolConnection.request()
      .input('tabela', sql.NVarChar, tabela)
      .query(query);
    return result.recordset.length > 0;
  } catch (error) {
    console.error('Erro ao verificar se a tabela existe:', (error as Error).message);
    return false;
  }
}

// Função para obter colunas atuais da tabela
async function obterColunasAtuais(tabela: string, poolConnection: sql.ConnectionPool): Promise<string[]> {
  try {
    const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tabela`;
    const result = await poolConnection.request()
      .input('tabela', sql.NVarChar, tabela)
      .query(query);
    return result.recordset.map((row: { COLUMN_NAME: string }) => row.COLUMN_NAME);
  } catch (error) {
    console.error('Erro ao obter colunas atuais:', (error as Error).message);
    return [];
  }
}

// Função para registrar erro
async function registrarErro(descricao: string, dados: any, pool: sql.ConnectionPool): Promise<void> {
  try {
    const { TABLE_ATUALIZACAO_DE_DADOS, columnsMap } = config.bdConfig;

    const colunasStr = Object.values(columnsMap).join(', ');
    const placeholders = Object.keys(columnsMap).map(id => `@${columnsMap[id].toLowerCase()}`).join(', ');

    const query = `INSERT INTO [${TABLE_ATUALIZACAO_DE_DADOS}] (${colunasStr}) VALUES (${placeholders})`;

    const request = pool.request();
    Object.keys(columnsMap).forEach((id) => {
      const valor = getValorColuna(id, dados, columnsMap, descricao);
      request.input(columnsMap[id].toLowerCase(), sql.NVarChar, valor);
    });

    await request.query(query);
    console.log('Erro registrado com sucesso.');
  } catch (error) {
    if (error instanceof sql.RequestError && error.code === 'EREQUEST') {
      console.error('Erro ao registrar erro: Uma ou mais colunas não estão configuradas corretamente.');
    } else {
      console.error('Erro ao registrar erro:', (error as Error).message);
    }
    throw error; // Re-throw to handle it in the calling function
  }
}

// Função para obter o valor da coluna
function getValorColuna(id: string, dados: any, columnsMap: ColumnsMap, descricao: string): any {
  const nomeColuna = columnsMap[id];
  if (!nomeColuna) {
    const errorMessage = `Nome da coluna não encontrado para ID: ${id}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (nomeColuna === columnsMap.COLUMN_1) {
    return new Date().toLocaleDateString();
  } else if (nomeColuna === columnsMap.COLUMN_2) {
    return new Date().toLocaleTimeString();
  } else if (nomeColuna === columnsMap.COLUMN_3) {
    return JSON.stringify(dados);
  } else if (nomeColuna === columnsMap.COLUMN_4) {
    return descricao;
  }

  if (dados.hasOwnProperty(nomeColuna)) {
    return dados[nomeColuna];
  }

  const errorMessage = `Coluna não encontrada nos dados: ${nomeColuna}`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}
