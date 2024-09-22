/* src/routes/usuarioRoutes.ts */
import { Router } from 'express';
import { criarTabelas } from '../controller/criarTabelas';
import { body } from 'express-validator';

const router = Router();

// Rota para criar tabelas
router.post('/criarTabelas', [
    body('senha')
        .trim()
        .isLength({ min: 8 })
        .withMessage('A senha deve ter pelo menos 8 caracteres.'),
    body('dados')
        .isObject()
        .withMessage('Os dados devem ser um objeto.'),
    // Adicione mais validações conforme necessário
], criarTabelas);

// Exporte o router para uso em outros arquivos
export default router;
