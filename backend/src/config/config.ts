// src/config/config.ts
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente do arquivo .env
dotenvConfig({ path: path.resolve(__dirname, '../../../.env') });

export function getEnvVar(key: string, defaultValue: string = ''): string {
    const value = process.env[key];
    return value ? value : defaultValue;
}

export function verificarPermissao(senha: string): boolean {
    const senhaCorreta = getEnvVar('PERMISSAO_SENHA_TABELAS_E_COLUNAS');
    return senha === senhaCorreta;
}

export function obterTabelasPermitidas(): string[] {
    const tabelasPermitidas: string[] = [];
    let i = 1;

    while (true) {
        const tabela = getEnvVar(`TABELA_${i}`, '');
        if (!tabela) break;
        tabelasPermitidas.push(tabela);
        i++;
    }
    return tabelasPermitidas;
}

// Função para obter o mapeamento das colunas permitidas para a tabela Chamados
export function obterColunasChamadoMap(): Record<string, string> {
    const colunasMap: Record<string, string> = {};
    let i = 1;

    // Verifica as colunas no formato COLUMN_CHAMADO_0{n} e COLUMN_CHAMADO_{n}
    while (true) {
        const coluna = getEnvVar(`COLUMN_CHAMADO_${i < 10 ? '0' : ''}${i}`, '');
        if (!coluna) break;
        colunasMap[`COLUMN_CHAMADO_${i < 10 ? '0' : ''}${i}`] = coluna;
        i++;
    }

    // Verifica se COLUMN_CHAMADO_{n} também existe a partir de 10
    i = 10;
    while (true) {
        const coluna = getEnvVar(`COLUMN_CHAMADO_${i}`, '');
        if (!coluna) break;
        colunasMap[`COLUMN_CHAMADO_${i}`] = coluna;
        i++;
    }
    return colunasMap;
}

// Função para obter o mapeamento das colunas permitidas para a tabela AtualizacaoDeDados
export function obterColunasAtualizacaoMap(): Record<string, string> {
    const colunasMap: Record<string, string> = {};
    let i = 1;

    // Verifica as colunas no formato COLUMN_{n} e COLUMN_0{n}
    while (true) {
        const coluna = getEnvVar(`COLUMN_${i}`, '');
        if (!coluna) break;
        colunasMap[`COLUMN_${i}`] = coluna;
        i++;
    }

    // Verifica se COLUMN_0{n} também existe
    i = 1;
    while (true) {
        const coluna = getEnvVar(`COLUMN_0${i}`, '');
        if (!coluna) break;
        colunasMap[`COLUMN_0${i}`] = coluna;
        i++;
    }
    return colunasMap;
}

// Função para obter as colunas permitidas para Chamados
export function obterColunasPermitidasChamados(): string[] {
    return getEnvVar('COLUNAS_PERMITIDAS_CHAMADO').split(',').map(col => col.trim());
}

// Função para obter as colunas permitidas para AtualizacaoDeDados
export function obterColunasPermitidasAtualizacao(): string[] {
    return getEnvVar('COLUNAS_PERMITIDAS_ATUALIZACAODEDADOS').split(',').map(col => col.trim());
}

// proximo arquivo