import { Router } from 'express';
import { z } from 'zod';
import {
  createShipment,
  deleteShipment,
  getShipment,
  listShipments,
  updateShipmentMeta,
  updateShipmentReturns,
} from '../store';

const router = Router();

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const shipmentItemSchema = z.object({
  productId: z.string().min(1, 'Selecione um produto'),
  quantitySent: z.number().int().positive('Quantidade enviada deve ser maior que zero'),
  quantityReturned: z
    .number()
    .int()
    .min(0, 'Retorno deve ser maior ou igual a zero')
    .optional(),
});

const shipmentSchema = z.object({
  sentAt: z
    .string()
    .regex(isoDateRegex, 'Use o formato YYYY-MM-DD')
    .transform((value) => value.slice(0, 10)),
  expectedReturnAt: z
    .string()
    .regex(isoDateRegex, 'Use o formato YYYY-MM-DD')
    .optional()
    .transform((value) => (value ? value.slice(0, 10) : undefined)),
  notes: z
    .string()
    .trim()
    .max(240, 'Máximo de 240 caracteres')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  items: z
    .array(shipmentItemSchema)
    .min(1, 'Informe ao menos um item para o envio'),
});

const shipmentMetaSchema = shipmentSchema.partial({
  items: true,
}).omit({ items: true });

const shipmentReturnSchema = z.object({
  updates: z
    .array(
      z.object({
        lineId: z.string().min(1),
        quantityReturned: z.number().int().min(0),
      }),
    )
    .min(1),
});

router.get('/', (_req, res) => {
  res.json(listShipments());
});

router.get('/:id', (req, res) => {
  const shipment = getShipment(req.params.id);
  if (!shipment) {
    return res.status(404).json({ message: 'Envio não encontrado' });
  }
  return res.json(shipment);
});

router.post('/', (req, res) => {
  const result = shipmentSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Dados inválidos', errors: result.error.flatten() });
  }

  const shipment = createShipment(result.data);
  return res.status(201).json(shipment);
});

router.patch('/:id', (req, res) => {
  const result = shipmentMetaSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Dados inválidos', errors: result.error.flatten() });
  }

  const shipment = updateShipmentMeta(req.params.id, result.data);
  if (!shipment) {
    return res.status(404).json({ message: 'Envio não encontrado' });
  }

  return res.json(shipment);
});

router.patch('/:id/returns', (req, res) => {
  const result = shipmentReturnSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Dados inválidos', errors: result.error.flatten() });
  }

  const shipment = updateShipmentReturns(req.params.id, result.data.updates);
  if (!shipment) {
    return res.status(404).json({ message: 'Envio não encontrado' });
  }

  return res.json(shipment);
});

router.delete('/:id', (req, res) => {
  const removed = deleteShipment(req.params.id);
  if (!removed) {
    return res.status(404).json({ message: 'Envio não encontrado' });
  }
  return res.status(204).send();
});

export default router;
