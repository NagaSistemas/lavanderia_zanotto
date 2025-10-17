export type Product = {
  id: string;
  name: string;
  category?: string;
  pricePerUnit: number;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentLine = {
  id: string;
  productId: string;
  quantitySent: number;
  quantityReturned: number;
};

export type Shipment = {
  id: string;
  sentAt: string;
  expectedReturnAt?: string;
  notes?: string;
  items: ShipmentLine[];
  createdAt: string;
  updatedAt: string;
};

export type LaundryState = {
  products: Product[];
  shipments: Shipment[];
};

export type ProductPayload = {
  name: string;
  category?: string;
  pricePerUnit: number;
};

export type ShipmentItemPayload = {
  productId: string;
  quantitySent: number;
};

export type ShipmentPayload = {
  sentAt: string;
  expectedReturnAt?: string;
  notes?: string;
  items: ShipmentItemPayload[];
};
