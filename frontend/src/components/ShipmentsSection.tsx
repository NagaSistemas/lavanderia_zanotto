import { useMemo, useState } from 'react';
import { useLaundry } from '../context/LaundryContext';
import { enhanceShipment } from '../lib/metrics';
import type { ShipmentPayload } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

type FormLine = {
  id: string;
  productId: string;
  quantitySent: string;
};

const createFormLine = (): FormLine => ({
  id: `line-${Math.random().toString(36).slice(2)}`,
  productId: '',
  quantitySent: '0',
});

const getToday = () => new Date().toISOString().slice(0, 10);

export const ShipmentsSection = () => {
  const {
    state: { products, shipments },
    addShipment,
    updateShipmentReturn,
    removeShipment,
  } = useLaundry();

  const [sentAt, setSentAt] = useState<string>(getToday());
  const [expectedReturnAt, setExpectedReturnAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [lines, setLines] = useState<FormLine[]>([createFormLine()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingReturnId, setUpdatingReturnId] = useState<string | null>(null);

  const hasProducts = products.length > 0;

  const shipmentDetails = useMemo(
    () => shipments.map((shipment) => enhanceShipment(shipment, products)),
    [shipments, products],
  );

  const formTotalCost = useMemo(() => {
    const priceMap = new Map(products.map((product) => [product.id, product.pricePerUnit]));
    return lines.reduce((acc, line) => {
      const quantity = Number.parseInt(line.quantitySent, 10);
      if (!line.productId || Number.isNaN(quantity)) {
        return acc;
      }
      const price = priceMap.get(line.productId) ?? 0;
      return acc + quantity * price;
    }, 0);
  }, [lines, products]);

  const handleLineChange = (lineId: string, field: keyof FormLine, value: string) => {
    setLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, [field]: value } : line)));
  };

  const adjustLineQuantity = (lineId: string, delta: number) => {
    setLines((previousLines) =>
      previousLines.map((line) => {
        if (line.id !== lineId) {
          return line;
        }

        const currentQuantity = Number.parseInt(line.quantitySent || '0', 10);
        const nextQuantity = Number.isFinite(currentQuantity) ? Math.max(0, currentQuantity + delta) : 0;

        return {
          ...line,
          quantitySent: String(nextQuantity),
        };
      }),
    );
  };

  const handleRemoveLine = (lineId: string) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.id !== lineId) : prev));
  };

  const resetForm = () => {
    setSentAt(getToday());
    setExpectedReturnAt('');
    setNotes('');
    setLines([createFormLine()]);
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasProducts) {
      setFormError('Cadastre ao menos um produto antes de registrar envios.');
      return;
    }

    const items = lines
      .map((line) => ({
        productId: line.productId,
        quantitySent: Number.parseInt(line.quantitySent, 10),
      }))
      .filter(
        (item) =>
          item.productId &&
          Number.isFinite(item.quantitySent) &&
          item.quantitySent > 0,
      );

    if (items.length === 0) {
      setFormError('Adicione pelo menos um item com quantidade valida.');
      return;
    }

    const payload: ShipmentPayload = {
      sentAt,
      expectedReturnAt: expectedReturnAt || undefined,
      notes: notes.trim() || undefined,
      items,
    };

    setIsSubmitting(true);
    setFormError(null);
    try {
      await addShipment(payload);
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Falha ao registrar envio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnChange = async (shipmentId: string, lineId: string, value: string) => {
    const quantity = Number.parseInt(value || '0', 10);
    if (Number.isNaN(quantity) || quantity < 0) {
      return;
    }

    setUpdatingReturnId(lineId);
    try {
      await updateShipmentReturn(shipmentId, lineId, quantity);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Falha ao atualizar retorno.');
    } finally {
      setUpdatingReturnId(null);
    }
  };

  const handleRemoveShipment = async (shipmentId: string) => {
    setRemovingId(shipmentId);
    setFormError(null);
    try {
      await removeShipment(shipmentId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Falha ao remover envio.');
    } finally {
      setRemovingId(null);
    }
  };

  const totalShipments = shipmentDetails.length;
  const totalSent = shipmentDetails.reduce((acc, shipment) => acc + shipment.totalSent, 0);
  const totalMissing = shipmentDetails.reduce((acc, shipment) => acc + shipment.totalMissing, 0);
  const totalCost = shipmentDetails.reduce((acc, shipment) => acc + shipment.totalCost, 0);

  return (
    <section
      aria-labelledby="shipments-section"
      className="mx-auto w-full max-w-5xl px-3 pb-6 sm:px-4 lg:px-0"
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200 sm:rounded-3xl sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 id="shipments-section" className="text-lg font-semibold text-slate-900 sm:text-xl md:text-2xl">
                Controle de envios
              </h2>
              <p className="text-sm text-slate-600">
                Registre os lotes enviados para a lavanderia, acompanhe retornos e mantenha o histórico organizado. As informações alimentam relatórios financeiros e alertas operacionais.
              </p>
            </div>
            <div className="grid gap-2 grid-cols-2 sm:gap-3 lg:grid-cols-4">
              <StatBadge label="Envios registrados" value={totalShipments.toString()} />
              <StatBadge label="Pecas enviadas" value={totalSent.toLocaleString('pt-BR')} />
              <StatBadge label="Pecas pendentes" value={totalMissing.toLocaleString('pt-BR')} muted={totalMissing === 0} />
              <StatBadge label="Custo acumulado" value={formatCurrency(totalCost)} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 2xl:grid-cols-[minmax(0,420px),1fr]">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-white to-white p-4 shadow-sm ring-1 ring-primary/10 sm:rounded-3xl sm:p-6">
            <header className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Registrar novo envio</h3>
              <p className="text-xs text-slate-600">
                Informe data, itens e quantidades para o lote que sera enviado. Os custos sao calculados automaticamente.
              </p>
            </header>

            <form className="mt-4 space-y-4 sm:mt-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="sent-at" className="text-sm font-semibold text-slate-700">
                    Data de envio
                  </label>
                  <input
                    id="sent-at"
                    type="date"
                    value={sentAt}
                    onChange={(event) => setSentAt(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="expected-return" className="text-sm font-semibold text-slate-700">
                    Previsao de retorno
                  </label>
                  <input
                    id="expected-return"
                    type="date"
                    value={expectedReturnAt}
                    onChange={(event) => setExpectedReturnAt(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-semibold text-slate-700">
                  Observacoes (opcional)
                </label>
                <input
                  id="notes"
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Ex.: Lote semanal, prioridade alta..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Itens do envio</span>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => [...prev, createFormLine()])}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white shadow transition hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:h-9 sm:w-9"
                    aria-label="Adicionar item"
                  >
                    +
                  </button>
                </div>

                <div className="space-y-3">
                  {lines.map((line, index) => {
                    const parsedQuantity = Number.parseInt(line.quantitySent || '0', 10);
                    const quantity = Number.isFinite(parsedQuantity) && parsedQuantity >= 0 ? parsedQuantity : 0;

                    return (
                      <div
                        key={line.id}
                        className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm transition hover:border-primary/40 sm:rounded-2xl sm:p-4"
                      >
                        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr),160px,auto] sm:items-end">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Produto {index + 1}
                            </label>
                            <select
                              value={line.productId}
                              onChange={(event) =>
                                handleLineChange(line.id, 'productId', event.target.value)
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                              required
                            >
                              <option value="" disabled>
                                Selecione um produto
                              </option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} - {formatCurrency(product.pricePerUnit)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Quantidade
                            </label>
                            <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-2 py-1 sm:inline-flex sm:w-auto sm:justify-center">
                              <button
                                type="button"
                                aria-label="Remover uma unidade"
                                onClick={() => adjustLineQuantity(line.id, -1)}
                                disabled={quantity === 0}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-lg font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9"
                              >
                                -
                              </button>
                              <span className="min-w-[2.5rem] text-center text-sm font-semibold text-slate-900 sm:text-base">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                aria-label="Adicionar uma unidade"
                                onClick={() => adjustLineQuantity(line.id, 1)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-lg font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:h-9 sm:w-9"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.id)}
                            disabled={lines.length === 1}
                            className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-10"
                            aria-label="Remover item"
                          >
                            <svg
                              className="h-5 w-5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
                              <path d="M18 6v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Total estimado do envio:{' '}
                  <strong className="text-slate-900">{formatCurrency(formTotalCost)}</strong>
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-60"
                >
                  {isSubmitting ? 'Registrando...' : 'Registrar envio'}
                </button>
              </div>

              {formError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {formError}
                </p>
              ) : null}
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm sm:rounded-3xl">
            <header className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Historico de envios
                </h3>
                <p className="text-sm text-slate-600">
                  Monitore retornos, faltas e custos por lote. Atualize os volumes retornados conforme a lavanderia devolve os itens.
                </p>
              </div>
            </header>

            <div className="space-y-4 px-3 py-4 sm:px-6 sm:py-6">
              {shipmentDetails.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500 sm:rounded-2xl">
                  Nenhum envio registrado ainda. Utilize o formulario ao lado para iniciar o controle.
                </div>
              ) : (
                shipmentDetails.map((shipment) => (
                  <article
                    key={shipment.id}
                    className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:border-primary/40 sm:rounded-2xl sm:p-5"
                  >
                    <header className="flex flex-col gap-3 border-b border-slate-100 pb-4 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-primary sm:px-3">
                          Envio {formatDate(shipment.sentAt)}
                        </span>
                        {shipment.expectedReturnAt ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 sm:px-3">
                            Retorno: {formatDate(shipment.expectedReturnAt)}
                          </span>
                        ) : null}
                        {shipment.notes ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-600 sm:px-3">
                            {shipment.notes}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveShipment(shipment.id)}
                        disabled={removingId === shipment.id}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 sm:px-3"
                      >
                        {removingId === shipment.id ? 'Removendo...' : 'Apagar envio'}
                      </button>
                    </header>

                    <div className="mt-4 -mx-4 sm:mx-0 sm:overflow-hidden sm:rounded-xl sm:border sm:border-slate-100">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-sm">
                          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <tr>
                              <th scope="col" className="px-2 py-2 sm:px-4">
                                Item
                              </th>
                              <th scope="col" className="px-2 py-2 text-right sm:px-4">
                                Env.
                              </th>
                              <th scope="col" className="px-2 py-2 text-right sm:px-4">
                                Retorno
                              </th>
                              <th scope="col" className="px-2 py-2 text-right sm:px-4">
                                Custo
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {shipment.items.map((item) => {
                              const product = products.find((productItem) => productItem.id === item.productId);
                              const price = product?.pricePerUnit ?? 0;
                              const lineCost = item.quantitySent * price;
                              return (
                                <tr key={item.id} className="transition hover:bg-slate-50/60">
                                  <td className="px-2 py-2 text-xs font-semibold text-slate-900 sm:px-4 sm:text-sm">
                                    <div className="truncate max-w-[80px] sm:max-w-none">{product?.name ?? 'Produto removido'}</div>
                                  </td>
                                  <td className="px-2 py-2 text-right text-slate-600 sm:px-4">
                                    {item.quantitySent}
                                  </td>
                                  <td className="px-2 py-2 text-right sm:px-4">
                                    <div className="flex flex-col items-end gap-1">
                                      <input
                                        type="number"
                                        min={0}
                                        max={item.quantitySent}
                                        value={item.quantityReturned}
                                        onChange={(event) =>
                                          handleReturnChange(
                                            shipment.id,
                                            item.id,
                                            event.target.value,
                                          )
                                        }
                                        className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-right text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 sm:w-20 sm:text-sm"
                                      />
                                      {updatingReturnId === item.id ? (
                                        <span className="text-xs text-slate-500">Salvando...</span>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className="px-2 py-2 text-right text-slate-900 sm:px-4">
                                    <div className="truncate max-w-[60px] sm:max-w-none">{formatCurrency(lineCost)}</div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <footer className="mt-4 grid gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-600 sm:px-4 sm:text-sm md:grid-cols-2 xl:grid-cols-4">
                      <span>
                        Total enviado:{' '}
                        <strong className="text-slate-900">{shipment.totalSent} pecas</strong>
                      </span>
                      <span>
                        Retorno:{' '}
                        <strong className="text-slate-900">{shipment.totalReturned} pecas</strong>
                      </span>
                      <span>
                        Faltantes:{' '}
                        <strong className={shipment.totalMissing > 0 ? 'text-amber-600' : 'text-slate-900'}>
                          {shipment.totalMissing} pecas
                        </strong>
                      </span>
                      <span>
                        Custo do envio:{' '}
                        <strong className="text-slate-900">{formatCurrency(shipment.totalCost)}</strong>
                      </span>
                    </footer>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

type StatBadgeProps = {
  label: string;
  value: string;
  muted?: boolean;
};

const StatBadge = ({ label, value, muted = false }: StatBadgeProps) => (
  <div
    className={`rounded-2xl border border-slate-200 px-4 py-3 shadow-sm ${
      muted ? 'bg-slate-50/80 text-slate-500' : 'bg-white text-slate-900'
    }`}
  >
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-sm font-semibold">{value}</p>
  </div>
);
