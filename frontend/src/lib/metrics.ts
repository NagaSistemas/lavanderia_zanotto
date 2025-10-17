import type { Product, Shipment } from '../types';

export type ShipmentWithTotals = Shipment & {
  totalCost: number;
  totalSent: number;
  totalReturned: number;
  totalMissing: number;
};

export type DashboardMetrics = {
  monthKey: string;
  totalSent: number;
  totalReturned: number;
  totalMissing: number;
  totalCost: number;
  productBreakdown: Array<{
    productId: string;
    productName: string;
    quantitySent: number;
    quantityReturned: number;
    totalCost: number;
  }>;
  dailyTotals: Array<{
    date: string;
    sent: number;
    returned: number;
    missing: number;
    cost: number;
  }>;
};

const toMonthKey = (isoDate: string) => isoDate.slice(0, 7);

const getProductMap = (products: Product[]) =>
  products.reduce<Record<string, Product>>((acc, product) => {
    acc[product.id] = product;
    return acc;
  }, {});

export const enhanceShipment = (shipment: Shipment, products: Product[]): ShipmentWithTotals => {
  const productMap = getProductMap(products);

  let totalCost = 0;
  let totalSent = 0;
  let totalReturned = 0;

  shipment.items.forEach((item) => {
    const product = productMap[item.productId];
    const unitPrice = product?.pricePerUnit ?? 0;

    totalSent += item.quantitySent;
    totalReturned += item.quantityReturned;
    totalCost += item.quantitySent * unitPrice;
  });

  return {
    ...shipment,
    totalCost,
    totalSent,
    totalReturned,
    totalMissing: Math.max(totalSent - totalReturned, 0),
  };
};

export const filterShipmentsByMonth = (shipments: Shipment[], monthKey: string) =>
  shipments.filter((shipment) => toMonthKey(shipment.sentAt) === monthKey);

export const deriveDashboardMetrics = (
  shipments: Shipment[],
  products: Product[],
  monthKey: string,
): DashboardMetrics => {
  const shipmentTotals = filterShipmentsByMonth(shipments, monthKey).map((shipment) =>
    enhanceShipment(shipment, products),
  );
  const productMap = getProductMap(products);

  const productBreakdown = new Map<
    string,
    {
      productId: string;
      productName: string;
      quantitySent: number;
      quantityReturned: number;
      totalCost: number;
    }
  >();

  const dailyTotals = new Map<string, { sent: number; returned: number; cost: number }>();

  shipmentTotals.forEach((shipment) => {
    shipment.items.forEach((item) => {
      const product = productMap[item.productId];
      const unitPrice = product?.pricePerUnit ?? 0;
      const cost = item.quantitySent * unitPrice;

      if (!productBreakdown.has(item.productId)) {
        productBreakdown.set(item.productId, {
          productId: item.productId,
          productName: product?.name ?? 'Produto removido',
          quantitySent: 0,
          quantityReturned: 0,
          totalCost: 0,
        });
      }

      const aggregate = productBreakdown.get(item.productId)!;
      aggregate.quantitySent += item.quantitySent;
      aggregate.quantityReturned += item.quantityReturned;
      aggregate.totalCost += cost;
    });

    if (!dailyTotals.has(shipment.sentAt)) {
      dailyTotals.set(shipment.sentAt, { sent: 0, returned: 0, cost: 0 });
    }

    const daily = dailyTotals.get(shipment.sentAt)!;
    daily.sent += shipment.totalSent;
    daily.returned += shipment.totalReturned;
    daily.cost += shipment.totalCost;
  });

  const totals = shipmentTotals.reduce(
    (acc, shipment) => {
      acc.totalSent += shipment.totalSent;
      acc.totalReturned += shipment.totalReturned;
      acc.totalMissing += shipment.totalMissing;
      acc.totalCost += shipment.totalCost;
      return acc;
    },
    {
      totalSent: 0,
      totalReturned: 0,
      totalMissing: 0,
      totalCost: 0,
    },
  );

  return {
    monthKey,
    totalSent: totals.totalSent,
    totalReturned: totals.totalReturned,
    totalMissing: totals.totalMissing,
    totalCost: totals.totalCost,
    productBreakdown: Array.from(productBreakdown.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName, 'pt-BR', { sensitivity: 'base' }),
    ),
    dailyTotals: Array.from(dailyTotals.entries())
      .map(([date, value]) => ({
        date,
        sent: value.sent,
        returned: value.returned,
        missing: Math.max(value.sent - value.returned, 0),
        cost: value.cost,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
};
