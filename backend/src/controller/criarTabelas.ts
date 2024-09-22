/* src/controller/criarTabelas.ts */

import conectarBanco from '../config/bd'; // Importa a função para conectar ao banco de dados
import { Request, Response, NextFunction } from 'express'; // Importa tipos do Express
import {
    obterTabelasPermitidas,
    verificarPermissao,
    obterColunasChamadoMap,
    obterColunasAtualizacaoMap
} from '../config/config'; // Importa funções de configuração
import { io } from '../http'; // Importa o objeto io para manipulação de WebSocket

// Função para criar tabelas com base nas permissões e configurações
export async function criarTabelas(req: Request, res: Response, next: NextFunction) {
    const { senha, dados } = req.body; // Extrai a senha e os dados do corpo da requisição

    // Verifica a permissão com base na senha fornecida
    if (!verificarPermissao(senha)) {
        io.of('/api').emit('tabelaCriacaoErro', { mensagem: 'Permissão negada: senha incorreta.' });
        return res.status(403).send('Permissão negada: senha incorreta.');
    }

    const tabelasPermitidas = obterTabelasPermitidas(); // Obtém as tabelas permitidas
    const tabelasRecebidas = Object.values(dados) as string[]; // Extrai os nomes das tabelas recebidas
    const tabelasNaoPermitidas: string[] = []; // Array para armazenar tabelas não permitidas

    // Verifica se as tabelas recebidas estão entre as tabelas permitidas
    for (const nomeTabela of tabelasRecebidas) {
        console.log('Verificando tabela:', nomeTabela);
        if (!tabelasPermitidas.includes(nomeTabela)) {
            tabelasNaoPermitidas.push(nomeTabela); // Adiciona tabelas não permitidas ao array
        }
    }

    console.log('Tabelas não permitidas:', tabelasNaoPermitidas);
    
    // Se houver tabelas não permitidas, emite erro e retorna resposta
    if (tabelasNaoPermitidas.length > 0) {
        io.of('/api').emit('tabelaCriacaoErro', { mensagem: `Permissão negada: tabelas ${tabelasNaoPermitidas.join(', ')} não permitidas.` });
        return res.status(403).send(`Permissão negada: tabelas ${tabelasNaoPermitidas.join(', ')} não permitidas.`);
    }

    const pool = await conectarBanco(); // Conecta ao banco de dados

    // Para cada tabela recebida, verifica e adiciona colunas permitidas
    for (const nomeTabela of tabelasRecebidas) {
        let colunasPermitidas = obterColunasChamadoMap(); // Obtém colunas permitidas para a tabela "Chamados"
        if (nomeTabela !== tabelasPermitidas[0]) {
            colunasPermitidas = obterColunasAtualizacaoMap(); // Para outras tabelas, obtém colunas de atualização
        }

        // Prepara o array de colunas permitidas no formato SQL
        const colunasPermitidasArray = Object.values(colunasPermitidas).map(coluna => `${coluna} VARCHAR(255)`);
        const colunasExistentes = await obterColunasExistentes(pool, nomeTabela); // Obtém colunas existentes na tabela
        // Filtra colunas que não existem na tabela
        const colunasFaltantes = colunasPermitidasArray.filter(coluna => {
            const nomeColuna = coluna.split(' ')[0]; // Extrai o nome da coluna
            return !colunasExistentes.includes(nomeColuna); // Verifica se a coluna já existe
        });

        // Se houver colunas faltantes, tenta adicioná-las
        if (colunasFaltantes.length > 0) {
            const alterTableQuery = `ALTER TABLE ${nomeTabela} ADD ${colunasFaltantes.join(', ')}`;
            try {
                await pool.request().query(alterTableQuery); // Executa a query para adicionar colunas
                io.of('/api').emit('tabelaCriada', { tabela: nomeTabela, colunasFaltantes });
                return res.status(200).send(`Colunas configuradas no arquivo .env faltantes foram inseridas com sucesso na tabela ${nomeTabela}.`);
            } catch (err: unknown) {
                // Em caso de erro, emite mensagem de erro e retorna resposta
                if (err instanceof Error) {
                    io.of('/api').emit('tabelaCriacaoErro', { mensagem: `Erro ao adicionar colunas na tabela ${nomeTabela}: ${err.message}` });
                    return res.status(500).send(`Erro ao adicionar colunas na tabela ${nomeTabela}: ${err.message}`);
                }
            }
        }
    }

    // Verifica se há tabelas que já foram criadas
    const tabelasJaCriadas = await Promise.all(tabelasRecebidas.map(async (tabela) => {
        const colunasExistentes = await obterColunasExistentes(pool, tabela);
        return colunasExistentes.length > 0; // Retorna verdadeiro se a tabela já existe
    }));

    // Se alguma tabela já existir, emite erro e retorna resposta
    if (tabelasJaCriadas.some(Boolean)) {
        io.of('/api').emit('tabelaCriacaoErro', { mensagem: `Colunas já estão criadas no banco de dados e não podem ser substituídas nas tabelas: ${tabelasJaCriadas.join(', ')}.` });
        return res.status(400).send(`Colunas já estão criadas no banco de dados e não podem ser substituídas nas tabelas: ${tabelasJaCriadas.join(', ')}.`);
    }

    // Se tudo estiver correto, retorna sucesso
    res.status(200).send('Tabelas criadas ou atualizadas com sucesso');
}

// Função para obter as colunas existentes na tabela
async function obterColunasExistentes(pool: any, nomeTabela: string): Promise<string[]> {
    const result = await pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${nomeTabela}'`);
    return result.recordset.map((row: any) => row.COLUMN_NAME); // Retorna um array com os nomes das colunas existentes
}


