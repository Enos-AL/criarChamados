/* src/server.ts */
import { app, serverHttp } from './http';
import { setupWebSocket } from './websocket'; // Importe corretamente o WebSocket setup
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

        app.use('/api', usuarioRoutes);

        setupWebSocket(); // Chama a função para configurar o WebSocket

        serverHttp.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    } catch (error) {
        console.error('Erro ao iniciar o servidor:', error);
        process.exit(1);
    }
}

startServer();
