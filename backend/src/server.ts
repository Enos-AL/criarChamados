import express from 'express';
import http from 'http';
import { setupWebSocket } from './websocket';  // Importação correta

const app = express();
const server = http.createServer(app);

setupWebSocket(server);  // Passa o servidor como argumento

server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
