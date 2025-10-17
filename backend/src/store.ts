import {
  type Product,
  type ProductInput,
  type Shipment,
  type ShipmentInput,
  type ShipmentReturnUpdate,
  type ShipmentItem,
} from './types';
import { generateId } from './utils/id';

type State = {
  products: Map<string, Product>;
  shipments: Map<string, Shipment>;
};

const state: State = {
  products: new Map(),
  shipments: new Map(),
};

export const listProducts = (): Product[] =>
  Array.from(state.products.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  );

export const getProduct = (id: string): Product | undefined => state.products.get(id);

export const createProduct = (input: ProductInput): Product => {
  const now = new Date().toISOString();
  const product: Product = {
    id: generateId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  state.products.set(product.id, product);
  return product;
};

export const updateProduct = (id: string, input: ProductInput): Product | null => {
  const existing = state.products.get(id);
  if (!existing) {
    return null;
  }

  const updated: Product = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  state.products.set(id, updated);
  return updated;
};

export const deleteProduct = (id: string): boolean => {
  const removed = state.products.delete(id);
  if (!removed) {
    return false;
  }

  // Clean product references from shipments
  state.shipments.forEach((shipment) => {
    const filteredItems = shipment.items.filter((item) => item.productId !== id);
    if (filteredItems.length !== shipment.items.length) {
      if (filteredItems.length === 0) {
        state.shipments.delete(shipment.id);
      } else {
        const updatedShipment: Shipment = {
          ...shipment,
          items: filteredItems,
          updatedAt: new Date().toISOString(),
        };
        state.shipments.set(shipment.id, updatedShipment);
      }
    }
  });

  return true;
};

export const listShipments = (): Shipment[] =>
  Array.from(state.shipments.values()).sort((a, b) => b.sentAt.localeCompare(a.sentAt));

export const getShipment = (id: string): Shipment | undefined => state.shipments.get(id);

export const createShipment = (input: ShipmentInput): Shipment => {
  const items: ShipmentItem[] = input.items.map((item) => ({
    id: generateId(),
    productId: item.productId,
    quantitySent: item.quantitySent,
    quantityReturned: Math.min(Math.max(item.quantityReturned ?? 0, 0), item.quantitySent),
  }));

  const now = new Date().toISOString();

  const shipment: Shipment = {
    id: generateId(),
    sentAt: input.sentAt,
    expectedReturnAt: input.expectedReturnAt,
    notes: input.notes,
    items,
    createdAt: now,
    updatedAt: now,
  };

  state.shipments.set(shipment.id, shipment);
  return shipment;
};

export const updateShipmentMeta = (
  id: string,
  input: Partial<Omit<ShipmentInput, 'items'>>,
): Shipment | null => {
  const existing = state.shipments.get(id);
  if (!existing) {
    return null;
  }

  const updated: Shipment = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  state.shipments.set(id, updated);
  return updated;
};

export const updateShipmentReturns = (
  id: string,
  updates: ShipmentReturnUpdate[],
): Shipment | null => {
  const existing = state.shipments.get(id);
  if (!existing) {
    return null;
  }

  const updateMap = new Map(updates.map((item) => [item.lineId, item.quantityReturned]));

  const items = existing.items.map((item) => {
    if (!updateMap.has(item.id)) {
      return item;
    }
    const quantityReturned = Math.min(
      Math.max(updateMap.get(item.id) ?? 0, 0),
      item.quantitySent,
    );
    return {
      ...item,
      quantityReturned,
    };
  });

  const updated: Shipment = {
    ...existing,
    items,
    updatedAt: new Date().toISOString(),
  };

  state.shipments.set(id, updated);
  return updated;
};

export const deleteShipment = (id: string): boolean => state.shipments.delete(id);

const ensureSeedData = () => {
  if (state.products.size > 0 || state.shipments.size > 0) {
    return;
  }

  const towel = createProduct({
    name: 'Toalha de banho',
    category: 'Enxoval',
    pricePerUnit: 4.5,
  });
  const sheet = createProduct({
    name: 'Lençol casal',
    category: 'Roupa de cama',
    pricePerUnit: 7.9,
  });

  createShipment({
    sentAt: new Date().toISOString().slice(0, 10),
    expectedReturnAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    notes: 'Lote inicial automatizado',
    items: [
      { productId: towel.id, quantitySent: 50 },
      { productId: sheet.id, quantitySent: 30 },
    ],
  });
};

ensureSeedData();
