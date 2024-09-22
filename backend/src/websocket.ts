import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';

let io: SocketIOServer;

export function setupWebSocket(server: Server) {
    io = new SocketIOServer(server, {
        cors: {
            origin: "*",  // Permitir todas as origens
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('Usuário conectado ao socket:', socket.id);

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
}

export { io };
