import { useMemo, useState } from 'react';
import { useLaundry } from '../context/LaundryContext';
import { enhanceShipment } from '../lib/metrics';
import { formatCurrency, formatDate, formatMonthLabel } from '../utils/format';

const toMonthKey = (isoDate: string) => isoDate.slice(0, 7);

const getDefaultMonth = () => new Date().toISOString().slice(0, 7);

export const ReportsSection = () => {
  const {
    state: { shipments, products },
  } = useLaundry();
  const [monthKey, setMonthKey] = useState<string>(getDefaultMonth());

  const months = useMemo(() => {
    const unique = new Set<string>();
    shipments.forEach((shipment) => unique.add(toMonthKey(shipment.sentAt)));
    const ordered = Array.from(unique).sort((a, b) => b.localeCompare(a));
    if (ordered.length === 0) {
      ordered.push(getDefaultMonth());
    }
    return ordered;
  }, [shipments]);

  const filteredShipments = useMemo(
    () =>
      shipments
        .filter((shipment) => toMonthKey(shipment.sentAt) === monthKey)
        .map((shipment) => enhanceShipment(shipment, products)),
    [shipments, monthKey, products],
  );

  const summary = useMemo(
    () =>
      filteredShipments.reduce(
        (acc, shipment) => {
          acc.totalCost += shipment.totalCost;
          acc.totalSent += shipment.totalSent;
          acc.totalReturned += shipment.totalReturned;
          acc.totalMissing += shipment.totalMissing;
          return acc;
        },
        { totalCost: 0, totalSent: 0, totalReturned: 0, totalMissing: 0 },
      ),
    [filteredShipments],
  );

  const handleExportCsv = () => {
    if (filteredShipments.length === 0) {
      return;
    }

    const headers = [
      'Data de envio',
      'Itens',
      'Quantidade enviada',
      'Quantidade retornada',
      'Faltantes',
      'Custo do envio',
      'Observações',
    ];

    const rows = filteredShipments.map((shipment) => [
      shipment.sentAt,
      shipment.items
        .map((item) => {
          const product = products.find((p) => p.id === item.productId);
          return `${product?.name ?? 'Produto removido'} (${item.quantitySent})`;
        })
        .join(' | '),
      shipment.totalSent.toString(),
      shipment.totalReturned.toString(),
      shipment.totalMissing.toString(),
      shipment.totalCost.toFixed(2),
      shipment.notes ?? '',
    ]);

    const csvContent = [headers, ...rows]
      .map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-lavanderia-${monthKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="reports-section">
      <div className="flex flex-col gap-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <h2 id="reports-section" className="text-lg font-semibold text-slate-900">
              Relatórios Financeiros
            </h2>
            <p className="text-sm text-slate-600">
              Gere um resumo mensal com os envios realizados, o custo envolvido e discrepâncias entre
              peças enviadas e retornadas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="report-month" className="text-sm font-medium text-slate-700">
              Mês de referência
            </label>
            <input
              id="report-month"
              type="month"
              value={monthKey}
              onChange={(event) => setMonthKey(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              min={months.at(-1)}
              max={months[0]}
            />
          </div>
        </header>

        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                {formatMonthLabel(monthKey)}
              </h3>
              <p className="text-xs text-slate-500">
                {filteredShipments.length === 0
                  ? 'Sem registros para este período.'
                  : `${filteredShipments.length} ${filteredShipments.length === 1 ? 'envio' : 'envios'} cadastrados.`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredShipments.length === 0}
              className="inline-flex items-center justify-center rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition enabled:hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Exportar CSV
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Data
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Itens
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Enviadas
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Retornadas
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Faltantes
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Custo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                      Sem dados para o mês informado.
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="transition hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-900">{formatDate(shipment.sentAt)}</td>
                      <td className="px-3 py-2 text-slate-600">
                        <ul className="list-disc pl-4 text-xs text-slate-500">
                          {shipment.items.map((item) => {
                            const product = products.find((p) => p.id === item.productId);
                            return (
                              <li key={item.id}>
                                {product?.name ?? 'Produto removido'} — {item.quantitySent} peças
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {shipment.totalSent.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {shipment.totalReturned.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600">
                        {shipment.totalMissing.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-900">
                        {formatCurrency(shipment.totalCost)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="grid gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 md:grid-cols-4">
            <span>
              Total enviado:{' '}
              <strong className="text-slate-900">{summary.totalSent.toLocaleString('pt-BR')} peças</strong>
            </span>
            <span>
              Total retornado:{' '}
              <strong className="text-slate-900">
                {summary.totalReturned.toLocaleString('pt-BR')} peças
              </strong>
            </span>
            <span>
              Faltantes:{' '}
              <strong className="text-red-600">
                {summary.totalMissing.toLocaleString('pt-BR')} peças
              </strong>
            </span>
            <span>
              Custo total:{' '}
              <strong className="text-slate-900">{formatCurrency(summary.totalCost)}</strong>
            </span>
          </footer>
        </div>
      </div>
    </section>
  );
};
