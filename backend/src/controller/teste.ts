import { ColumnsMap } from '../config/types';
import { Request, Response } from 'express';
import config from '../config/bd';
import sql from 'mssql';


export async function criarTabelas(req: Request, res: Response): Promise<void> {
  const pool = await config.connectToDatabase();
  const tabelasPermitidas = config.getTabelasPermitidas();
  const senhaProtegida = config.senhaProtegida;

  console.log('Requisição para criar tabelas:', req.body);

  const { senha, dados } = req.body;

  try {
    // Verificar colunas configuradas corretamente antes de qualquer outra lógica
    const colunasMap = config.bdConfig.columnsMap;
    const colunasNaoConfiguradas = Object.keys(colunasMap).filter(id => !colunasMap[id]);

    if (colunasNaoConfiguradas.length > 0) {
      // Interromper imediatamente se há colunas não configuradas
      console.error('Erro ao registrar erro: Uma ou mais colunas não estão configuradas corretamente.');
      res.status(500).json({
        message: 'Erro ao registrar erro: Uma ou mais colunas não estão configuradas corretamente.'
      });
      return; // Garanta que o fluxo pare aqui
    }

    // Verificação de senha
    if (senha !== senhaProtegida) {
      console.log('Senha inválida fornecida.');
      const tabelaDeErroExiste = await verificarSeTabelaExiste(config.bdConfig.TABLE_ATUALIZACAO_DE_DADOS, pool);

      if (tabelaDeErroExiste) {
        try {
          await registrarErro('Senha inválida fornecida', dados, pool);
        } catch (error) {
          console.error('Erro ao registrar erro de senha inválida:', error);
          res.status(500).json({
            message: 'Erro ao registrar erro: Uma ou mais colunas não estão configuradas corretamente.'
          });
          return;
        }
      }
      res.status(403).json({
        message: tabelaDeErroExiste
          ? 'Senha inválida. xxx Erro registrado na tabela de atualizações.'
          : 'Senha inválida. A tabela para registrar erros não está disponível.'
      });
      return;
    }

    // Verificação de tabelas não permitidas
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

    // Criação de tabelas e colunas
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

    // Se o erro for relacionado a coluna não configurada, trate primeiro
    if (err instanceof Error && err.message.includes('Invalid column name')) {
      res.status(500).json({
        message: 'Erro ao registrar erro: Uma ou mais colunas não estão configuradas corretamente.'
      });
    } else {
      // Se o erro não for relacionado à coluna, continue com a lógica padrão
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
    console.error('Erro ao verificar se a tabela existe:', error);
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
    console.error('Erro ao obter colunas atuais:', error);
    return [];
  }
}

// Função para registrar erro
async function registrarErro(descricao: string, dados: any, pool: sql.ConnectionPool): Promise<void> {
  try {
    const { TABLE_ATUALIZACAO_DE_DADOS, columnsMap } = config.bdConfig;

    // Construa a string de colunas e placeholders
    const colunasStr = Object.values(columnsMap).join(', ');
    const placeholders = Object.keys(columnsMap).map(id => `@${columnsMap[id].toLowerCase()}`).join(', ');

    // Crie a consulta SQL
    const query = `
      INSERT INTO [${TABLE_ATUALIZACAO_DE_DADOS}]
      (${colunasStr})
      VALUES (${placeholders})
    `;

    // Crie uma nova solicitação
    const request = pool.request();

    // Itere sobre os IDs e adicione os inputs dinamicamente
    Object.keys(columnsMap).forEach((id) => {
      const valor = getValorColuna(id, dados, columnsMap, descricao);
      request.input(columnsMap[id].toLowerCase(), sql.NVarChar, valor);
    });

    // Execute a consulta
    await request.query(query);

    console.log('Erro registrado com sucesso.');
  } catch (error) {
    // Identifica o erro específico relacionado à coluna
    if (error instanceof sql.RequestError && error.code === 'EREQUEST') {
      console.error('Erro ao registrar erro: Uma ou mais colunas não estão configuradas corretamente.');
    } else {
      console.error('Erro ao registrar erro:', (error as Error).message);
    }
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

  // Verifica se o nome da coluna é o da Data
  if (nomeColuna === columnsMap.COLUMN_1) { 
    return new Date().toLocaleDateString(); 

    // Verifica se o nome da coluna é a Hora
  } else if (nomeColuna === columnsMap.COLUMN_2) {
    return new Date().toLocaleTimeString(); 

    // Verifica se o nome da coluna é a Tabela
  } else if (nomeColuna === columnsMap.COLUMN_3) {
    return JSON.stringify(dados); 

    // Verifica se o nome da coluna é a ação
  } else if (nomeColuna === columnsMap.COLUMN_4) {
    return descricao; // Valor para a coluna de ação
  }

  // Se o nome da coluna não for encontrado nos casos acima, verifica nos dados
  if (dados.hasOwnProperty(nomeColuna)) {
    return dados[nomeColuna];
  }

  const errorMessage = `Coluna não encontrada nos dados: ${nomeColuna}`;
  console.error(errorMessage);
  throw new Error(errorMessage); // Lança um erro se a coluna não estiver presente nos dados
}