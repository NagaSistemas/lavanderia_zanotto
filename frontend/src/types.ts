export type Product = {
  id: string;
  name: string;
  category?: string;
  pricePerUnit: number;
  ownerId?: string;
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
  ownerId?: string;
  sentAt: string;
  expectedReturnAt?: string;
  notes?: string;
  items: ShipmentLine[];
  finalized?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LaundryState = {
  products: Product[];
  shipments: Shipment[];
  returnTickets: ProductReturnTicket[];
};

export type ProductPayload = {
  name: string;
  category?: string;
  pricePerUnit: number;
};

export type ShipmentItemPayload = {
  productId: string;
  quantitySent: number;
  quantityReturned?: number;
};

export type ShipmentPayload = {
  sentAt: string;
  expectedReturnAt?: string;
  notes?: string;
  items: ShipmentItemPayload[];
};

export type ProductReturnTicketShipment = {
  shipmentId: string;
  sentAt: string;
  expectedReturnAt?: string;
  notes?: string;
  quantitySent: number;
  quantityReturned: number;
  quantityPending: number;
};

export type ProductReturnTicket = {
  productId: string;
  productName: string;
  category?: string;
  totalSent: number;
  totalReturned: number;
  pendingReturn: number;
  shipments: ProductReturnTicketShipment[];
};

export type ProductReturnAllocation = {
  shipmentId: string;
  lineId: string;
  applied: number;
  pendingAfter: number;
};

export type ProductReturnResult = {
  productId: string;
  requested: number;
  applied: number;
  remaining: number;
  allocations: ProductReturnAllocation[];
  notes?: string;
  warning?: string;
};
