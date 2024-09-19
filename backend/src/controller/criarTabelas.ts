import { Request, Response } from 'express';
import sql from 'mssql';
import Config from '../config/config';

const config = Config.getInstance();

// Função para conectar ao banco de dados
async function connectToDatabase(): Promise<sql.ConnectionPool> {
  const dbConfig = config.getDbConfig();
  return await sql.connect(dbConfig);
}

// Função para verificar se a tabela existe
async function verificarSeTabelaExiste(tabela: string, poolConnection: sql.ConnectionPool): Promise<boolean> {
  try {
    const query = `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tabela`;
    const result = await poolConnection.request()
      .input('tabela', sql.NVarChar, tabela)  // Substitui o parâmetro 'tabela' na query
      .query(query);
    return result.recordset.length > 0; // Se o número de resultados for maior que 0, a tabela existe
  } catch (err) {
    console.error('Erro ao verificar se a tabela existe:', (err as Error).message);
    throw err;  // Lança o erro novamente para ser tratado pela função chamadora
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
    console.error('Erro ao obter colunas atuais:', (err as Error).message);
    throw err;  // Lança o erro para ser tratado externamente
  }
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
        console.log(`Criando tabela ${tabela} com a query:`, createTableQuery);
        await pool.request().query(createTableQuery);
        tabelasEColunasCriadas.push(`${tabela} e suas colunas foram criadas.`);
      } else {
        await verificarIncompatibilidadesColunas(tabela, colunas, pool, tabelasEColunasCriadas);
      }
    }
  }

  return tabelasEColunasCriadas;
}

// Nova função para verificar incompatibilidades entre colunas
async function verificarIncompatibilidadesColunas(tabela: string, colunasConfig: { position: number, name: string }[], pool: sql.ConnectionPool, tabelasEColunasCriadas: string[]): Promise<void> {
  const colunasAtuais = await obterColunasAtuais(tabela, pool);

  const incompatibilidades: string[] = [];

  // Verifica cada coluna configurada
  for (const colunaConfig of colunasConfig) {
    const colunaAtual = colunasAtuais[colunaConfig.position - 1]; // Verifica a posição exata da coluna
    if (!colunaAtual || colunaAtual !== colunaConfig.name) {
      incompatibilidades.push(`COLUMN_${colunaConfig.position}=${colunaConfig.name}`);
    }
  }

  if (incompatibilidades.length > 0) {
    const colunasAtuaisMsg = colunasAtuais
      .map((coluna, index) => `COLUMN_${index + 1}=${coluna}`)
      .join(', ');

    const erroMessage = `Colunas já existente na tabela: ${colunasAtuaisMsg}`;  // const erroMessage = `Erro ao criar colunas ${incompatibilidades.join(', ')}, porque na tabela possui ${colunasAtuaisMsg}.`;

    // Lançar o erro incluindo o nome da coluna que causou o problema
    throw {
      message: erroMessage,
      detalhes: `Nomes de colunas inválidas '${incompatibilidades.map(col => col.split('=')[1]).join(', ')}'`
    };
  }
}

// Função para tratar senha inválida
async function handleInvalidPassword(
  senha: string,
  tabelasNaoPermitidas: string[],
  pool: sql.ConnectionPool,
  res: Response
): Promise<void> {
  // Verifica se a tabela de erros existe
  const tabelaDeErroExiste = await verificarSeTabelaExiste(config.getTableAtualizacaoDeDados(), pool);

  if (!tabelaDeErroExiste) {
    // Se a tabela de erros não existir, retorna uma mensagem de erro
    res.status(500).json({
      message: 'Tabelas para inserirem as informações de erros não estão disponíveis ou não existem.',
    });
    console.error('Tabelas para inserirem as informações de erros não estão disponíveis ou não existem.');
    return;
  }

  // Monta a mensagem de erro
  const mensagemErro = tabelasNaoPermitidas.length > 0 
    ? 'Senha Incorreta e Tabelas Incorretas' 
    : 'Senha Incorreta';

  try {
    // Tenta registrar o erro
    await registrarErroGenerico(mensagemErro, tabelasNaoPermitidas.length > 0 ? tabelasNaoPermitidas : null, pool);
    // Retorna a resposta para a requisição
    res.status(403).json({
      message: 'Senha inválida. Erro registrado na tabela de atualizações.',
    });
  } catch (error) {
    // Se ocorrer um erro ao registrar o erro, retorna uma mensagem de erro
    console.error('Erro ao registrar erro:', error);
    res.status(500).json({
      message: 'Erro ao registrar senha inválida: Não é possível inserir informações de falhas na tabela \'AtualizacaoDeDados\'.',
    });
  }
}

// Função para tratar tabelas não permitidas
async function handleDisallowedTables(
  tabelasNaoPermitidas: string[], 
  dados: any, 
  pool: sql.ConnectionPool, 
  res: Response
): Promise<void> {
  console.log('Tabelas não permitidas:', tabelasNaoPermitidas);

  const tabelaDeErroExiste = await verificarSeTabelaExiste(config.getTableAtualizacaoDeDados(), pool);

  if (tabelaDeErroExiste) {
    try {
      await registrarErroGenerico('Tabelas Não Permitidas', tabelasNaoPermitidas, pool);
    } catch (error) {
      console.error('Erro ao registrar erro de tabelas não permitidas:', (error as Error).message);
      res.status(500).json({ message: 'Erro ao registrar tabelas não permitidas: Não é possível inserir informações de falhas na tabela \'AtualizacaoDeDados\' porque uma ou mais colunas estão incorretas.' });
      return;
    }
  }

  res.status(400).json({
    message: `As seguintes tabelas não são permitidas: ${tabelasNaoPermitidas.join(', ')}. Erro registrado na tabela de atualizações.`
  });
}

// Função para tratar erros
async function handleError(err: unknown, dados: any, pool: sql.ConnectionPool, res: Response): Promise<void> {
  if (typeof err === 'object' && err !== null && 'message' in err && 'detalhes' in err) {
    const errorObj = err as { message: string, detalhes: string };

    console.error(`Erro: ${errorObj.message}`);
    console.error(`Erro: ${errorObj.detalhes}`);

    // Consolidando as mensagens para a resposta HTTP
    res.status(500).json({
      error: errorObj.message,
      detalhes: errorObj.detalhes
    });

    try {
      await registrarErroGenerico(errorObj.message, dados, pool);
    } catch (registroErro) {
      const registroErroMsg = `Erro ao inserir dados na tabela de atualizações: ${(registroErro as Error).message}`;
      // Aqui, só logamos o erro, pois já enviamos uma resposta HTTP.
    }
  } else {

  }
}

// Função para registrar erros genéricos
async function registrarErroGenerico(
  erro: string,
  tabelaErrada: string | string[] | null,
  poolConnection: sql.ConnectionPool,
  detalhes?: string // Adicionando o campo "detalhes" opcionalmente
): Promise<void> {
  const config = Config.getInstance();
  const tabelaAtualizacao = config.getTableAtualizacaoDeDados();
  const colunas = config.getColunasAtualizacaoDeDados();

  if (!colunas || colunas.length === 0) {
    throw new Error('Erro: As colunas para a tabela de atualização de dados não estão configuradas.');
  }

  let tabelaErradaFormatted: string | null = null;

  if (tabelaErrada) {
    tabelaErradaFormatted = Array.isArray(tabelaErrada)
      ? JSON.stringify({ tabelas: tabelaErrada })
      : JSON.stringify({ tabela: tabelaErrada });
  }

  const valoresMapeados: { [key: string]: string | null } = {
    [colunas[2].name]: new Date().toLocaleDateString(),
    [colunas[3].name]: new Date().toLocaleTimeString(),
    [colunas[4].name]: tabelaErradaFormatted,
    [colunas[5].name]: erro,
    [colunas[6]?.name || 'detalhes']: detalhes || null // Adicionando detalhes do erro
  };

  const valores = colunas.map(coluna => valoresMapeados[coluna.name] || null);

  const query = `INSERT INTO ${tabelaAtualizacao} (${colunas.map(col => `[${col.name}]`).join(', ')} )
    VALUES (${colunas.map((_, i) => `@valor${i + 1}`).join(', ')})`;

  const request = poolConnection.request();

  colunas.forEach((coluna, index) => {
    request.input(`valor${index + 1}`, sql.NVarChar, valores[index]);
  });

  try {
    await request.query(query);
    console.log('Erro registrado com sucesso.');
  } catch (error) {
    console.error('Erro ao inserir dados na tabela de atualizações:');
    throw new Error(`Erro ao inserir dados na tabela de atualizações: ${(error as Error).message}`);
  }
}

// Função principal para criar tabelas
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