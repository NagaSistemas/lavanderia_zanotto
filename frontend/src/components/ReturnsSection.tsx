import { useMemo, useState } from 'react';
import { useLaundry } from '../context/LaundryContext';
import type { ProductReturnResult } from '../types';
import { formatDate } from '../utils/format';

const getToday = () => new Date().toISOString().slice(0, 10);

export const ReturnsSection = () => {
  const {
    state: { products, shipments, returnTickets },
    updateShipmentReturn,
    applyReturnByProduct,
  } = useLaundry();

  const [draftReturns, setDraftReturns] = useState<Record<string, Record<string, number>>>({});
  const [returnInputs, setReturnInputs] = useState<Record<string, string>>({});
  const [returnDate, setReturnDate] = useState<string>(getToday());
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [returnResults, setReturnResults] = useState<ProductReturnResult[] | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnSubmitting, setReturnSubmitting] = useState<boolean>(false);

  const ticketList = useMemo(
    () =>
      [...returnTickets].sort((a, b) => {
        const byPending = b.pendingReturn - a.pendingReturn;
        if (byPending !== 0) return byPending;
        return a.productName.localeCompare(b.productName, 'pt-BR', { sensitivity: 'base' });
      }),
    [returnTickets],
  );

  const totalPendingPieces = useMemo(
    () => ticketList.reduce((acc, ticket) => acc + ticket.pendingReturn, 0),
    [ticketList],
  );

  const productNameById = useMemo(
    () => new Map(products.map((product) => [product.id, product.name])),
    [products],
  );

  const getDraftQuantity = (shipmentId: string, lineId: string, fallback: number) =>
    draftReturns[shipmentId]?.[lineId] ?? fallback;

  const setDraftQuantity = (shipmentId: string, lineId: string, nextQuantity: number) => {
    setDraftReturns((prev) => {
      const shipmentDraft = prev[shipmentId] ?? {};
      return { ...prev, [shipmentId]: { ...shipmentDraft, [lineId]: nextQuantity } };
    });
  };

  const clearDraftForShipment = (shipmentId: string) => {
    setDraftReturns((prev) => {
      const next = { ...prev };
      delete next[shipmentId];
      return next;
    });
  };

  const handleReturnInputChange = (productId: string, value: string) => {
    if (value === '') {
      setReturnInputs((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      return;
    }

    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return;
    }

    setReturnInputs((prev) => ({ ...prev, [productId]: value }));
  };

  const fillPendingForProduct = (productId: string, pending: number) => {
    setReturnInputs((prev) => ({ ...prev, [productId]: String(Math.max(0, pending)) }));
  };

  const resetReturnForm = () => {
    setReturnInputs({});
    setReturnNotes('');
    setReturnError(null);
  };

  const selectedReturnTotal = useMemo(
    () =>
      Object.values(returnInputs).reduce((acc, value) => {
        const parsed = Number.parseInt(value, 10);
        return acc + (Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
      }, 0),
    [returnInputs],
  );

  const handleSubmitReturnByProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const updates = Object.entries(returnInputs)
      .map(([productId, value]) => ({
        productId,
        quantity: Number.parseInt(value, 10),
      }))
      .filter((item) => item.quantity > 0);

    if (updates.length === 0) {
      setReturnError('Informe ao menos um item com quantidade maior que zero.');
      return;
    }

    setReturnSubmitting(true);
    setReturnError(null);
    setReturnResults(null);
    try {
      const response = await applyReturnByProduct(
        updates.map((item) => ({
          ...item,
          occurredAt: returnDate || undefined,
          notes: returnNotes.trim() || undefined,
        })),
      );
      setReturnResults(response.results);
      resetReturnForm();
    } catch (error) {
      setReturnError(error instanceof Error ? error.message : 'Falha ao registrar retorno agregado.');
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleReturnChange = (shipmentId: string, lineId: string, value: string, max: number) => {
    const quantity = Number.parseInt(value || '0', 10);
    if (Number.isNaN(quantity) || quantity < 0) {
      return;
    }
    setDraftQuantity(shipmentId, lineId, Math.min(quantity, max));
  };

  const handleSaveReturns = async (shipmentId: string) => {
    const shipment = shipments.find((item) => item.id === shipmentId);
    if (!shipment) {
      setReturnError('Envio não encontrado.');
      return;
    }

    const draft = draftReturns[shipmentId] ?? {};
    const updates = shipment.items
      .map((item) => {
        const draftValue = draft[item.id];
        if (draftValue === undefined || draftValue === item.quantityReturned) {
          return null;
        }
        return {
          lineId: item.id,
          quantityReturned: Math.min(Math.max(draftValue, 0), item.quantitySent),
        };
      })
      .filter(Boolean) as Array<{ lineId: string; quantityReturned: number }>;

    if (updates.length === 0) {
      return;
    }

    try {
      await updateShipmentReturn(shipmentId, updates);
      clearDraftForShipment(shipmentId);
    } catch (error) {
      setReturnError(error instanceof Error ? error.message : 'Falha ao salvar retornos.');
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-3 pb-6 sm:px-4 lg:px-0">
      <div className="space-y-4 sm:space-y-6">
        <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200 sm:rounded-3xl sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl md:text-2xl">
                Retornos da lavanderia
              </h2>
              <p className="text-sm text-slate-600">
                Consolide retornos por tipo de peça e registre devoluções dos envios de uma só vez.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
              <StatBadge label="Pecas pendentes" value={totalPendingPieces.toLocaleString('pt-BR')} muted={totalPendingPieces === 0} />
              <StatBadge label="Itens com pendencia" value={ticketList.filter((t) => t.pendingReturn > 0).length.toString()} muted={totalPendingPieces === 0} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Ficha única por tipo de peça
              </h3>
              <p className="text-sm text-slate-600">
                Some retornos pelo tipo de item. Cada lançamento é abatido do saldo pendente (FIFO).
              </p>
            </div>
          </div>

          {ticketList.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-sm text-slate-600 sm:px-6">
              Nenhum envio registrado ainda. Assim que houver envios, esta ficha consolida os saldos por tipo de peça.
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleSubmitReturnByProduct}>
              <div className="space-y-3">
                {ticketList.map((ticket) => (
                  <div
                    key={ticket.productId}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm transition hover:border-primary/30 sm:p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{ticket.productName}</p>
                          {ticket.category ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {ticket.category}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 font-semibold shadow-sm">
                            Enviadas: {ticket.totalSent.toLocaleString('pt-BR')}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 font-semibold shadow-sm">
                            Retornadas: {ticket.totalReturned.toLocaleString('pt-BR')}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold shadow-sm ${
                              ticket.pendingReturn > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            Pendentes: {ticket.pendingReturn.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={returnInputs[ticket.productId] ?? ''}
                          onChange={(event) => handleReturnInputChange(ticket.productId, event.target.value)}
                          placeholder="Qtd. retorno"
                          className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <button
                          type="button"
                          onClick={() => fillPendingForProduct(ticket.productId, ticket.pendingReturn)}
                          className="inline-flex items-center justify-center rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
                          disabled={ticket.pendingReturn === 0}
                        >
                          Preencher pendente
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                      {ticket.shipments.map((shipment) => (
                        <div
                          key={shipment.shipmentId}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                        >
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                            <span>Envio {formatDate(shipment.sentAt)}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 ${
                                shipment.quantityPending > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              Pend. {shipment.quantityPending}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Enviado {shipment.quantitySent} • Retornado {shipment.quantityReturned}
                          </div>
                          {shipment.notes ? (
                            <div className="mt-1 truncate text-[11px] text-slate-500">Obs: {shipment.notes}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr)),200px]">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Data do retorno
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(event) => setReturnDate(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Observações (opcional)
                  </label>
                  <input
                    type="text"
                    value={returnNotes}
                    onChange={(event) => setReturnNotes(event.target.value)}
                    placeholder="Ex.: retorno parcial, confirmado pela lavanderia..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  Total a registrar:{' '}
                  <span className="text-slate-900">{selectedReturnTotal.toLocaleString('pt-BR')} pecas</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-500">
                  Os retornos serão aplicados do envio mais antigo para o mais recente, até zerar o saldo pendente.
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="button"
                    onClick={resetReturnForm}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Limpar selecionados
                  </button>
                  <button
                    type="submit"
                    disabled={returnSubmitting || selectedReturnTotal === 0}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {returnSubmitting ? 'Registrando...' : 'Registrar retorno agregado'}
                  </button>
                </div>
              </div>

              {returnError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {returnError}
                </p>
              ) : null}

              {returnResults && (
                <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700">
                  <p className="text-sm font-semibold text-slate-900">Resultado aplicado</p>
                  <div className="mt-2 space-y-2">
                    {returnResults.map((result) => (
                      <div
                        key={result.productId}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div className="font-semibold text-slate-900">
                            {productNameById.get(result.productId) ?? 'Produto removido'}
                          </div>
                          <div className="text-slate-600">
                            Aplicado {result.applied} / Solicitado {result.requested} (restam {result.remaining})
                          </div>
                        </div>
                        {result.warning ? (
                          <div className="mt-1 text-amber-700">Aviso: {result.warning}</div>
                        ) : null}
                        {result.allocations.length > 0 ? (
                          <div className="mt-1 text-[11px] text-slate-500">
                            {result.allocations.map((allocation) => (
                              <span key={`${allocation.shipmentId}-${allocation.lineId}`} className="mr-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 shadow-sm">
                                Envio {allocation.shipmentId.slice(0, 6)} • +{allocation.applied} (pend. {allocation.pendingAfter})
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Retornos por envio
            </h3>
            <p className="text-sm text-slate-600">
              Ajuste retornos de cada envio e confirme de uma só vez.
            </p>
          </div>

          <div className="mt-4 space-y-4">
            {shipments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500 sm:rounded-2xl">
                Nenhum envio registrado ainda.
              </div>
            ) : (
              shipments.map((shipment) => {
                const shipmentDraft = draftReturns[shipment.id] ?? {};
                const hasDraftChanges = shipment.items.some(
                  (item) => shipmentDraft[item.id] !== undefined && shipmentDraft[item.id] !== item.quantityReturned,
                );
                return (
                  <article
                    key={shipment.id}
                    className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:rounded-3xl sm:p-5"
                  >
                    <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                          Envio {formatDate(shipment.sentAt)}
                        </span>
                        {shipment.expectedReturnAt ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            Retorno previsto: {formatDate(shipment.expectedReturnAt)}
                          </span>
                        ) : null}
                        {shipment.notes ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600">
                            {shipment.notes}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-500">
                        {shipment.items.length} itens • {shipment.items.reduce((sum, item) => sum + item.quantitySent, 0)} peças
                      </div>
                    </header>

                    <div className="mt-3 space-y-3">
                      {shipment.items.map((item) => {
                        const displayReturned = getDraftQuantity(
                          shipment.id,
                          item.id,
                          item.quantityReturned,
                        );
                        const product = products.find((p) => p.id === item.productId);
                        return (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex sm:items-center sm:justify-between"
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-slate-900">
                                {product?.name ?? 'Produto removido'}
                              </p>
                              <p className="text-xs text-slate-500">
                                Enviadas: {item.quantitySent} • Retornadas: {item.quantityReturned} • Pendentes: {Math.max(item.quantitySent - item.quantityReturned, 0)}
                              </p>
                            </div>
                            <div className="mt-3 flex items-center justify-center gap-2 sm:mt-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleReturnChange(
                                    shipment.id,
                                    item.id,
                                    Math.max(0, displayReturned - 1).toString(),
                                    item.quantitySent,
                                  )
                                }
                                disabled={displayReturned <= 0}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                              >
                                -
                              </button>
                              <div className="w-12 text-center text-sm font-semibold text-slate-900">
                                {displayReturned}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleReturnChange(
                                    shipment.id,
                                    item.id,
                                    Math.min(item.quantitySent, displayReturned + 1).toString(),
                                    item.quantitySent,
                                  )
                                }
                                disabled={displayReturned >= item.quantitySent}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-slate-500">
                        Ajuste os valores e salve para enviar ao backend.
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveReturns(shipment.id)}
                        disabled={!hasDraftChanges}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
                      >
                        Registrar retorno do envio
                      </button>
                    </div>
                  </article>
                );
              })
            )}
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
