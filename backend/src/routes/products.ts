import { Router } from 'express';
import { z } from 'zod';
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  getProduct,
} from '../store.js';

const router = Router();

const productSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do item'),
  category: z
    .string()
    .trim()
    .max(120, 'Limite de 120 caracteres')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  pricePerUnit: z.number().positive('O preço deve ser maior que zero'),
});

router.get('/', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    const products = await listProducts(req.userId);
    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    const product = await getProduct(req.params.id, req.userId);
    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    return res.json(product);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = productSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Dados inválidos', errors: result.error.flatten() });
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const product = await createProduct(req.userId, result.data);
    return res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = productSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Dados inválidos', errors: result.error.flatten() });
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const product = await updateProduct(req.params.id, req.userId, result.data);
    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    return res.json(product);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const removed = await deleteProduct(req.params.id, req.userId);
    if (!removed) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
