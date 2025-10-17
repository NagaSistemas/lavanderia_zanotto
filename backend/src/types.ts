export type ProductInput = {
  name: string;
  category?: string;
  pricePerUnit: number;
};

export type Product = ProductInput & {
  id: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentItemInput = {
  productId: string;
  quantitySent: number;
  quantityReturned?: number;
};

export type ShipmentInput = {
  sentAt: string;
  expectedReturnAt?: string;
  notes?: string;
  items: ShipmentItemInput[];
};

export type ShipmentItem = {
  id: string;
  productId: string;
  quantitySent: number;
  quantityReturned: number;
};

export type Shipment = {
  id: string;
  ownerId: string;
  sentAt: string;
  expectedReturnAt?: string;
  notes?: string;
  items: ShipmentItem[];
  createdAt: string;
  updatedAt: string;
};

export type ShipmentReturnUpdate = {
  lineId: string;
  quantityReturned: number;
};
