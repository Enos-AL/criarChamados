// src/http.ts
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';

// Inicializa a aplicação Express
const app = express();

// Middleware para permitir o uso de JSON no Express
app.use(express.json());

// Configuração do CORS
app.use(cors({
    origin: 'http://localhost:3001', // Verifique se a URL do frontend está correta
    methods: ['GET', 'POST'],
    credentials: true,
}));

// Serve arquivos estáticos da pasta 'dist'
app.use(express.static(path.join(__dirname, '../dist')));

// Criação do servidor HTTP com a aplicação Express
const serverHttp = http.createServer(app);

// Configuração do WebSocket
const io = new Server(serverHttp, {
    cors: {
        origin: 'http://localhost:3001', // A URL do frontend deve ser exata
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Listener para eventos WebSocket
io.on('connection', (socket) => {
    console.log('Nova conexão WebSocket: ', socket.id);

    socket.on('joinRoom', (room: string) => {
        socket.join(room);
        console.log(`Usuário ${socket.id} entrou na sala ${room}`);
    });

    socket.on('leaveRoom', (room: string) => {
        socket.leave(room);
        console.log(`Usuário ${socket.id} saiu da sala ${room}`);
    });

    socket.on('clientMessage', (message: string) => {
        console.log('Mensagem do cliente:', message);
        socket.emit('serverMessage', `Mensagem recebida: ${message}`);
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado do socket', socket.id);
    });
});

// Exporta o app, serverHttp e io para uso em outros arquivos
export { app, serverHttp, io };


//  Proximo arquivo.