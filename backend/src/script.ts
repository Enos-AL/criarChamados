import io from 'socket.io-client';  // Correção da importação

const socket = io('http://localhost:3000');  // Conexão WebSocket

interface TabelaCriadaData {
    tabela: string;
    colunasFaltantes?: string[];
}

interface TabelaCriacaoErroData {
    mensagem: string;
}

socket.on('connect', () => {
    console.log('Conectado ao servidor WebSocket:', socket.id);
});

socket.on('tabelaCriada', (data: TabelaCriadaData) => {
    console.log('Tabela criada:', data);
});

socket.on('tabelaCriacaoErro', (data: TabelaCriacaoErroData) => {
    console.error('Erro na criação da tabela:', data);
});

export function verificarColunas(senha: string, tabelas: string[]) {
    socket.emit('verificarColunas', { senha, tabelas });
}
