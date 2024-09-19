import { Router, Request, Response, NextFunction } from 'express';
import { criarTabelas } from '../controller/criarTabelas';
import { handleAtualizacaoDeDados, handleValidarTabelas } from '../controller/criarTabelas'; // Importando as novas funções
import { body, validationResult } from 'express-validator';

const router = Router();

// Validação e sanitização para criar tabelas
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

// Rota para validar tabelas
router.post('/validarTabelas', [
    body('tabelas').isArray().withMessage('Tabelas devem ser um array válido')
], (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}, handleValidarTabelas);

// Rota para atualização de dados
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
