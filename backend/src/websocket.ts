/* src/websocket.ts */
import { io } from './http';

// Configurações do WebSocket
export function setupWebSocket() {
    const socket = io.of('/api');  // socket específico para a rota /api
    socket.on('connection', (socket) => {
        console.log('Usuário conectado ao socket /api:', socket.id);

        // Exemplo de salas
        socket.on('joinRoom', (room) => {
            socket.join(room);
            console.log(`Usuário ${socket.id} entrou na sala ${room}`);
        });

        socket.on('leaveRoom', (room) => {
            socket.leave(room);
            console.log(`Usuário ${socket.id} saiu da sala ${room}`);
        });

        socket.on('clientMessage', (message) => {
            console.log('Mensagem do cliente:', message);
            socket.emit('serverMessage', `Mensagem recebida: ${message}`);
        });

        socket.on('disconnect', () => {
            console.log('Usuário desconectado do socket /api', socket.id);
        });
    });

    return socket;
}

