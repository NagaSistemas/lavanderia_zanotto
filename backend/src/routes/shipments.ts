import { Router } from 'express';
import { z } from 'zod';
import {
  createShipment,
  deleteShipment,
  getShipment,
  listShipments,
  getShipmentReturnView,
  listShipmentReturnViews,
  updateShipmentMeta,
  updateShipmentReturns,
} from '../store.js';

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
  items: z.array(shipmentItemSchema).min(1, 'Informe ao menos um item para o envio'),
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

router.get('/', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    const shipments = await listShipments(req.userId);
    res.json(shipments);
  } catch (error) {
    next(error);
  }
});

router.get('/returns', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    const returnViews = await listShipmentReturnViews(req.userId);
    res.json(returnViews);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    const shipment = await getShipment(req.params.id, req.userId);
    if (!shipment) {
      return res.status(404).json({ message: 'Envio não encontrado' });
    }
    return res.json(shipment);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/returns', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const returnView = await getShipmentReturnView(req.params.id, req.userId);
    if (!returnView) {
      return res.status(404).json({ message: 'Envio não encontrado' });
    }

    return res.json(returnView);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = shipmentSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Dados inválidos', errors: result.error.flatten() });
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const shipment = await createShipment(req.userId, result.data);
    return res.status(201).json(shipment);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const result = shipmentMetaSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Dados inválidos', errors: result.error.flatten() });
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const shipment = await updateShipmentMeta(req.params.id, req.userId, result.data);
    if (!shipment) {
      return res.status(404).json({ message: 'Envio não encontrado' });
    }

    return res.json(shipment);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/returns', async (req, res, next) => {
  try {
    const result = shipmentReturnSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Dados inválidos', errors: result.error.flatten() });
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const shipment = await updateShipmentReturns(req.params.id, req.userId, result.data.updates);
    if (!shipment) {
      return res.status(404).json({ message: 'Envio não encontrado' });
    }

    return res.json(shipment);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const removed = await deleteShipment(req.params.id, req.userId);
    if (!removed) {
      return res.status(404).json({ message: 'Envio não encontrado' });
    }
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
