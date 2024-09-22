import conectarBanco from '../config/bd';
import { Request, Response } from 'express';
import { obterTabelasPermitidas, verificarPermissao, obterColunasChamadoMap, obterColunasAtualizacaoMap } from '../config/config';
import { io } from '../websocket';  // Certifique-se de importar do arquivo correto

export async function criarTabelas(req: Request, res: Response) {
    const { senha, dados } = req.body;
    
    if (!verificarPermissao(senha)) {
        io.emit('tabelaCriacaoErro', { mensagem: 'Permissão negada: senha incorreta.' });
        return res.status(403).json({ mensagem: 'Permissão negada: senha incorreta.' });
    }

    const tabelasPermitidas = obterTabelasPermitidas();
    const tabelasRecebidas: string[] = Object.values(dados);
    const tabelasNaoPermitidas: string[] = [];

    for (const nomeTabela of tabelasRecebidas) {
        if (!tabelasPermitidas.includes(nomeTabela)) {
            tabelasNaoPermitidas.push(nomeTabela);
        }
    }

    if (tabelasNaoPermitidas.length > 0) {
        io.emit('tabelaCriacaoErro', { mensagem: `Permissão negada: tabelas ${tabelasNaoPermitidas.join(', ')} não permitidas.` });
        return res.status(403).json({ mensagem: `Permissão negada: tabelas ${tabelasNaoPermitidas.join(', ')} não permitidas.` });
    }

    const pool = await conectarBanco();

    for (const nomeTabela of tabelasRecebidas) {
        let colunasPermitidas = nomeTabela === tabelasPermitidas[0] ? obterColunasChamadoMap() : obterColunasAtualizacaoMap();
        
        const colunasPermitidasArray = Object.values(colunasPermitidas).map(coluna => `${coluna} VARCHAR(255)`);
        const colunasExistentes = await obterColunasExistentes(pool, nomeTabela);
        
        const colunasFaltantes = colunasPermitidasArray.filter(coluna => {
            const nomeColuna = coluna.split(' ')[0];
            return !colunasExistentes.includes(nomeColuna);
        });

        if (colunasFaltantes.length > 0) {
            const alterTableQuery = `ALTER TABLE ${nomeTabela} ADD ${colunasFaltantes.join(', ')}`;
            try {
                await pool.request().query(alterTableQuery);
                io.emit('tabelaCriada', { tabela: nomeTabela, colunasFaltantes });
            } catch (err) {
                if (err instanceof Error) {
                    io.emit('tabelaCriacaoErro', { mensagem: `Erro ao adicionar colunas na tabela ${nomeTabela}: ${err.message}` });
                    return res.status(500).json({ mensagem: `Erro ao adicionar colunas na tabela ${nomeTabela}: ${err.message}` });
                }
                io.emit('tabelaCriacaoErro', { mensagem: `Erro desconhecido ao adicionar colunas na tabela ${nomeTabela}.` });
                return res.status(500).json({ mensagem: 'Erro desconhecido ao tentar adicionar colunas.' });
            }
        } else {
            io.emit('tabelaCriacaoErro', { mensagem: `Colunas já existentes na tabela ${nomeTabela}.` });
            return res.status(400).json({ mensagem: `Colunas já existentes na tabela ${nomeTabela}.` });
        }
    }

    return res.status(200).json({ mensagem: 'Tabelas criadas ou atualizadas com sucesso' });
}

async function obterColunasExistentes(pool: any, nomeTabela: string): Promise<string[]> {
    const result = await pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${nomeTabela}'`);
    return result.recordset.map((row: any) => row.COLUMN_NAME);
}
