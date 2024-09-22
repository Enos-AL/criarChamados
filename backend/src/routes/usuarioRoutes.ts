import { Router, Request, Response } from 'express';
import { criarTabelas } from '../controller/criarTabelas';
import { body, validationResult } from 'express-validator';
import { obterColunasPermitidasChamados, obterColunasPermitidasAtualizacao, verificarPermissao } from '../config/config';

const router = Router();

// Middleware para lidar com validação de erros
const validarRequisicao = (req: Request, res: Response, next: Function) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
        return res.status(400).json({ errors: erros.array() });
    }
    next();
};

// Rota para verificar a senha
router.post('/verificarSenha', (req, res) => {
    const { senha } = req.body;

    if (!verificarPermissao(senha)) {
        return res.status(401).json({ message: 'Senha incorreta' });
    }

    res.status(200).json({ message: 'Senha correta' });
});

// Rota para criar tabelas
router.post('/criarTabelas', [
    body('senha').trim().isLength({ min: 8 }).withMessage('A senha deve ter pelo menos 8 caracteres.'),
    body('dados').isObject().withMessage('Os dados devem ser um objeto.'),
    validarRequisicao
], criarTabelas);

// Rota para obter colunas permitidas
router.post('/colunas-permitidas', (req, res) => {
    const { senha } = req.body;

    if (!senha || !verificarPermissao(senha)) {
        return res.status(401).json({ message: 'Senha incorreta. Acesso negado.' });
    }

    const colunasChamados = obterColunasPermitidasChamados();
    const colunasAtualizacao = obterColunasPermitidasAtualizacao();
    res.json({ colunasChamados, colunasAtualizacao });
});

export default router;
