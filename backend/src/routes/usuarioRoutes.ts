/* src/routes/usuarioRoutes.ts */
import { Router } from 'express';
import { criarTabelas } from '../controller/criarTabelas';
import { body } from 'express-validator';
import { obterColunasPermitidasChamados, obterColunasPermitidasAtualizacao, verificarPermissao } from '../config/config'; // Importe a função

const router = Router();

// Rota para verificar a senha
router.post('/verificarSenha', (req, res) => {
    const { senha } = req.body;

    if (!verificarPermissao(senha)) {
        return res.status(401).json({ message: 'Senha incorreta' }); // Resposta se a senha estiver incorreta
    }

    res.status(200).json({ message: 'Senha correta' }); // Resposta se a senha estiver correta
});

// Rota para criar tabelas
router.post('/criarTabelas', [
    body('senha').trim().isLength({ min: 8 }).withMessage('A senha deve ter pelo menos 8 caracteres.'),
    body('dados').isObject().withMessage('Os dados devem ser um objeto.'),
], criarTabelas);

// Rota para obter colunas permitidas
router.get('/colunas-permitidas', (req, res) => {
    const senha = req.query.senha as string | undefined; // Use 'as string | undefined' para manter a compatibilidade
    if (!senha || !verificarPermissao(senha)) { // Verifica se a senha é válida
        return res.status(401).json({ message: 'Senha incorreta. Acesso negado.' });
    }

    const colunasChamados = obterColunasPermitidasChamados();
    const colunasAtualizacao = obterColunasPermitidasAtualizacao();
    res.json({ colunasChamados, colunasAtualizacao });
});


export default router;
