import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST'],
    credentials: true,
}));

const serverHttp = http.createServer(app);
const io = new Server(serverHttp, {
    cors: {
        origin: 'http://localhost:3001',
        methods: ['GET', 'POST'],
        credentials: true,
    }
});

// Configuração de namespaces e salas
const namespace = io.of('/api');
namespace.on('connection', (socket) => {
    console.log('Usuário conectado ao namespace /api:', socket.id);

    // Exemplo de salas
    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`Usuário ${socket.id} entrou na sala ${room}`);
    });

    socket.on('leaveRoom', (room) => {
        socket.leave(room);
        console.log(`Usuário ${socket.id} saiu da sala ${room}`);
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado do namespace /api', socket.id);
    });
});

export { app, serverHttp, namespace };
