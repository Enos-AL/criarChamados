import { Router, Request, Response, NextFunction } from 'express';
import { criarTabelas } from '../controller/criarTabelas';
import { body, validationResult } from 'express-validator';

const router = Router();

// Validação e sanitização
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

export default router;
