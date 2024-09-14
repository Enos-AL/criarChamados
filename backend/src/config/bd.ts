import sql from 'mssql';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const bdConfig = {
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  TABLE_ATUALIZACAO_DE_DADOS: process.env.TABLE_ATUALIZACAO_DE_DADOS || 'AtualizacaoDeDados',
  COLUMN_DIA: process.env.COLUMN_DIA || 'dia',
  COLUMN_HORA: process.env.COLUMN_HORA || 'hora',
  COLUMN_TABELA: process.env.COLUMN_TABELA || 'tabela',
  COLUMN_ACAO: process.env.COLUMN_ACAO || 'acao',
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
  requestTimeout: 30000,
};

const appConfig = {
  requestTimeout: process.env.REQUEST_TIMEOUT || '5000',
};

const config = {
  bdConfig,
  appConfig,
  protectedColumnsChamados: (process.env.PROTECTED_COLUMNS_CHAMADOS || '').split(',').map(coluna => coluna.trim()),
  protectedColumnsAtualizacaoDeDados: (process.env.PROTECTED_COLUMNS_ATUALIZACAODEDADOS || '').split(',').map(coluna => coluna.trim()),
  permittedTables: (process.env.PERMITTED_TABLES || '').split(',').map(tabela => tabela.trim()),
  colunasAtualizacaoDeDados: (process.env.COLUNAS_ATUALIZACAO_DE_DADOS || '').split(',').map(coluna => coluna.trim()),
  senhaProtegida: process.env.PERMISSAO_SENHA_PROTEGIDA || '',

  async connectToDatabase(): Promise<sql.ConnectionPool> {
    try {
      const pool = await sql.connect(bdConfig);
      console.log('Conectado ao banco de dados com sucesso.');
      return pool;
    } catch (error) {
      console.error('Erro ao conectar ao banco de dados:', error);
      throw new Error('Não foi possível conectar ao banco de dados');
    }
  },

  getColunasProtegidasChamados(): string[] {
    return config.protectedColumnsChamados;
  },

  getColunasProtegidasAtualizacaoDeDados(): string[] {
    return config.protectedColumnsAtualizacaoDeDados;
  },

  getTabelasPermitidas(): string[] {
    return config.permittedTables;
  }
};

export default config;
