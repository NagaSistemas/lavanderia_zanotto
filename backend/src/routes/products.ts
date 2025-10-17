import { Router } from 'express';
import { z } from 'zod';
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  getProduct,
} from '../store';

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

router.get('/', (_req, res) => {
  res.json(listProducts());
});

router.get('/:id', (req, res) => {
  const product = getProduct(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Produto não encontrado' });
  }
  return res.json(product);
});

router.post('/', (req, res) => {
  const result = productSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Dados inválidos', errors: result.error.flatten() });
  }

  const product = createProduct(result.data);
  return res.status(201).json(product);
});

router.put('/:id', (req, res) => {
  const result = productSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Dados inválidos', errors: result.error.flatten() });
  }

  const product = updateProduct(req.params.id, result.data);
  if (!product) {
    return res.status(404).json({ message: 'Produto não encontrado' });
  }

  return res.json(product);
});

router.delete('/:id', (req, res) => {
  const removed = deleteProduct(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: 'Produto não encontrado' });
  }
  return res.status(204).send();
});

export default router;
