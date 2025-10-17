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

const newLine = (): FormLine => ({
  id: `line-${Math.random().toString(36).slice(2)}`,
  productId: '',
  quantitySent: '',
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
  const [lines, setLines] = useState<FormLine[]>([newLine()]);
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleRemoveLine = (lineId: string) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.id !== lineId) : prev));
  };

  const resetForm = () => {
    setSentAt(getToday());
    setExpectedReturnAt('');
    setNotes('');
    setLines([newLine()]);
    setFormError(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasProducts) {
      setFormError('Cadastre pelo menos um produto antes de registrar envios.');
      return;
    }

    const items = lines
      .map((line) => ({
        productId: line.productId,
        quantitySent: Number.parseInt(line.quantitySent, 10),
      }))
      .filter((item) => item.productId && Number.isFinite(item.quantitySent) && item.quantitySent > 0);

    if (items.length === 0) {
      setFormError('Adicione pelo menos um item com quantidade válida.');
      return;
    }

    const payload: ShipmentPayload = {
      sentAt,
      expectedReturnAt: expectedReturnAt || undefined,
      notes: notes.trim() || undefined,
      items,
    };

    addShipment(payload);
    resetForm();
  };

  return (
    <section aria-labelledby="shipments-section">
      <div className="flex flex-col gap-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <header className="flex flex-col gap-2">
          <h2 id="shipments-section" className="text-lg font-semibold text-slate-900">
            Controle de Envios
          </h2>
          <p className="text-sm text-slate-600">
            Registre cada lote enviado para a lavanderia. Ao registrar o retorno, você acompanha
            itens faltantes e o custo por envio.
          </p>
        </header>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="sent-at" className="text-sm font-medium text-slate-700">
                Data de envio
              </label>
              <input
                id="sent-at"
                type="date"
                value={sentAt}
                onChange={(event) => setSentAt(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="expected-return" className="text-sm font-medium text-slate-700">
                Previsão de retorno
              </label>
              <input
                id="expected-return"
                type="date"
                value={expectedReturnAt}
                onChange={(event) => setExpectedReturnAt(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="notes" className="text-sm font-medium text-slate-700">
                Observações
              </label>
              <input
                id="notes"
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Lote semanal, prioridade alta..."
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Itens do envio</span>
            <div className="flex flex-col gap-3">
              {lines.map((line, index) => (
                <div
                  key={line.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 shadow-sm md:flex md:items-center md:gap-3"
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">
                      Produto {index + 1}
                    </label>
                    <select
                      value={line.productId}
                      onChange={(event) => handleLineChange(line.id, 'productId', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                      required
                    >
                      <option value="" disabled>
                        Selecione um produto
                      </option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} — {formatCurrency(product.pricePerUnit)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-3 flex items-end gap-2 md:mt-0">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">Quantidade</label>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={line.quantitySent}
                        onChange={(event) =>
                          handleLineChange(line.id, 'quantitySent', event.target.value.replace(/\D/g, ''))
                        }
                        className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(line.id)}
                        className="mt-5 inline-flex items-center justify-center rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        disabled={lines.length === 1}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, newLine()])}
              className="inline-flex w-fit items-center justify-center rounded-lg border border-dashed border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
            >
              Adicionar item
            </button>
          </div>

          <div className="flex flex-col justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center">
            <span>
              Total estimado do envio:{' '}
              <strong className="text-slate-900">{formatCurrency(formTotalCost)}</strong>
            </span>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              Registrar envio
            </button>
          </div>

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
        </form>

        <div className="flex flex-col gap-4">
          <header className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Histórico de envios</h3>
            {shipmentDetails.length > 0 ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {shipmentDetails.length} {shipmentDetails.length === 1 ? 'registro' : 'registros'}
              </span>
            ) : null}
          </header>

          {shipmentDetails.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum envio registrado até agora. Utilize o formulário acima para começar.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {shipmentDetails.map((shipment) => (
                <article
                  key={shipment.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100"
                >
                  <header className="flex flex-col gap-2 border-b border-slate-100 pb-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                        Envio em {formatDate(shipment.sentAt)}
                      </span>
                      {shipment.expectedReturnAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          Retorno previsto: {formatDate(shipment.expectedReturnAt)}
                        </span>
                      ) : null}
                      {shipment.notes ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                          {shipment.notes}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeShipment(shipment.id)}
                      className="self-start rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Apagar registro
                    </button>
                  </header>

                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-600">
                        <tr>
                          <th scope="col" className="px-3 py-2">
                            Item
                          </th>
                          <th scope="col" className="px-3 py-2 text-right">
                            Qtde enviada
                          </th>
                          <th scope="col" className="px-3 py-2 text-right">
                            Retorno
                          </th>
                          <th scope="col" className="px-3 py-2 text-right">
                            Custo
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {shipment.items.map((item) => {
                          const product = products.find((prod) => prod.id === item.productId);
                          const price = product?.pricePerUnit ?? 0;
                          const lineCost = item.quantitySent * price;
                          return (
                            <tr key={item.id} className="transition hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-900">{product?.name ?? 'Produto removido'}</td>
                              <td className="px-3 py-2 text-right text-slate-600">{item.quantitySent}</td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  max={item.quantitySent}
                                  value={item.quantityReturned}
                                  onChange={(event) =>
                                    updateShipmentReturn(
                                      shipment.id,
                                      item.id,
                                      Number.parseInt(event.target.value || '0', 10),
                                    )
                                  }
                                  className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                              </td>
                              <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(lineCost)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <footer className="mt-3 grid gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 md:grid-cols-4">
                    <span>
                      Total enviado:{' '}
                      <strong className="text-slate-900">{shipment.totalSent} peças</strong>
                    </span>
                    <span>
                      Retorno:{' '}
                      <strong className="text-slate-900">{shipment.totalReturned} peças</strong>
                    </span>
                    <span>
                      Faltantes:{' '}
                      <strong className="text-red-600">{shipment.totalMissing} peças</strong>
                    </span>
                    <span>
                      Custo do envio:{' '}
                      <strong className="text-slate-900">{formatCurrency(shipment.totalCost)}</strong>
                    </span>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
