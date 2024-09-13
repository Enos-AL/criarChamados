import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

export async function adicionarColunas(
  tabelas: string[],
  poolConnection: sql.ConnectionPool
): Promise<{ success: string[]; errors: string[] }> {
  const success: string[] = [];
  const errors: string[] = [];

  for (const tabela of tabelas) {
    // Obtenha as colunas permitidas para a tabela (exemplo com Chamados)
    const colunasPermitidas = tabela === 'Chamados' ? process.env.PROTECTED_COLUMNS_CHAMADOS?.split(',') : [];

    try {
      // Verificar se a tabela existe
      const tabelaExisteQuery = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tabela}'`;
      const tabelaExiste = await poolConnection.request().query(tabelaExisteQuery);

      if (tabelaExiste.recordset.length === 0) {
        // Se a tabela não existir, criá-la
        const queryCriarTabela = `CREATE TABLE ${tabela} (...)`; // Defina a criação das colunas aqui
        await poolConnection.request().query(queryCriarTabela);
        success.push(`Tabela ${tabela} criada com sucesso`);
      } else {
        console.log(`Tabela ${tabela} já existe.`);

        // Verificar se as colunas já existem
        const colunasExistentesQuery = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tabela}'`;
        const colunasExistentes = await poolConnection.request().query(colunasExistentesQuery);
        const colunasPresentes = colunasExistentes.recordset.map((coluna: { COLUMN_NAME: string }) => coluna.COLUMN_NAME);

        const colunasParaAdicionar = colunasPermitidas?.filter(coluna => !colunasPresentes.includes(coluna)) || [];

        if (colunasParaAdicionar.length === 0) {
          console.log(`Todas as colunas já estão presentes na tabela ${tabela}.`);
          success.push(`Colunas da tabela ${tabela} já estão presentes`);
        } else {
          // Adicionar colunas faltantes
          const queryAdicionarColunas = `ALTER TABLE ${tabela} ADD ${colunasParaAdicionar.map(coluna => `${coluna} VARCHAR(255)`).join(', ')}`;
          await poolConnection.request().query(queryAdicionarColunas);
          success.push(`Colunas adicionadas à tabela ${tabela}`);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      errors.push(`Erro ao verificar ou adicionar colunas na tabela ${tabela}: ${errorMessage}`);
    }
  }

  return { success, errors };
}
