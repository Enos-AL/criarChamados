import { Request, Response } from 'express';
import config from '../config/bd';
import sql from 'mssql';

export async function criarTabelas(req: Request, res: Response): Promise<void> {
  const pool = await config.connectToDatabase();
  const tabelasPermitidas = config.permittedTables;
  const senhaProtegida = config.senhaProtegida;

  console.log('Requisição para criar tabelas:', req.body);

  const { senha, dados } = req.body;

  try {
    if (senha !== senhaProtegida) {
      console.log('Senha inválida fornecida.');
      const tabelaDeErroExiste = await verificarSeTabelaExiste(config.bdConfig.TABLE_ATUALIZACAO_DE_DADOS, pool);

      if (tabelaDeErroExiste) {
        await registrarErro('Senha inválida fornecida', dados, pool);
      }

      res.status(403).json({
        message: tabelaDeErroExiste
          ? 'Senha inválida. Erro registrado na tabela de atualizações.'
          : 'Senha inválida. A tabela para registrar erros não está disponível.'
      });

      return;
    }

    const tabelasAserCriadas = Object.values(dados) as string[];
    const tabelasNaoPermitidas = tabelasAserCriadas.filter(tabela => !tabelasPermitidas.includes(tabela));

    if (tabelasNaoPermitidas.length > 0) {
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

      return;
    }

    let tabelasEColunasCriadas: string[] = [];

    for (const tabela of tabelasAserCriadas) {
      let tabelaCriada = false;

      if (tabelasPermitidas.includes(tabela)) {
        const colunas = tabela === tabelasPermitidas[0]
          ? config.getColunasProtegidasChamados()
          : config.getColunasProtegidasAtualizacaoDeDados();

        const colunasQuery = colunas.map(coluna => `[${coluna}] VARCHAR(255)`).join(', ');

        const tabelaExiste = await verificarSeTabelaExiste(tabela, pool);

        if (!tabelaExiste) {
          const createTableQuery = `
            CREATE TABLE [${tabela}] (
              ${colunasQuery}
            )
          `;
          console.log(`Criando tabela ${tabela} com a query:`, createTableQuery);

          await pool.request().query(createTableQuery);
          tabelasEColunasCriadas.push(`${tabela} e suas colunas foram criadas.`);
          tabelaCriada = true;
        } else {
          const colunasAtuais = await obterColunasAtuais(tabela, pool);
          const colunasNaoExistem = colunas.filter(coluna => !colunasAtuais.includes(coluna));

          if (colunasNaoExistem.length > 0) {
            const adicionarColunasQuery = colunasNaoExistem.map(coluna => `ALTER TABLE [${tabela}] ADD [${coluna}] VARCHAR(255)`).join('; ');
            console.log(`Adicionando colunas ${colunasNaoExistem.join(', ')} na tabela ${tabela} com a query:`, adicionarColunasQuery);

            await pool.request().query(adicionarColunasQuery);
            tabelasEColunasCriadas.push(`Colunas ${colunasNaoExistem.join(', ')} adicionadas na tabela ${tabela}.`);
          }
        }
      }
    }

    if (tabelasEColunasCriadas.length > 0) {
      res.status(200).json({ message: `As seguintes tabelas e colunas foram criadas: ${tabelasEColunasCriadas.join(', ')}` });
    } else {
      res.status(200).json({ message: 'Todas as tabelas e colunas já estão presentes no banco de dados.' });
    }

  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
    const tabelaDeErroExiste = await verificarSeTabelaExiste(config.bdConfig.TABLE_ATUALIZACAO_DE_DADOS, pool);

    if (tabelaDeErroExiste) {
      await registrarErro('Erro ao criar tabelas', req.body.dados, pool);
    }

    res.status(500).json({
      message: tabelaDeErroExiste
        ? 'Erro ao criar tabelas. Erro registrado na tabela de atualizações.'
        : 'Erro ao criar tabelas. A tabela para registrar erros não está disponível.'
    });
  }
}

async function verificarSeTabelaExiste(tabela: string, poolConnection: sql.ConnectionPool): Promise<boolean> {
  try {
    const query = `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tabela`;
    const result = await poolConnection.request()
      .input('tabela', sql.NVarChar, tabela)
      .query(query);
    return result.recordset.length > 0;
  } catch (error) {
    console.error(`Erro ao verificar existência da tabela ${tabela}:`, error);
    throw new Error(`Erro ao verificar existência da tabela ${tabela}`);
  }
}

async function obterColunasAtuais(tabela: string, poolConnection: sql.ConnectionPool): Promise<string[]> {
  try {
    const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tabela`;
    const result = await poolConnection.request()
      .input('tabela', sql.NVarChar, tabela)
      .query(query);
    return result.recordset.map(row => row.COLUMN_NAME);
  } catch (error) {
    console.error(`Erro ao obter colunas da tabela ${tabela}:`, error);
    throw new Error(`Erro ao obter colunas da tabela ${tabela}`);
  }
}

async function registrarErro(descricao: string, dados: any, pool: sql.ConnectionPool): Promise<void> {
  try {
    const { TABLE_ATUALIZACAO_DE_DADOS, COLUMN_DIA, COLUMN_HORA, COLUMN_TABELA, COLUMN_ACAO } = config.bdConfig;

    const colunas = [COLUMN_DIA, COLUMN_HORA, COLUMN_TABELA, COLUMN_ACAO];
    const colunasStr = colunas.join(', ');
    const placeholders = colunas.map(coluna => `@${coluna.toLowerCase()}`).join(', ');

    const query = `
      INSERT INTO [${TABLE_ATUALIZACAO_DE_DADOS}]
      (${colunasStr})
      VALUES (${placeholders})
    `;

    const request = pool.request();
    
    request.input(COLUMN_DIA.toLowerCase(), sql.NVarChar, new Date().toLocaleDateString());
    request.input(COLUMN_HORA.toLowerCase(), sql.NVarChar, new Date().toLocaleTimeString());
    request.input(COLUMN_TABELA.toLowerCase(), sql.NVarChar, JSON.stringify(dados));
    request.input(COLUMN_ACAO.toLowerCase(), sql.NVarChar, descricao);

    await request.query(query);

    console.log('Erro registrado com sucesso.');
  } catch (error) {
    console.error('Erro ao registrar erro:', error);
  }
}
