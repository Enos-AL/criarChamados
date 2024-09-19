// src/config/bd.ts
import sql from 'mssql';
import Config from './config';

const configInstance = Config.getInstance();
const dbConfig = configInstance.getDbConfig();

const config = {
  bdConfig: dbConfig,
  appConfig: configInstance.getAppConfig(),
  protectedColumnsChamados: configInstance.getProtectedColumnsChamados(),
  protectedColumnsAtualizacaoDeDados: configInstance.getProtectedColumnsAtualizacaoDeDados(),
  permittedTables: configInstance.getPermittedTables(),
  colunasAtualizacaoDeDados: configInstance.getColunasAtualizacaoDeDados(),
  senhaProtegida: configInstance.getSenhaProtegida(),
  columnsChamados: configInstance.getColumnsChamados(),
  tableAtualizacaoDeDados: configInstance.getTableAtualizacaoDeDados(),

  async connectToDatabase(): Promise<sql.ConnectionPool> {
    try {
      const pool = await sql.connect(this.bdConfig);
      console.log('Conectado ao banco de dados com sucesso.');
      return pool;
    } catch (error) {
      console.error('Erro ao conectar ao banco de dados:', error);
      throw new Error('Não foi possível conectar ao banco de dados');
    }
  },

  async registrarAtualizacao(tabelas: string[], senha: string): Promise<void> {
    try {
      const tabelasPermitidas = this.getTabelasPermitidas();
      const tabelasNaoPermitidas = tabelas.filter(tabela => !tabelasPermitidas.includes(tabela));

      let mensagemTabela = '';

      if (senha !== this.senhaProtegida) {
        mensagemTabela = 'Senha Incorreta';
      } else if (tabelasNaoPermitidas.length === 0) {
        mensagemTabela = 'Todas as tabelas conferem';
      } else {
        mensagemTabela = JSON.stringify({ tabelasNaoPermitidas });
      }

      const pool = await this.connectToDatabase(); // Corrigido: Usar await aqui
      const query = `
        INSERT INTO ${this.tableAtualizacaoDeDados} (Tabela, Mensagem)
        VALUES (@Tabela, @Mensagem)
      `;
      await pool.request() // Corrigido: Certifique-se de que pool é uma instância de ConnectionPool
        .input('Tabela', sql.NVarChar, mensagemTabela)
        .input('Mensagem', sql.NVarChar, 'Atualização realizada.')
        .query(query);

      console.log('Atualização registrada com sucesso.');

    } catch (error) {
      console.error('Erro ao registrar atualização:', error);
      throw error;
    }
  },

  async obterColunasAtuais(tabela: string): Promise<string[]> {
    try {
      const pool = await this.connectToDatabase(); // Corrigido: Usar await aqui
      const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tabela`;
      const result = await pool.request() // Corrigido: Certifique-se de que pool é uma instância de ConnectionPool
        .input('tabela', sql.NVarChar, tabela)
        .query(query);
      return result.recordset.map((row: any) => row.COLUMN_NAME);
    } catch (error) {
      console.error('Erro ao obter colunas atuais:', (error as Error).message);
      throw error;
    }
  },

  async verificarColunasProtegidas(tabela: string): Promise<boolean> {
    try {
      const colunasAtuais = await this.obterColunasAtuais(tabela);
      const colunasProtegidas = this.getColunasProtegidasPorTabela(tabela);

      return colunasProtegidas.every(coluna => colunasAtuais.includes(coluna));
    } catch (error) {
      console.error('Erro ao verificar colunas protegidas:', error);
      throw error;
    }
  },

  getColunasProtegidasPorTabela(tabela: string): string[] {
    if (tabela === 'Chamados') {
      return this.getColunasProtegidasChamados();
    } else if (tabela === 'AtualizacaoDeDados') {
      return this.getColunasProtegidasAtualizacaoDeDados();
    }
    return [];
  },

  getColunasProtegidasChamados(): string[] {
    return this.protectedColumnsChamados;
  },

  getColunasProtegidasAtualizacaoDeDados(): string[] {
    return this.protectedColumnsAtualizacaoDeDados;
  },

  getTabelasPermitidas(): string[] {
    return this.permittedTables;
  },

  getTableAtualizacaoDeDados(): string {
    return this.tableAtualizacaoDeDados;
  }
};

export default config;
