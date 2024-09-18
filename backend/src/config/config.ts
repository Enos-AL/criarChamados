import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente do arquivo .env
dotenvConfig({ path: path.resolve(__dirname, '../../../.env') });

class Config {
  private static instance: Config;
  
  private constructor() { }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public getDbConfig() {
    return {
      user: process.env.DB_USER || '',
      password: process.env.DB_PASSWORD || '',
      server: process.env.DB_SERVER || '',
      database: process.env.DB_NAME || '',
      port: parseInt(process.env.DB_PORT || '1433', 10),
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      requestTimeout: 30000,
    };
  }

  public getAppConfig() {
    return {
      requestTimeout: process.env.REQUEST_TIMEOUT || '5000',
    };
  }

  public getProtectedColumnsChamados() {
    return (process.env.COLUNAS_PROTEGIDAS_CHAMADOS || '').split(',').map(coluna => coluna.trim());
  }

  public getProtectedColumnsAtualizacaoDeDados() {
    return (process.env.COLUNAS_PROTEGIDAS_ATUALIZACAODEDADOS || '').split(',').map(coluna => coluna.trim());
  }

  public getPermittedTables() {
    return (process.env.TABELAS_PERMITIDAS || '').split(',').map(tabela => tabela.trim());
  }

  public getColunasAtualizacaoDeDados() {
    return [
      { position: 0, name: process.env.COLUMN_1 || '' },
      { position: 1, name: process.env.COLUMN_2 || '' },
      { position: 2, name: process.env.COLUMN_3 || '' },
      { position: 3, name: process.env.COLUMN_4 || '' },
      { position: 4, name: process.env.COLUMN_5 || '' },
      { position: 5, name: process.env.COLUMN_6 || '' }
    ];
  }

  public getSenhaProtegida() {
    return process.env.PERMISSAO_SENHA_TABELAS_E_COLUNAS || '';
  }

  public getColumnsChamados() {
    return [
      { position: 1, name: process.env.COLUMN_CHAMADO_01 || '' },
      { position: 2, name: process.env.COLUMN_CHAMADO_02 || '' },
      { position: 3, name: process.env.COLUMN_CHAMADO_03 || '' },
      { position: 4, name: process.env.COLUMN_CHAMADO_04 || '' },
      { position: 5, name: process.env.COLUMN_CHAMADO_05 || '' },
      { position: 6, name: process.env.COLUMN_CHAMADO_06 || '' },
      { position: 7, name: process.env.COLUMN_CHAMADO_07 || '' },
      { position: 8, name: process.env.COLUMN_CHAMADO_08 || '' },
      { position: 9, name: process.env.COLUMN_CHAMADO_09 || '' },
      { position: 10, name: process.env.COLUMN_CHAMADO_10 || '' },
      { position: 11, name: process.env.COLUMN_CHAMADO_11 || '' },
      { position: 12, name: process.env.COLUMN_CHAMADO_12 || '' },
      { position: 13, name: process.env.COLUMN_CHAMADO_13 || '' },
      { position: 14, name: process.env.COLUMN_CHAMADO_14 || '' },
      { position: 15, name: process.env.COLUMN_CHAMADO_15 || '' },
      { position: 16, name: process.env.COLUMN_CHAMADO_16 || '' },
    ];
  }

  public getColunasPorTabela(tabela: string) {
    if (tabela === 'Chamados') {
      return this.getColumnsChamados();
    } else if (tabela === 'AtualizacaoDeDados') {
      return this.getColunasAtualizacaoDeDados();
    }
    return [];
  }

  public getTableAtualizacaoDeDados() {
    return process.env.TABELA_ATUALIZACAO_DE_DADOS || 'AtualizacaoDeDados';
  }
}

export default Config;
