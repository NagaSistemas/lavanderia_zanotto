import type {
  Product,
  ProductInput,
  Shipment,
  ShipmentInput,
  ShipmentItem,
  ShipmentReturnUpdate,
  ShipmentReturnView,
} from './types.js';
import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { FieldPath } from 'firebase-admin/firestore';
import { firestore } from './firebase.js';
import { generateId } from './utils/id.js';

const productsCollection = firestore.collection('products');
const shipmentsCollection = firestore.collection('shipments');

type ShipmentRecord = Shipment & {
  itemProductIds?: string[];
};

const removeUndefined = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;

const mapProductDoc = (doc: DocumentSnapshot): Product => {
  const data = doc.data() as Product | undefined;
  if (!data) {
    throw new Error(`Produto ${doc.id} está sem dados no Firestore.`);
  }

  return {
    ...data,
    id: doc.id,
  };
};

const mapShipmentDoc = (doc: DocumentSnapshot): Shipment => {
  const data = doc.data() as ShipmentRecord | undefined;
  if (!data) {
    throw new Error(`Envio ${doc.id} está sem dados no Firestore.`);
  }

  return {
    ...data,
    id: doc.id,
    items: data.items ?? [],
  };
};

const ensureOwnership = <T extends { ownerId: string }>(data: T, ownerId: string): T | null =>
  data.ownerId === ownerId ? data : null;

const fetchProductsByIds = async (ids: string[]): Promise<Map<string, Product>> => {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const chunkSize = 10; // limite do Firestore para consulta com operador "in"
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    chunks.push(uniqueIds.slice(i, i + chunkSize));
  }

  const snapshots = await Promise.all(
    chunks.map((chunk) => productsCollection.where(FieldPath.documentId(), 'in', chunk).get()),
  );

  const products = new Map<string, Product>();
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      const product = mapProductDoc(doc);
      products.set(product.id, product);
    });
  });

  return products;
};

const mapReturnView = (shipment: Shipment, products: Map<string, Product>): ShipmentReturnView => ({
  shipmentId: shipment.id,
  sentAt: shipment.sentAt,
  expectedReturnAt: shipment.expectedReturnAt,
  notes: shipment.notes,
  items: shipment.items.map((item) => {
    const product = products.get(item.productId);
    return {
      lineId: item.id,
      productId: item.productId,
      productName: product?.name ?? 'Produto removido',
      quantitySent: item.quantitySent,
      quantityReturned: item.quantityReturned,
    };
  }),
  createdAt: shipment.createdAt,
  updatedAt: shipment.updatedAt,
});

export const listProducts = async (ownerId: string): Promise<Product[]> => {
  const snapshot = await productsCollection.where('ownerId', '==', ownerId).orderBy('name', 'asc').get();
  return snapshot.docs.map(mapProductDoc);
};

export const getProduct = async (id: string, ownerId: string): Promise<Product | null> => {
  const doc = await productsCollection.doc(id).get();
  if (!doc.exists) {
    return null;
  }

  const product = mapProductDoc(doc);
  return ensureOwnership(product, ownerId);
};

export const createProduct = async (ownerId: string, input: ProductInput): Promise<Product> => {
  const now = new Date().toISOString();
  const docRef = productsCollection.doc();
  const product: Product = {
    id: docRef.id,
    ownerId,
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(removeUndefined(product));
  return product;
};

export const updateProduct = async (
  id: string,
  ownerId: string,
  input: ProductInput,
): Promise<Product | null> => {
  const docRef = productsCollection.doc(id);
  const existing = await docRef.get();
  if (!existing.exists) {
    return null;
  }

  const current = mapProductDoc(existing);
  if (current.ownerId !== ownerId) {
    return null;
  }

  const updated: Product = {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  await docRef.set(removeUndefined(updated));
  return updated;
};

export const deleteProduct = async (id: string, ownerId: string): Promise<boolean> => {
  const docRef = productsCollection.doc(id);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return false;
  }

  const current = mapProductDoc(snapshot);
  if (current.ownerId !== ownerId) {
    return false;
  }

  await docRef.delete();

  const shipmentsSnapshot = await shipmentsCollection
    .where('ownerId', '==', ownerId)
    .where('itemProductIds', 'array-contains', id)
    .get();

  if (!shipmentsSnapshot.empty) {
    const batch = firestore.batch();
    const updatedAt = new Date().toISOString();

    shipmentsSnapshot.forEach((shipmentDoc) => {
      const data = shipmentDoc.data() as ShipmentRecord;
      const filteredItems = (data.items ?? []).filter((item) => item.productId !== id);

      if (filteredItems.length === 0) {
        batch.delete(shipmentDoc.ref);
      } else {
        batch.update(shipmentDoc.ref, {
          items: filteredItems,
          itemProductIds: filteredItems.map((item) => item.productId),
          updatedAt,
        });
      }
    });

    await batch.commit();
  }

  return true;
};

export const listShipments = async (ownerId: string): Promise<Shipment[]> => {
  const snapshot = await shipmentsCollection
    .where('ownerId', '==', ownerId)
    .orderBy('sentAt', 'desc')
    .get();
  return snapshot.docs.map(mapShipmentDoc);
};

export const getShipment = async (id: string, ownerId: string): Promise<Shipment | null> => {
  const doc = await shipmentsCollection.doc(id).get();
  if (!doc.exists) {
    return null;
  }

  const shipment = mapShipmentDoc(doc);
  return ensureOwnership(shipment, ownerId);
};

export const listShipmentReturnViews = async (ownerId: string): Promise<ShipmentReturnView[]> => {
  const shipments = await listShipments(ownerId);
  const productIds = shipments.flatMap((shipment) => shipment.items.map((item) => item.productId));
  const products = await fetchProductsByIds(productIds);
  return shipments.map((shipment) => mapReturnView(shipment, products));
};

export const getShipmentReturnView = async (
  id: string,
  ownerId: string,
): Promise<ShipmentReturnView | null> => {
  const shipment = await getShipment(id, ownerId);
  if (!shipment) {
    return null;
  }

  const products = await fetchProductsByIds(shipment.items.map((item) => item.productId));
  return mapReturnView(shipment, products);
};

export const createShipment = async (
  ownerId: string,
  input: ShipmentInput,
): Promise<Shipment> => {
  const docRef = shipmentsCollection.doc();
  const now = new Date().toISOString();

  const items: ShipmentItem[] = input.items.map((item) => ({
    id: generateId(),
    productId: item.productId,
    quantitySent: item.quantitySent,
    quantityReturned: Math.min(Math.max(item.quantityReturned ?? 0, 0), item.quantitySent),
  }));

  const shipmentRecord: ShipmentRecord = {
    id: docRef.id,
    ownerId,
    sentAt: input.sentAt,
    expectedReturnAt: input.expectedReturnAt,
    notes: input.notes,
    items,
    itemProductIds: items.map((item) => item.productId),
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(removeUndefined(shipmentRecord));
  return {
    id: shipmentRecord.id,
    ownerId,
    sentAt: shipmentRecord.sentAt,
    expectedReturnAt: shipmentRecord.expectedReturnAt,
    notes: shipmentRecord.notes,
    items,
    createdAt: shipmentRecord.createdAt,
    updatedAt: shipmentRecord.updatedAt,
  };
};

export const updateShipmentMeta = async (
  id: string,
  ownerId: string,
  input: Partial<Omit<ShipmentInput, 'items'>>,
): Promise<Shipment | null> => {
  const docRef = shipmentsCollection.doc(id);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return null;
  }

  const current = mapShipmentDoc(snapshot);
  if (current.ownerId !== ownerId) {
    return null;
  }

  const updated: ShipmentRecord = {
    ...current,
    ...input,
    itemProductIds: current.items.map((item) => item.productId),
    updatedAt: new Date().toISOString(),
  };

  await docRef.set(removeUndefined(updated));
  return mapShipmentDoc(await docRef.get());
};

export const updateShipmentReturns = async (
  id: string,
  ownerId: string,
  updates: ShipmentReturnUpdate[],
): Promise<Shipment | null> => {
  const docRef = shipmentsCollection.doc(id);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return null;
  }

  const current = mapShipmentDoc(snapshot);
  if (current.ownerId !== ownerId) {
    return null;
  }

  const updateMap = new Map(updates.map((item) => [item.lineId, item.quantityReturned]));

  const items = current.items.map((item) => {
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

  const updated: ShipmentRecord = {
    ...current,
    items,
    itemProductIds: items.map((item) => item.productId),
    updatedAt: new Date().toISOString(),
  };

  await docRef.set(removeUndefined(updated));
  return mapShipmentDoc(await docRef.get());
};

export const deleteShipment = async (id: string, ownerId: string): Promise<boolean> => {
  const docRef = shipmentsCollection.doc(id);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return false;
  }

  const current = mapShipmentDoc(snapshot);
  if (current.ownerId !== ownerId) {
    return false;
  }

  await docRef.delete();
  return true;
};
