import { app, serverHttp } from './http';
import "./websocket";
import usuarioRoutes from './routes/usuarioRoutes';
import config from './config/bd';

const PORT = process.env.PORT || 5001;

async function startServer() {
    try {
        // Verificar a conexão com o banco de dados
        await config.connectToDatabase();
        console.log('Conexão com o banco de dados estabelecida com sucesso.');

        app.use('/usuarios', usuarioRoutes);

        serverHttp.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    } catch (error) {
        console.error('Erro ao iniciar o servidor:', error);
        process.exit(1);
    }
}

startServer();
