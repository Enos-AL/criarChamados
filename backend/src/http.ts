// http.ts
import express from 'express';
import { Server } from 'socket.io';
import usuarioRoutes from './routes/usuarioRoutes';
import http from 'http';
import cors from 'cors';

const app = express();
app.use(express.json());

app.use('/usuarios', usuarioRoutes);

app.use(cors({ origin: 'http://localhost:3001', methods: ['GET', 'POST'], credentials: true}));

const serverHttp = http.createServer(app);

const io = new Server(serverHttp);

export { serverHttp, io};
