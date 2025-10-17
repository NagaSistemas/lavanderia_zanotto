import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  type LaundryState,
  type Product,
  type ProductPayload,
  type Shipment,
  type ShipmentPayload,
} from '../types';

type LaundryContextValue = {
  state: LaundryState;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addProduct: (payload: ProductPayload) => Promise<void>;
  updateProduct: (id: string, payload: ProductPayload) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  addShipment: (payload: ShipmentPayload) => Promise<void>;
  updateShipmentReturn: (
    shipmentId: string,
    lineId: string,
    quantityReturned: number,
  ) => Promise<void>;
  removeShipment: (shipmentId: string) => Promise<void>;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

const LaundryContext = createContext<LaundryContextValue | undefined>(undefined);

const initialState: LaundryState = {
  products: [],
  shipments: [],
};

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

export const LaundryProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading, getToken } = useAuth();
  const [state, setState] = useState<LaundryState>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authorizedRequest = useCallback(
    async <T,>(path: string, options: RequestInit = {}) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Sessao expirada. Faca login novamente.');
      }

      const headers = new Headers(options.headers);
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      headers.set('Accept', 'application/json');
      headers.set('Authorization', `Bearer ${token}`);

      const response = await fetch(buildUrl(path), {
        ...options,
        headers,
      });

      if (response.status === 204) {
        return null as T;
      }

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          (payload && (payload.message as string)) ||
          `Erro na requisicao (${response.status})`;
        throw new Error(message);
      }

      return payload as T;
    },
    [getToken],
  );

  const refresh = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setState(initialState);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const [products, shipments] = await Promise.all([
        authorizedRequest<Product[]>('/api/products'),
        authorizedRequest<Shipment[]>('/api/shipments'),
      ]);
      setState({
        products,
        shipments,
      });
      setError(null);
    } catch (requestError) {
      console.error('Erro ao carregar dados da lavanderia', requestError);
      setError(
        requestError instanceof Error ? requestError.message : 'Falha ao carregar dados',
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, authorizedRequest]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addProduct = useCallback(
    async (payload: ProductPayload) => {
      const product = await authorizedRequest<Product>('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setState((prev) => ({
        ...prev,
        products: [...prev.products, product].sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
        ),
      }));
    },
    [authorizedRequest],
  );

  const updateProduct = useCallback(
    async (id: string, payload: ProductPayload) => {
      const updated = await authorizedRequest<Product>(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setState((prev) => ({
        ...prev,
        products: prev.products
          .map((product) => (product.id === id ? updated : product))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
      }));
    },
    [authorizedRequest],
  );

  const removeProduct = useCallback(
    async (id: string) => {
      await authorizedRequest<void>(`/api/products/${id}`, {
        method: 'DELETE',
      });
      setState((prev) => {
        const products = prev.products.filter((product) => product.id !== id);
        const shipments = prev.shipments
          .map((shipment) => ({
            ...shipment,
            items: shipment.items.filter((item) => item.productId !== id),
          }))
          .filter((shipment) => shipment.items.length > 0);
        return { products, shipments };
      });
    },
    [authorizedRequest],
  );

  const addShipment = useCallback(
    async (payload: ShipmentPayload) => {
      const shipment = await authorizedRequest<Shipment>('/api/shipments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setState((prev) => ({
        ...prev,
        shipments: [shipment, ...prev.shipments].sort((a, b) =>
          b.sentAt.localeCompare(a.sentAt),
        ),
      }));
    },
    [authorizedRequest],
  );

  const updateShipmentReturn = useCallback(
    async (shipmentId: string, lineId: string, quantityReturned: number) => {
      const shipment = await authorizedRequest<Shipment>(`/api/shipments/${shipmentId}/returns`, {
        method: 'PATCH',
        body: JSON.stringify({
          updates: [{ lineId, quantityReturned }],
        }),
      });
      setState((prev) => ({
        ...prev,
        shipments: prev.shipments.map((item) => (item.id === shipment.id ? shipment : item)),
      }));
    },
    [authorizedRequest],
  );

  const removeShipment = useCallback(
    async (shipmentId: string) => {
      await authorizedRequest<void>(`/api/shipments/${shipmentId}`, {
        method: 'DELETE',
      });
      setState((prev) => ({
        ...prev,
        shipments: prev.shipments.filter((shipment) => shipment.id !== shipmentId),
      }));
    },
    [authorizedRequest],
  );

  const value = useMemo<LaundryContextValue>(
    () => ({
      state,
      loading,
      error,
      refresh,
      addProduct,
      updateProduct,
      removeProduct,
      addShipment,
      updateShipmentReturn,
      removeShipment,
    }),
    [
      state,
      loading,
      error,
      refresh,
      addProduct,
      updateProduct,
      removeProduct,
      addShipment,
      updateShipmentReturn,
      removeShipment,
    ],
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
