/* src/routes/usuarioRoutes.ts */
import { Router } from 'express';
import { criarTabelas } from '../controller/criarTabelas';
import { body } from 'express-validator';
import { obterColunasPermitidasChamados, obterColunasPermitidasAtualizacao } from '../config/config'; // Importe a função

const router = Router();

router.post('/criarTabelas', [
    body('senha').trim().isLength({ min: 8 }).withMessage('A senha deve ter pelo menos 8 caracteres.'),
    body('dados').isObject().withMessage('Os dados devem ser um objeto.'),
], criarTabelas);

// Nova rota para obter colunas permitidas
router.get('/colunas-permitidas', (req, res) => {
    const colunasChamados = obterColunasPermitidasChamados(); // Obtenha colunas permitidas
    const colunasAtualizacao = obterColunasPermitidasAtualizacao();
    res.json({ colunasChamados, colunasAtualizacao }); // Retorne as colunas como JSON
});

export default router;
