Criar Tabelas e Colunas Dinâmicamente no SQL Server Latest

Projeto Node.js com Express e SQL Server

Este repositório contém um projeto Node.js que utiliza o framework Express para gerenciar rotas e interações com um banco de dados SQL Server. O projeto é configurado para permitir a criação e atualização de tabelas, validação de dados e gerenciamento de erros. Abaixo está uma descrição dos arquivos e suas funções.

Estrutura do Projeto

src/
|-- config/
| |-- config.ts
| |-- bd.ts
|-- controller/
| |-- criarTabelas.ts
|-- routes/
| |-- usuarioRoutes.ts
|-- websocket.ts
|-- http.ts
|-- server.ts
|-- types/
| |-- index.d.ts

Arquivos

src/server.ts
O arquivo principal que inicializa o servidor Express e conecta ao banco de dados.

import { app, serverHttp } from './http';
import "./websocket";
import usuarioRoutes from './routes/usuarioRoutes';
import config from './config/bd';

const PORT = process.env.PORT || 5001;

async function startServer() {
try {
await config.connectToDatabase();
console.log('Conexão com o banco de dados estabelecida com sucesso.');

    app.use('/usuarios', usuarioRoutes);

    serverHttp.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
} catch (error) {
    console.error('Erro ao iniciar o servidor:', error);
    process.exit(1);
}
}

startServer();

src/http.ts
Configuração do servidor HTTP e do app Express.

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
app.use(express.json());

const serverHttp = http.createServer(app);
const io = new Server(serverHttp);

export { app, serverHttp, io };

src/websocket.ts
Configuração e implementação para o WebSocket.

import { io } from './http';

io.on('connection', (socket) => {
console.log('Usuário conectado');

socket.on('disconnect', () => {
    console.log('Usuário desconectado');
});
});

src/routes/usuarioRoutes.ts
Rotas relacionadas a usuários, incluindo a criação de tabelas e atualização de dados.

import { Router, Request, Response, NextFunction } from 'express';
import { criarTabelas, handleAtualizacaoDeDados, handleValidarTabelas } from '../controller/criarTabelas';
import { body, validationResult } from 'express-validator';

const router = Router();

router.post('/criarTabelas', [
body('senha').trim().isLength({ min: 1 }).withMessage('Senha é obrigatória'),
body('dados').isObject().withMessage('Dados devem ser um objeto')
], (req: Request, res: Response, next: NextFunction) => {
const errors = validationResult(req);
if (!errors.isEmpty()) {
return res.status(400).json({ errors: errors.array() });
}
next();
}, criarTabelas);

router.post('/validarTabelas', [
body('tabelas').isArray().withMessage('Tabelas devem ser um array válido')
], (req: Request, res: Response, next: NextFunction) => {
const errors = validationResult(req);
if (!errors.isEmpty()) {
return res.status(400).json({ errors: errors.array() });
}
next();
}, handleValidarTabelas);

router.post('/atualizarDados', [
body('tabelas').isArray().withMessage('Tabelas devem ser um array'),
body('senha').trim().isLength({ min: 1 }).withMessage('Senha é obrigatória')
], (req: Request, res: Response, next: NextFunction) => {
const errors = validationResult(req);
if (!errors.isEmpty()) {
return res.status(400).json({ errors: errors.array() });
}
next();
}, handleAtualizacaoDeDados);

export default router;

src/controller/criarTabelas.ts
Funções para criação e atualização de tabelas, validação de dados e tratamento de erros.

import { Request, Response } from 'express';
import sql from 'mssql';
import Config from '../config/config';

const config = Config.getInstance();

// Funções para verificar e criar tabelas
async function verificarSeTabelaExiste(nomeTabela: string, pool: sql.ConnectionPool): Promise {
// ... Implementação
}

async function obterColunasAtuais(tabela: string, poolConnection: sql.ConnectionPool): Promise<string[]> {
// ... Implementação
}

async function criarTabelasEColunas(tabelasAserCriadas: string[], tabelasPermitidas: string[], pool: sql.ConnectionPool): Promise<string[]> {
// ... Implementação
}

async function verificarIncompatibilidadesColunas(tabela: string, colunasConfig: { position: number, name: string }[], pool: sql.ConnectionPool, tabelasEColunasCriadas: string[]): Promise {
// ... Implementação
}

async function handleInvalidPassword(senha: string, tabelasNaoPermitidas: string[], pool: sql.ConnectionPool, res: Response): Promise {
// ... Implementação
}

async function handleDisallowedTables(tabelasNaoPermitidas: string[], dados: any, pool: sql.ConnectionPool, res: Response): Promise {
// ... Implementação
}

export async function handleValidarTabelas(req: Request, res: Response): Promise {
// ... Implementação
}

export async function handleAtualizacaoDeDados(req: Request, res: Response): Promise {
// ... Implementação
}

async function handleError(err: unknown, dados: any, pool: sql.ConnectionPool, res: Response): Promise {
// ... Implementação
}

export async function criarTabelas(req: Request, res: Response): Promise {
// ... Implementação
}

src/config/config.ts
Configurações de banco de dados e outras configurações do projeto.

import { config as dotenvConfig } from 'dotenv';
import sql from 'mssql';
import path from 'path';

dotenvConfig({ path: path.resolve(__dirname, '../../../.env') });

class Config {
private static instance: Config;

private constructor() { }

public static getInstance(): Config {
// ... Implementação
}

public getDbConfig() {
// ... Implementação
}

public getAppConfig() {
// ... Implementação
}

public getProtectedColumnsChamados() {
// ... Implementação
}

public getProtectedColumnsAtualizacaoDeDados() {
// ... Implementação
}

public getPermittedTables() {
// ... Implementação
}

public getColunasAtualizacaoDeDados() {
// ... Implementação
}

public getSenhaProtegida() {
// ... Implementação
}

public getColumnsChamados() {
// ... Implementação
}

public getColunasPorTabela(tabela: string) {
// ... Implementação
}

public getTableAtualizacaoDeDados() {
// ... Implementação
}

async connectToDatabase(): Promise<sql.ConnectionPool> {
// ... Implementação
}

async registrarErroGenerico(
erro: string,
tabelaErrada: string | string[] | null,
poolConnection: sql.ConnectionPool,
detalhes?: string
): Promise {
// ... Implementação
}
}

export default Config;

src/config/bd.ts
Configurações de banco de dados e funções auxiliares.

import sql from 'mssql';
import Config from './config';

const configInstance = Config.getInstance();
const dbConfig = configInstance.getDbConfig();

const config = {
bdConfig: dbConfig,
appConfig: configInstance.getAppConfig(),
protectedColumnsChamados: configInstance.getProtectedColumnsChamados(),
protectedColumnsAtualizacaoDeDados: configInstance.getProtectedColumnsAtualizacaoDeDados(),
permittedTables: configInstance.getPermittedTables(),
colunasAtualizacaoDeDados: configInstance.getColunasAtualizacaoDeDados(),
senhaProtegida: configInstance.getSenhaProtegida(),
columnsChamados: configInstance.getColumnsChamados(),
tableAtualizacaoDeDados: configInstance.getTableAtualizacaoDeDados(),

async connectToDatabase(): Promise<sql.ConnectionPool> {
// ... Implementação
},

async registrarAtualizacao(tabelas: string[], senha: string): Promise {
// ... Implementação
},

async obterColunasAtuais(tabela: string): Promise<string[]> {
// ... Implementação
},

async verificarColunasProtegidas(tabela: string): Promise {
// ... Implementação
},

getColunasProtegidasPorTabela(tabela: string): string[] {
// ... Implementação
},

getColunasProtegidasChamados(): string[] {
// ... Implementação
},

getColunasProtegidasAtualizacaoDeDados(): string[] {
// ... Implementação
},

getTabelasPermitidas(): string[] {
// ... Implementação
},

getTableAtualizacaoDeDados(): string {
// ... Implementação
}
};

export default config;

src/types/index.d.ts
Definições de tipos personalizadas.

// Defina aqui os tipos personalizados que você pode precisar

Configuração

Instale as dependências:

npm install

Crie um arquivo .env na raiz do projeto com as seguintes variáveis:

DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_SERVER=seu_servidor
DB_NAME=seu_banco_de_dados
DB_PORT=1433
REQUEST_TIMEOUT=5000
COLUNAS_PROTEGIDAS_CHAMADOS=coluna1,coluna2
COLUNAS_PROTEGIDAS_ATUALIZACAODEDADOS=coluna1,coluna2
TABELAS_PERMITIDAS=tabela1,tabela2
COLUMN_1=coluna1
COLUMN_2=coluna2
COLUMN_3=coluna3
COLUMN_4=coluna4
COLUMN_5=coluna5
COLUMN_6=coluna6
COLUMN_CHAMADO_01=coluna1
COLUMN_CHAMADO_02=coluna2
COLUMN_CHAMADO_03=coluna3
COLUMN_CHAMADO_04=coluna4
COLUMN_CHAMADO_05=coluna5
COLUMN_CHAMADO_06=coluna6
COLUMN_CHAMADO_07=coluna7
COLUMN_CHAMADO_08=coluna8
COLUMN_CHAMADO_09=coluna9
COLUMN_CHAMADO_10=coluna10
COLUMN_CHAMADO_11=coluna11
COLUMN_CHAMADO_12=coluna12
COLUMN_CHAMADO_13=coluna13
COLUMN_CHAMADO_14=coluna14
COLUMN_CHAMADO_15=coluna15
COLUMN_CHAMADO_16=coluna16
PERMISSAO_SENHA_TABELAS_E_COLUNAS=sua_senha_protegida
TABELA_ATUALIZACAO_DE_DADOS=AtualizacaoDeDados

Inicie o servidor:

npm run dev

Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para enviar um pull request ou abrir uma issue.

Licença
Este projeto está licenciado sob a MIT License.

Esse esboço cobre as principais partes do projeto, suas funcionalidades e instruções para configuração e uso. Adapte conforme necessário para atender a qualquer detalhe específico do seu projeto.
