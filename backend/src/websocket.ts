import { namespace } from './http';

export function setupWebSocket() {
    namespace.on('connection', (socket) => {
        console.log('Usuário se conectou ao namespace /api', socket.id);

        socket.on('clientMessage', (message) => {
            console.log('Mensagem do cliente:', message);
            namespace.emit('serverMessage', `Mensagem recebida: ${message}`);
        });

        socket.on('disconnect', () => {
            console.log('Usuário desconectado do namespace /api', socket.id);
        });
    });

    return namespace;
}
