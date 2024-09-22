
/* src/server.ts */
import { app, serverHttp } from './http';
import { setupWebSocket } from './websocket'; // Importa corretamente o WebSocket setup
import usuarioRoutes from './routes/usuarioRoutes';
import conectarBanco from './config/bd';
import { config } from 'dotenv';

config(); // Carrega as variáveis de ambiente

const PORT = process.env.PORT || 5001;

async function startServer() {
    try {
        // Verificar a conexão com o banco de dados
        await conectarBanco();
        console.log('Conexão com o banco de dados estabelecida com sucesso.');

        // Configura as rotas do usuário
        app.use('/api', usuarioRoutes);

        // Configura o WebSocket
        setupWebSocket();

        // Inicia o servidor
        serverHttp.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    } catch (error) {
        console.error('Erro ao iniciar o servidor:', error);
        process.exit(1); // Encerra o processo em caso de erro
    }
}

startServer();

