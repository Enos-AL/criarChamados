/* src/config/config.ts */
/* src/config/config.ts */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente do arquivo .env
dotenvConfig({ path: path.resolve(__dirname, '../../../.env') });

// Função para obter uma variável de ambiente com fallback
function getEnvVar(key: string, defaultValue: string = ''): string {
    const value = process.env[key]; // Obtém o valor da variável de ambiente
    // Se a variável não existir, retorna um valor padrão (string vazia)
    return value ? value : defaultValue;
}

// Função para verificar permissões com base na senha fornecida
export function verificarPermissao(senha: string): boolean {
    const senhaCorreta = getEnvVar('PERMISSAO_SENHA_TABELAS_E_COLUNAS'); // Obtém a senha correta das variáveis de ambiente
    // Compara a senha fornecida com a senha correta
    return senha === senhaCorreta;
}

// Função para obter as tabelas permitidas a partir das variáveis de ambiente
export function obterTabelasPermitidas(): string[] {
    const tabelasPermitidas: string[] = []; // Inicializa um array para armazenar as tabelas
    let i = 1; // Contador para percorrer as tabelas
    while (true) {
        // Tenta obter o nome da tabela a partir das variáveis de ambiente
        const tabela = getEnvVar(`TABELA_${i}`, '');
        if (!tabela) break; // Se não houver tabela, sai do loop
        tabelasPermitidas.push(tabela); // Adiciona a tabela ao array
        i++; // Incrementa o contador
    }
    console.log('Tabelas permitidas:', tabelasPermitidas);
    return tabelasPermitidas; // Retorna a lista de tabelas permitidas
}

// Função para obter o mapeamento das colunas permitidas para a tabela Chamados
export function obterColunasChamadoMap(): Record<string, string> {
    const colunasMap: Record<string, string> = {}; // Inicializa um objeto para mapear colunas
    let i = 1;
    
    // Verifica as colunas no formato COLUMN_CHAMADO_0{n} e COLUMN_CHAMADO_{n}
    while (true) {
        const coluna = getEnvVar(`COLUMN_CHAMADO_${i < 10 ? '0' : ''}${i}`, '');
        if (!coluna) break; // Se não houver coluna, sai do loop
        colunasMap[`COLUMN_CHAMADO_${i < 10 ? '0' : ''}${i}`] = coluna; // Mapeia a coluna
        i++; // Incrementa o contador
    }

    // Verifica se COLUMN_CHAMADO_{n} também existe
    i = 10; // Começa a verificar colunas a partir de 10
    while (true) {
        const coluna = getEnvVar(`COLUMN_CHAMADO_${i}`, '');
        if (!coluna) break; // Se não houver coluna, sai do loop
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
        const coluna = getEnvVar(`COLUMN_${i}`, '');
        if (!coluna) break; // Se não houver coluna, sai do loop
        colunasMap[`COLUMN_${i}`] = coluna; // Mapeia a coluna
        i++; // Incrementa o contador
    }

    // Verifica se COLUMN_0{n} também existe
    i = 1; // Reinicia o contador para verificar colunas formatadas como COLUMN_01, COLUMN_02, etc.
    while (true) {
        const coluna = getEnvVar(`COLUMN_0${i}`, '');
        if (!coluna) break; // Se não houver coluna, sai do loop
        colunasMap[`COLUMN_0${i}`] = coluna; // Mapeia a coluna
        i++; // Incrementa o contador
    }
    return colunasMap; // Retorna o mapeamento das colunas
}

// Função para obter as colunas permitidas para Chamados
export function obterColunasPermitidasChamados(): string[] {
    return getEnvVar('COLUNAS_PERMITIDAS_CHAMADO').split(',').map(col => col.trim());
}

// Função para obter as colunas permitidas para AtualizacaoDeDados
export function obterColunasPermitidasAtualizacao(): string[] {
    return getEnvVar('COLUNAS_PERMITIDAS_ATUALIZACAODEDADOS').split(',').map(col => col.trim());
}


/* vou enviar mais um arquivos */