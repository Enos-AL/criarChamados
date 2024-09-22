/* src/config/bd.ts */
import sql from 'mssql';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../../../.env') });

export default async function conectarBanco() {
    const config = {
        user: process.env.DB_USER || '',
        password: process.env.DB_PASSWORD || '',
        server: process.env.DB_SERVER || '',
        database: process.env.DB_NAME || '',
        port: parseInt(process.env.DB_PORT || '1433'),
        options: {
            encrypt: true, // Criptografa a conexão
            trustServerCertificate: true // Confia no certificado autoassinado
        }
    };

    // Validação das configurações do banco
    if (!config.user || !config.password || !config.server || !config.database) {
        throw new Error('Configuração de banco de dados inválida. Verifique as variáveis de ambiente.');
    }

    try {
        const pool = await sql.connect(config);
        console.log('Conexão com o banco de dados estabelecida com sucesso.');
        return pool; // Retorna o pool para uso posterior
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Erro ao conectar ao banco de dados:', error.message);
            throw new Error('Falha na conexão com o banco de dados.'); // Mensagem genérica
        } else {
            console.error('Erro desconhecido ao conectar ao banco de dados:', String(error));
            throw new Error('Erro desconhecido ao tentar conectar ao banco de dados.');
        }
    }
}

/* vou enviar o proximo arquivo */
