/* src/config/config.ts */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente do arquivo .env
dotenvConfig({ path: path.resolve(__dirname, '../../../.env') });

// Função para obter uma variável de ambiente com fallback
function getEnvVar(key: string, defaultValue: string = ''): string {
    const value = process.env[key]; // Obtém o valor da variável de ambiente
    return value ? value : defaultValue; // Retorna o valor ou um padrão se não existir
}

// Função para verificar permissões com base na senha fornecida
export function verificarPermissao(senha: string): boolean {
    const senhaCorreta = getEnvVar('PERMISSAO_SENHA_TABELAS_E_COLUNAS'); // Obtém a senha correta
    return senha === senhaCorreta; // Compara as senhas
}

// Função para obter as tabelas permitidas a partir das variáveis de ambiente
export function obterTabelasPermitidas(): string[] {
    const tabelasPermitidas: string[] = []; // Inicializa um array para armazenar as tabelas
    let i = 1; // Contador para percorrer as tabelas

    // Obtém tabelas até que não haja mais variáveis definidas
    while (true) {
        const tabela = getEnvVar(`TABELA_${i}`, ''); // Tenta obter o nome da tabela
        if (!tabela) break; // Sai do loop se não houver tabela
        tabelasPermitidas.push(tabela); // Adiciona a tabela ao array
        i++; // Incrementa o contador
    }
    console.log('Tabelas permitidas:', tabelasPermitidas); // Log para depuração
    return tabelasPermitidas; // Retorna a lista de tabelas permitidas
}

// Função para obter o mapeamento das colunas permitidas para a tabela Chamados
export function obterColunasChamadoMap(): Record<string, string> {
    const colunasMap: Record<string, string> = {}; // Inicializa um objeto para mapear colunas
    let i = 1;

    // Verifica as colunas no formato COLUMN_CHAMADO_0{n} e COLUMN_CHAMADO_{n}
    while (true) {
        const coluna = getEnvVar(`COLUMN_CHAMADO_${i < 10 ? '0' : ''}${i}`, ''); // Formato com zero à esquerda
        if (!coluna) break; // Sai do loop se não houver coluna
        colunasMap[`COLUMN_CHAMADO_${i < 10 ? '0' : ''}${i}`] = coluna; // Mapeia a coluna
        i++; // Incrementa o contador
    }

    // Verifica se COLUMN_CHAMADO_{n} também existe
    i = 10; // Começa a verificar colunas a partir de 10
    while (true) {
        const coluna = getEnvVar(`COLUMN_CHAMADO_${i}`, ''); // Verifica formato sem zero à esquerda
        if (!coluna) break; // Sai do loop se não houver coluna
        colunasMap[`COLUMN_CHAMADO_${i}`] = coluna; // Mapeia a coluna
        i++; // Incrementa o contador
    }
    return colunasMap; // Retorna o mapeamento das colunas
}

// Função para obter o mapeamento das colunas permitidas para a tabela AtualizacaoDeDados
export function obterColunasAtualizacaoMap(): Record<string, string> {
    const colunasMap: Record<string, string> = {}; // Inicializa um objeto para mapear colunas
    let i = 1;

    // Verifica as colunas no formato COLUMN_{n} e COLUMN_0{n}
    while (true) {
        const coluna = getEnvVar(`COLUMN_${i}`, ''); // Obtém coluna no formato COLUMN_{n}
        if (!coluna) break; // Sai do loop se não houver coluna
        colunasMap[`COLUMN_${i}`] = coluna; // Mapeia a coluna
        i++; // Incrementa o contador
    }

    // Verifica se COLUMN_0{n} também existe
    i = 1; // Reinicia o contador para verificar colunas formatadas como COLUMN_01, COLUMN_02, etc.
    while (true) {
        const coluna = getEnvVar(`COLUMN_0${i}`, ''); // Obtém coluna no formato COLUMN_0{n}
        if (!coluna) break; // Sai do loop se não houver coluna
        colunasMap[`COLUMN_0${i}`] = coluna; // Mapeia a coluna
        i++; // Incrementa o contador
    }
    return colunasMap; // Retorna o mapeamento das colunas
}

// Função para obter as colunas permitidas para Chamados
export function obterColunasPermitidasChamados(): string[] {
    return getEnvVar('COLUNAS_PERMITIDAS_CHAMADO').split(',').map(col => col.trim()); // Retorna colunas como array
}

// Função para obter as colunas permitidas para AtualizacaoDeDados
export function obterColunasPermitidasAtualizacao(): string[] {
    return getEnvVar('COLUNAS_PERMITIDAS_ATUALIZACAODEDADOS').split(',').map(col => col.trim()); // Retorna colunas como array
}
