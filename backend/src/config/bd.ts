import sql from 'mssql';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

/**
 * Configurações do banco de dados e conexão.
 */
const bdConfig = {
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  port: parseInt(process.env.DB_PORT || '1433', 10),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 30000, // 30 segundos
};

console.log('Configuração do banco de dados:', bdConfig);

/**
 * Captura as colunas protegidas para a tabela Chamados a partir da variável de ambiente.
 */
export function getColunasProtegidasChamados(): string[] {
  const colunas = (process.env.PROTECTED_COLUMNS_CHAMADOS || '').split(',').map(coluna => coluna.trim());
  console.log('Colunas protegidas chamados:', colunas);
  return colunas;
}

/**
 * Captura as colunas protegidas para a tabela AtualizacaoDeDados a partir da variável de ambiente.
 */
export function getColunasProtegidasAtualizacaoDeDados(): string[] {
  const colunas = (process.env.PROTECTED_COLUMNS_ATUALIZACAODEDADOS || '').split(',').map(coluna => coluna.trim());
  console.log('Colunas protegidas atualizacao de dados:', colunas);
  return colunas;
}

/**
 * Captura as tabelas permitidas para criação a partir da variável de ambiente.
 */
export function getTabelasPermitidas(): string[] {
  const tabelas = (process.env.PERMITTED_TABLES || '').split(',').map(tabela => tabela.trim());
  console.log('Tabelas permitidas:', tabelas);
  return tabelas;
}

let pool: sql.ConnectionPool;  // Tipagem do pool

/**
 * Função para conectar ao banco de dados.
 * @returns {Promise<sql.ConnectionPool>} Pool de conexão ao banco.
 */
export async function connectToDatabase(): Promise<sql.ConnectionPool> {
  try {
    pool = await sql.connect(bdConfig);
    console.log('Conectado ao banco de dados.');
    return pool;
  } catch (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    throw err;
  }
}

export { sql, pool };
