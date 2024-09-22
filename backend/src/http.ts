/* src/http.ts */
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";  // Importar o módulo 'path'

const app = express();

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3001',  // Ajuste para seu frontend, se necessário
    methods: ['GET', 'POST'],
    credentials: true,
}));

// Configurar para servir arquivos estáticos
app.use(express.static(path.join(__dirname))); // __dirname aponta para o diretório atual

const serverHttp = http.createServer(app);
const io = new Server(serverHttp, {
    cors: {
        origin: 'http://localhost:3001', // Ajuste conforme necessário
        methods: ['GET', 'POST'],
        credentials: true,
    }
});

export { app, serverHttp, io };

