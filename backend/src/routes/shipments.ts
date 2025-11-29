import { Router } from 'express';
import { z } from 'zod';
import {
  createShipment,
  deleteShipment,
  getShipment,
  listShipments,
  getShipmentReturnView,
  listShipmentReturnViews,
  listShipmentBalances,
  listProductReturnTickets,
  updateShipmentMeta,
  updateShipmentReturns,
  applyProductReturns,
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
    .max(240, 'Mǭximo de 240 caracteres')
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
  mode: z.enum(['set', 'increment']).optional(),
});

const productReturnSchema = z.object({
  updates: z
    .array(
      z.object({
        productId: z.string().min(1, 'Selecione um produto'),
        quantity: z.number().int().positive('Quantidade retornada deve ser maior que zero'),
        occurredAt: z
          .string()
          .regex(isoDateRegex, 'Use o formato YYYY-MM-DD')
          .optional()
          .transform((value) => (value ? value.slice(0, 10) : undefined)),
        notes: z
          .string()
          .trim()
          .max(240, 'Maximo de 240 caracteres')
          .optional()
          .transform((value) => (value === '' ? undefined : value)),
      }),
    )
    .min(1, 'Informe ao menos um item de retorno'),
});

router.get('/', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuǭrio nǜo autenticado' });
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
      return res.status(401).json({ message: 'Usuǭrio nǜo autenticado' });
    }
    const returnViews = await listShipmentReturnViews(req.userId);

    const pendingOnly = req.query.pendingOnly === 'true' || req.query.pendingOnly === '1';
    const filtered = pendingOnly
      ? returnViews
          .map((view) => ({
            ...view,
            items: view.items.filter((item) => item.quantityPending > 0),
          }))
          .filter((view) => view.items.length > 0)
      : returnViews;

    res.json(filtered);
  } catch (error) {
    next(error);
  }
});

router.get('/returns/by-product', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario nao autenticado' });
    }

    const tickets = await listProductReturnTickets(req.userId);
    const pendingOnly = req.query.pendingOnly === 'true' || req.query.pendingOnly === '1';
    const filtered = pendingOnly ? tickets.filter((ticket) => ticket.pendingReturn > 0) : tickets;

    return res.json(filtered);
  } catch (error) {
    next(error);
  }
});

router.post('/returns/by-product', async (req, res, next) => {
  try {
    const result = productReturnSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Dados invalidos', errors: result.error.flatten() });
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario nao autenticado' });
    }

    const applyResults = await applyProductReturns(req.userId, result.data.updates);
    const tickets = await listProductReturnTickets(req.userId);

    return res.json({ results: applyResults, tickets });
  } catch (error) {
    next(error);
  }
});

router.get('/balance', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuǭrio nǜo autenticado' });
    }
    const balances = await listShipmentBalances(req.userId);
    return res.json(balances);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuǭrio nǜo autenticado' });
    }
    const shipment = await getShipment(req.params.id, req.userId);
    if (!shipment) {
      return res.status(404).json({ message: 'Envio nǜo encontrado' });
    }
    return res.json(shipment);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/returns', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuǭrio nǜo autenticado' });
    }

    const returnView = await getShipmentReturnView(req.params.id, req.userId);
    if (!returnView) {
      return res.status(404).json({ message: 'Envio nǜo encontrado' });
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
      return res.status(400).json({ message: 'Dados invǭlidos', errors: result.error.flatten() });
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Usuǭrio nǜo autenticado' });
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
      return res.status(400).json({ message: 'Dados invǭlidos', errors: result.error.flatten() });
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Usuǭrio nǜo autenticado' });
    }

    const shipment = await updateShipmentMeta(req.params.id, req.userId, result.data);
    if (!shipment) {
      return res.status(404).json({ message: 'Envio nǜo encontrado' });
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
      return res.status(400).json({ message: 'Dados invǭlidos', errors: result.error.flatten() });
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Usuǭrio nǜo autenticado' });
    }

    const shipment = await updateShipmentReturns(
      req.params.id,
      req.userId,
      result.data.updates,
      result.data.mode ?? 'set',
    );
    if (!shipment) {
      return res.status(404).json({ message: 'Envio nǜo encontrado' });
    }

    return res.json(shipment);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuǭrio nǜo autenticado' });
    }

    const removed = await deleteShipment(req.params.id, req.userId);
    if (!removed) {
      return res.status(404).json({ message: 'Envio nǜo encontrado' });
    }
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
