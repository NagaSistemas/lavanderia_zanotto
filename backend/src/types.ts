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
  // quantityPending is derived: quantitySent - quantityReturned
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

export type ShipmentReturnItemView = {
  lineId: string;
  productId: string;
  productName: string;
  quantitySent: number;
  quantityReturned: number;
  quantityPending: number;
};

export type ShipmentReturnView = {
  shipmentId: string;
  sentAt: string;
  expectedReturnAt?: string;
  notes?: string;
  items: ShipmentReturnItemView[];
  createdAt: string;
  updatedAt: string;
};

export type ShipmentBalanceMovement = {
  shipmentId: string;
  lineId: string;
  productId: string;
  type: 'sent' | 'return';
  quantity: number;
  occurredAt: string;
  notes?: string;
};

export type ShipmentBalanceItem = {
  productId: string;
  productName: string;
  category?: string;
  totalSent: number;
  totalReturned: number;
  pendingReturn: number;
  lastSentAt?: string;
  lastReturnedAt?: string;
  movements: ShipmentBalanceMovement[];
};

export type ProductReturnRequest = {
  productId: string;
  quantity: number;
  occurredAt?: string;
  notes?: string;
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
