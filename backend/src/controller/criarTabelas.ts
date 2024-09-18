import { Request, Response } from 'express';
import sql from 'mssql';
import Config from '../config/config';

const config = Config.getInstance();

// Função para conectar ao banco de dados
async function connectToDatabase(): Promise<sql.ConnectionPool> {
  const dbConfig = config.getDbConfig();
  return await sql.connect(dbConfig);
}

// Função principal para criar tabelas// Função principal para criar tabelas
export async function criarTabelas(req: Request, res: Response): Promise<void> {
  const pool = await connectToDatabase();
  const tabelasPermitidas = config.getPermittedTables();
  const senhaProtegida = config.getSenhaProtegida();
  const { senha, dados } = req.body;

  if (senha !== senhaProtegida) {
    // Verifica se a tabela de erros existe antes de registrar qualquer erro
    const tabelaDeErroExiste = await verificarSeTabelaExiste(config.getTableAtualizacaoDeDados(), pool);

    if (!tabelaDeErroExiste) {
      res.status(500).json({
        message: 'Tabelas para inserirem as informações de erros não estão disponíveis ou não existem.',
      });
      console.error('Tabelas para inserirem as informações de erros não estão disponíveis ou não existem.');
      return;
    }

    // Garantir que 'tabelasNaoPermitidas' seja uma string[]
    const tabelasNaoPermitidas = Object.values(dados).filter((tabela: any) => typeof tabela === 'string' && !tabelasPermitidas.includes(tabela)) as string[];

    if (tabelasNaoPermitidas.length > 0) {
      await handleInvalidPassword(senha, tabelasNaoPermitidas, pool, res);
      return;
    }

    // Se a senha estiver incorreta e todas as tabelas são permitidas
    const tabelas = Object.values(dados) as string[];
    const tabelasFormatadas = tabelas.reduce((acc: any, tabela, index) => {
      acc[`tabela_${index + 1}`] = tabela;
      return acc;
    }, {});

    // Responde com as tabelas fornecidas e a mensagem de erro apropriada
    res.status(403).json({
      message: 'Senha Incorreta e Tabelas Compatíveis.',
      tabelas: tabelasFormatadas,
    });

    // Registrar o erro com apenas "Senha Incorreta"
    await registrarErroGenerico('Senha Incorreta', tabelas, pool);
    return;
  }

  const tabelasAserCriadas = Object.values(dados) as string[];
  const tabelasNaoPermitidas = tabelasAserCriadas.filter((tabela) => !tabelasPermitidas.includes(tabela));

  if (tabelasNaoPermitidas.length > 0) {
    await handleDisallowedTables(tabelasNaoPermitidas, dados, pool, res);
    return;
  }

  try {
    const tabelasEColunasCriadas = await criarTabelasEColunas(tabelasAserCriadas, tabelasPermitidas, pool);

    if (tabelasEColunasCriadas.length > 0) {
      res.status(200).json({
        message: `As seguintes tabelas e colunas foram criadas: ${tabelasEColunasCriadas.join(', ')}`,
      });
    } else {
      res.status(200).json({ message: 'Todas as tabelas e colunas já estão presentes no banco de dados.' });
    }
  } catch (err) {
    await handleError(err, req.body.dados, pool, res);
  }
}

// Função para tratar senha inválida
async function handleInvalidPassword(senha: string, tabelasNaoPermitidas: string[], pool: sql.ConnectionPool, res: Response): Promise<void> {
  // Verifica se a tabela de erros existe antes de tentar registrar o erro
  const tabelaDeErroExiste = await verificarSeTabelaExiste(config.getTableAtualizacaoDeDados(), pool);

  if (!tabelaDeErroExiste) {
    res.status(500).json({
      message: 'Tabelas para inserirem as informações de erros não estão disponíveis ou não existem.',
    });
    console.error('Tabelas para inserirem as informações de erros não estão disponíveis ou não existem.');
    return;
  }

  const mensagemErro = tabelasNaoPermitidas.length > 0 
    ? 'Senha Incorreta e Tabelas Incorretas' 
    : 'Senha Incorreta';

  try {
    await registrarErroGenerico(mensagemErro, tabelasNaoPermitidas.length > 0 ? tabelasNaoPermitidas : null, pool);
  } catch (error) {
    res.status(500).json({
      message: 'Erro ao registrar senha inválida: Não é possível inserir informações de falhas na tabela \'AtualizacaoDeDados\' porque uma ou mais colunas estão incorretas.'
    });
    return;
  }

  res.status(403).json({
    message: tabelaDeErroExiste
      ? 'Senha inválida. Erro registrado na tabela de atualizações.'
      : 'Senha inválida. A tabela para registrar erros não está disponível.'
  });
}

// Função para tratar tabelas não permitidas
async function handleDisallowedTables(
  tabelasNaoPermitidas: string[], 
  dados: any, 
  pool: sql.ConnectionPool, 
  res: Response
): Promise<void> {

  const tabelaDeErroExiste = await verificarSeTabelaExiste(config.getTableAtualizacaoDeDados(), pool);

  if (tabelaDeErroExiste) {
    try {
      await registrarErroGenerico('Tabelas Não Permitidas', tabelasNaoPermitidas, pool);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao registrar tabelas não permitidas: Não é possível inserir informações de falhas na tabela \'AtualizacaoDeDados\' porque uma ou mais colunas estão incorretas.' });
      return;
    }
  }

  res.status(400).json({
    message: `As seguintes tabelas não são permitidas: ${tabelasNaoPermitidas.join(', ')}. Erro registrado na tabela de atualizações.`
  });
}

// Função para criar tabelas e colunas
async function criarTabelasEColunas(tabelasAserCriadas: string[], tabelasPermitidas: string[], pool: sql.ConnectionPool): Promise<string[]> {
  const tabelasEColunasCriadas: string[] = [];

  for (const tabela of tabelasAserCriadas) {
    if (tabelasPermitidas.includes(tabela)) {
      const colunas = tabela === tabelasPermitidas[0]
        ? config.getColumnsChamados()
        : config.getColunasAtualizacaoDeDados();

      const colunasQuery = colunas.map(coluna => `[${coluna.name}] VARCHAR(255)`).join(', ');

      const tabelaExiste = await verificarSeTabelaExiste(tabela, pool);

      if (!tabelaExiste) {
        const createTableQuery = `CREATE TABLE [${tabela}] (${colunasQuery})`;
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
async function adicionarColunasFaltantes(tabela: string, colunas: { position: number, name: string }[], pool: sql.ConnectionPool, tabelasEColunasCriadas: string[]): Promise<void> {
  const colunasAtuais = await obterColunasAtuais(tabela, pool);
  const colunasNaoExistem = colunas.filter(coluna => !colunasAtuais.includes(coluna.name));

  if (colunasNaoExistem.length > 0) {
    const adicionarColunasQuery = colunasNaoExistem.map(coluna => `ALTER TABLE [${tabela}] ADD [${coluna.name}] VARCHAR(255)`).join('; ');
    await pool.request().query(adicionarColunasQuery);
    tabelasEColunasCriadas.push(`Colunas ${colunasNaoExistem.map(coluna => coluna.name).join(', ')} adicionadas na tabela ${tabela}.`);
  }
}

// Função para obter colunas atuais de uma tabela
async function obterColunasAtuais(tabela: string, poolConnection: sql.ConnectionPool): Promise<string[]> {
  try {
    const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tabela`;
    const result = await poolConnection.request()
      .input('tabela', sql.NVarChar, tabela)
      .query(query);
    return result.recordset.map((row: any) => row.COLUMN_NAME); // Retorna uma lista com os nomes das colunas
  } catch (err) {
    throw err;  // Lança o erro para ser tratado externamente
  }
}

// Função para verificar se a tabela existe
async function verificarSeTabelaExiste(nomeTabela: string, poolConnection: sql.ConnectionPool): Promise<boolean> {
  const query = `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @nomeTabela`;

  try {
    const result = await poolConnection.request()
      .input('nomeTabela', sql.NVarChar, nomeTabela)
      .query(query);
    
    return result.recordset.length > 0;
  } catch (error) {
    console.error(`Erro ao verificar a existência da tabela ${nomeTabela}:`, error);
    return false;
  }
}

// Função para tratar erros
async function handleError(err: unknown, dados: any, pool: sql.ConnectionPool, res: Response): Promise<void> {
  if (err instanceof Error) {
    if (err.message.includes('Coluna com nome inválido')) {
      res.status(500).json({ message: 'Erro ao registrar erro: Uma ou mais colunas não estão configuradas corretamente.' });
    } else {
      const tabelaDeErroExiste = await verificarSeTabelaExiste(config.getTableAtualizacaoDeDados(), pool);

      if (tabelaDeErroExiste) {
        try {
          await registrarErroGenerico('Erro ao criar tabelas', dados, pool);
        } catch (error) {
          if (error instanceof Error) {
            console.error('Erro ao registrar erro ao criar tabelas:', error.message);
          }
          res.status(500).json({ message: 'Erro ao registrar erro ao criar tabelas: Uma ou mais colunas não estão configuradas corretamente.' });
          return;  // Apenas saia da função, sem retornar o objeto Response
        }
        res.status(500).json({ message: 'Erro ao criar tabelas. Erro registrado na tabela de atualizações.' });
      } else {
        res.status(500).json({ message: 'Erro ao criar tabelas. A tabela para registrar erros não está disponível.' });
      }
    }
  } else {
    const errorMessage = String(err);  // Converte unknown para string
    res.status(500).json({ message: `Erro desconhecido ao criar tabelas: ${errorMessage}` });
  }
}

async function registrarErroGenerico(
  erro: string,
  tabelaErrada: string[] | null,
  poolConnection: sql.ConnectionPool
): Promise<void> {
  const config = Config.getInstance();
  const tabelaAtualizacao = config.getTableAtualizacaoDeDados();
  const colunas = config.getColunasAtualizacaoDeDados();

  if (!colunas || colunas.length === 0) {
    throw new Error('Erro: As colunas para a tabela de atualização de dados não estão configuradas.');
  }

  const tabelaErradaFormatted = tabelaErrada && tabelaErrada.length > 0 
    ? JSON.stringify({ tabelas: tabelaErrada }) 
    : null;

  const valoresMapeados: { [key: string]: string | null } = {
    [colunas[2].name]: new Date().toLocaleDateString(),
    [colunas[3].name]: new Date().toLocaleTimeString(),
    [colunas[4].name]: tabelaErradaFormatted,
    [colunas[5].name]: erro
  };

  const valores = colunas.map(coluna => valoresMapeados[coluna.name] || null);

  const query = `INSERT INTO ${tabelaAtualizacao} (${colunas.map(col => `[${col.name}]`).join(', ')})
    VALUES (${colunas.map((_, i) => `@valor${i + 1}`).join(', ')})`;

  const request = poolConnection.request();

  colunas.forEach((coluna, index) => {
    request.input(`valor${index + 1}`, sql.NVarChar, valores[index]);
  });
}


