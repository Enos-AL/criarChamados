import { serverHttp } from './http';
import { Socket, Server } from 'socket.io';
import config from './config/bd';
import sql from 'mssql';

const io = new Server(serverHttp, {
    cors: {
      origin: 'http://localhost:3001',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  
const namespace = io.of('/api');
console.log({namespace});


namespace.on('connection', (socket: Socket) => {
    console.log('Usuário conectado ao namespace /api:', socket.id);

    // Exemplo de salas
    socket.on('joinRoom', (room: string) => {
        socket.join(room);
        console.log(`Usuário ${socket.id} entrou na sala ${room}`);
    });

    socket.on('leaveRoom', (room: string) => {
        socket.leave(room);
        console.log(`Usuário ${socket.id} saiu da sala ${room}`);
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado do namespace /api', socket.id);
    });

    // Exemplo de evento para criar tabelas
    socket.on('createTables', async (dados: any) => {
        let pool: sql.ConnectionPool | undefined;

        try {
            pool = await config.connectToDatabase();
            const tabelasPermitidas = config.getTabelasPermitidas();
            const senhaProtegida = config.senhaProtegida;

            const { senha, tabelas } = dados;

            if (senha !== senhaProtegida) {
                const tabelaDeErroExiste = await verificarSeTabelaExiste(config.bdConfig.TABLE_ATUALIZACAO_DE_DADOS, pool);

                if (tabelaDeErroExiste) {
                    await registrarErro('Senha inválida fornecida', dados, pool);
                }

                socket.emit('createTablesResponse', {
                    message: tabelaDeErroExiste
                        ? 'Senha inválida. Erro registrado na tabela de atualizações.'
                        : 'Senha inválida. A tabela para registrar erros não está disponível.'
                });

                return;
            }

            const tabelasNaoPermitidas = tabelas.filter((tabela: string) => !tabelasPermitidas.includes(tabela));

            if (tabelasNaoPermitidas.length > 0) {
                const tabelaDeErroExiste = await verificarSeTabelaExiste(config.bdConfig.TABLE_ATUALIZACAO_DE_DADOS, pool);

                if (tabelaDeErroExiste) {
                    await registrarErro(`Tabelas não permitidas: ${tabelasNaoPermitidas.join(', ')}`, dados, pool);
                }

                socket.emit('createTablesResponse', {
                    message: tabelaDeErroExiste
                        ? `As seguintes tabelas não são permitidas: ${tabelasNaoPermitidas.join(', ')}. Erro registrado na tabela de atualizações.`
                        : `As seguintes tabelas não são permitidas: ${tabelasNaoPermitidas.join(', ')}. A tabela para registrar erros não está disponível.`
                });

                return;
            }

            let tabelasEColunasCriadas: string[] = [];

            for (const tabela of tabelas) {
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
                        await pool.request().query(createTableQuery);
                        tabelasEColunasCriadas.push(`${tabela} e suas colunas foram criadas.`);
                        tabelaCriada = true;
                    } else {
                        const colunasAtuais = await obterColunasAtuais(tabela, pool);
                        const colunasNaoExistem = colunas.filter(coluna => !colunasAtuais.includes(coluna));

                        if (colunasNaoExistem.length > 0) {
                            const adicionarColunasQuery = colunasNaoExistem.map(coluna => `ALTER TABLE [${tabela}] ADD [${coluna}] VARCHAR(255)`).join('; ');
                            await pool.request().query(adicionarColunasQuery);
                            tabelasEColunasCriadas.push(`Colunas ${colunasNaoExistem.join(', ')} adicionadas na tabela ${tabela}.`);
                        }
                    }
                }
            }

            if (tabelasEColunasCriadas.length > 0) {
                socket.emit('createTablesResponse', { message: `As seguintes tabelas e colunas foram criadas: ${tabelasEColunasCriadas.join(', ')}` });
            } else {
                socket.emit('createTablesResponse', { message: 'Todas as tabelas e colunas já estão presentes no banco de dados.' });
            }

        } catch (err) {
            console.error('Erro ao criar tabelas:', err);

            if (pool) {
                const tabelaDeErroExiste = await verificarSeTabelaExiste(config.bdConfig.TABLE_ATUALIZACAO_DE_DADOS, pool);

                if (tabelaDeErroExiste) {
                    await registrarErro('Erro ao criar tabelas', dados, pool);
                }

                socket.emit('createTablesResponse', {
                    message: tabelaDeErroExiste
                        ? 'Erro ao criar tabelas. Erro registrado na tabela de atualizações.'
                        : 'Erro ao criar tabelas. A tabela para registrar erros não está disponível.'
                });
            } else {
                socket.emit('createTablesResponse', {
                    message: 'Erro ao criar tabelas. Não foi possível conectar ao banco de dados.'
                });
            }
        }
    });
});

async function verificarSeTabelaExiste(tabela: string, pool: sql.ConnectionPool): Promise<boolean> {
    const query = `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tabela`;
    const result = await pool.request()
        .input('tabela', sql.NVarChar, tabela)
        .query(query);
    return result.recordset.length > 0;
}

async function obterColunasAtuais(tabela: string, pool: sql.ConnectionPool): Promise<string[]> {
    const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tabela`;
    const result = await pool.request()
        .input('tabela', sql.NVarChar, tabela)
        .query(query);
    return result.recordset.map((row: { COLUMN_NAME: string }) => row.COLUMN_NAME);
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
