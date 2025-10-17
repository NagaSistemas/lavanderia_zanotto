import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  type LaundryState,
  type Product,
  type ProductPayload,
  type Shipment,
  type ShipmentPayload,
  type ShipmentLine,
} from '../types';

type LaundryContextValue = {
  state: LaundryState;
  addProduct: (payload: ProductPayload) => void;
  updateProduct: (id: string, payload: ProductPayload) => void;
  removeProduct: (id: string) => void;
  addShipment: (payload: ShipmentPayload) => void;
  updateShipmentReturn: (
    shipmentId: string,
    lineId: string,
    quantityReturned: number,
  ) => void;
  removeShipment: (shipmentId: string) => void;
};

const STORAGE_KEY = 'lavanderia-control-state';

const LaundryContext = createContext<LaundryContextValue | undefined>(undefined);

const defaultState: LaundryState = {
  products: [],
  shipments: [],
};

const isBrowser = typeof window !== 'undefined';

const generateId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}${Date.now()}`;

const loadState = (): LaundryState => {
  if (!isBrowser) {
    return defaultState;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultState;
    }

    const parsed = JSON.parse(stored) as LaundryState;
    return {
      products: parsed.products ?? [],
      shipments: parsed.shipments ?? [],
    };
  } catch (error) {
    console.error('Erro ao carregar estado da lavanderia', error);
    return defaultState;
  }
};

const persistState = (state: LaundryState) => {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Erro ao salvar estado da lavanderia', error);
  }
};

const withTimestamps = <T extends object>(data: T, previous?: { createdAt: string }) => {
  const now = new Date().toISOString();
  return {
    ...data,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
};

export const LaundryProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<LaundryState>(() => loadState());

  useEffect(() => {
    persistState(state);
  }, [state]);

  const actions = useMemo(() => {
    const addProduct = (payload: ProductPayload) => {
      const next: Product = withTimestamps({
        id: generateId(),
        ...payload,
      });

      setState((prev) => ({
        ...prev,
        products: [...prev.products, next].sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
        ),
      }));
    };

    const updateProduct = (id: string, payload: ProductPayload) => {
      setState((prev) => ({
        ...prev,
        products: prev.products
          .map((product) =>
            product.id === id ? { ...withTimestamps({ ...product, ...payload }, product) } : product,
          )
          .sort((a, b) =>
            a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
          ),
      }));
    };

    const removeProduct = (id: string) => {
      setState((prev) => ({
        ...prev,
        products: prev.products.filter((product) => product.id !== id),
        shipments: prev.shipments.map((shipment) => ({
          ...shipment,
          items: shipment.items.filter((item) => item.productId !== id),
        })),
      }));
    };

    const addShipment = (payload: ShipmentPayload) => {
      const items: ShipmentLine[] = payload.items.map((item) => ({
        id: generateId(),
        productId: item.productId,
        quantitySent: item.quantitySent,
        quantityReturned: 0,
      }));

      const shipment: Shipment = withTimestamps({
        id: generateId(),
        sentAt: payload.sentAt,
        expectedReturnAt: payload.expectedReturnAt,
        notes: payload.notes,
        items,
      });

      setState((prev) => ({
        ...prev,
        shipments: [shipment, ...prev.shipments].sort((a, b) =>
          b.sentAt.localeCompare(a.sentAt),
        ),
      }));
    };

    const updateShipmentReturn = (
      shipmentId: string,
      lineId: string,
      quantityReturned: number,
    ) => {
      setState((prev) => ({
        ...prev,
        shipments: prev.shipments.map((shipment) => {
          if (shipment.id !== shipmentId) {
            return shipment;
          }

          const updatedItems = shipment.items.map((item) =>
            item.id === lineId
              ? {
                  ...item,
                  quantityReturned: Math.min(
                    Math.max(quantityReturned, 0),
                    item.quantitySent,
                  ),
                }
              : item,
          );

          return {
            ...withTimestamps({ ...shipment, items: updatedItems }, shipment),
          };
        }),
      }));
    };

    const removeShipment = (shipmentId: string) => {
      setState((prev) => ({
        ...prev,
        shipments: prev.shipments.filter((shipment) => shipment.id !== shipmentId),
      }));
    };

    return {
      addProduct,
      updateProduct,
      removeProduct,
      addShipment,
      updateShipmentReturn,
      removeShipment,
    };
  }, []);

  const value = useMemo<LaundryContextValue>(
    () => ({
      state,
      ...actions,
    }),
    [state, actions],
  );

  return <LaundryContext.Provider value={value}>{children}</LaundryContext.Provider>;
};

export const useLaundry = () => {
  const context = useContext(LaundryContext);
  if (!context) {
    throw new Error('useLaundry deve ser usado dentro de LaundryProvider');
  }
  return context;
};
