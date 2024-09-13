import { Router } from 'express';
import { criarTabelas } from '../controller/criarTabelas';

const router = Router();

router.post('/criarTabelas', criarTabelas);

export default router;
