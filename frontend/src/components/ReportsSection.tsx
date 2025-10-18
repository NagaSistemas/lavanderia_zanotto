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
      'Observacoes',
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
    <section
      aria-labelledby="reports-section"
      className="mx-auto w-full max-w-5xl px-3 pb-6 sm:px-4 lg:px-0"
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200 sm:rounded-3xl sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 id="reports-section" className="text-lg font-semibold text-slate-900 sm:text-xl md:text-2xl">
                Relatorios financeiros
              </h2>
              <p className="text-sm text-slate-600">
                Consulte o historico de envios por mes, compare volumes enviados versus retornados e exporte os dados para conciliacao financeira ou auditoria.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:text-sm">
              <label htmlFor="report-month" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Mes de referencia
              </label>
              <input
                id="report-month"
                type="month"
                value={monthKey}
                onChange={(event) => setMonthKey(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 sm:w-auto"
                min={months.at(-1)}
                max={months[0]}
              />
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filteredShipments.length === 0}
                className="inline-flex items-center justify-center rounded-lg border border-primary px-4 py-2 text-xs font-semibold text-primary transition enabled:hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                Exportar CSV
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Sumario do mes
              </h3>
              <p className="text-sm text-slate-600">{formatMonthLabel(monthKey)}</p>
            </div>
            <div className="grid gap-2 grid-cols-2 sm:gap-3 lg:grid-cols-4">
              <StatBadge label="Envios" value={filteredShipments.length.toString()} />
              <StatBadge
                label="Total enviado"
                value={`${summary.totalSent.toLocaleString('pt-BR')} pecas`}
              />
              <StatBadge
                label="Total retornado"
                value={`${summary.totalReturned.toLocaleString('pt-BR')} pecas`}
              />
              <StatBadge
                label="Custo acumulado"
                value={formatCurrency(summary.totalCost)}
                muted={summary.totalCost === 0}
              />
            </div>
          </div>

          <div className="mt-4 -mx-4 sm:mx-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-100 text-sm sm:min-w-full" style={{tableLayout: 'auto'}}>
                <colgroup className="hidden sm:table-column-group">
                  <col className="w-24" />
                  <col className="w-auto" />
                  <col className="w-20" />
                  <col className="w-20" />
                  <col className="w-20" />
                  <col className="w-28" />
                </colgroup>
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-2 py-2 sm:px-4 sm:py-3">Data</th>
                    <th scope="col" className="px-2 py-2 sm:px-4 sm:py-3">Itens</th>
                    <th scope="col" className="px-2 py-2 text-right sm:px-4 sm:py-3">Env.</th>
                    <th scope="col" className="px-2 py-2 text-right sm:px-4 sm:py-3">Ret.</th>
                    <th scope="col" className="px-2 py-2 text-right sm:px-4 sm:py-3">Falt.</th>
                    <th scope="col" className="px-2 py-2 text-right sm:px-4 sm:py-3">Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredShipments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-2 py-8 text-center text-sm text-slate-500 sm:px-4">
                        Sem registros para o periodo selecionado.
                      </td>
                    </tr>
                  ) : (
                    filteredShipments.map((shipment) => (
                      <tr key={shipment.id} className="align-top transition hover:bg-slate-50/60">
                        <td className="px-2 py-2 text-xs font-semibold text-slate-900 sm:px-4 sm:py-3 sm:text-sm">
                          <div className="whitespace-nowrap">{formatDate(shipment.sentAt)}</div>
                        </td>
                        <td className="px-2 py-2 text-slate-600 sm:px-4 sm:py-3">
                          <div className="space-y-1">
                            {shipment.items.map((item) => {
                              const product = products.find((p) => p.id === item.productId);
                              return (
                                <div key={item.id} className="text-xs text-slate-500">
                                  <div className="truncate font-medium text-slate-700">
                                    {product?.name ?? 'Produto removido'}
                                  </div>
                                  <div className="text-slate-500">{item.quantitySent} peças</div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right text-slate-600 sm:px-4 sm:py-3">
                          <div className="font-medium">{shipment.totalSent}</div>
                        </td>
                        <td className="px-2 py-2 text-right text-slate-600 sm:px-4 sm:py-3">
                          <div className="font-medium">{shipment.totalReturned}</div>
                        </td>
                        <td className="px-2 py-2 text-right text-amber-600 sm:px-4 sm:py-3">
                          <div className="font-medium">{shipment.totalMissing}</div>
                        </td>
                        <td className="px-2 py-2 text-right text-slate-900 sm:px-4 sm:py-3">
                          <div className="font-semibold whitespace-nowrap">{formatCurrency(shipment.totalCost)}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <footer className="mt-4 grid gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-600 sm:px-4 sm:text-sm md:grid-cols-2 xl:grid-cols-4">
            <span>
              Total enviado:{' '}
              <strong className="text-slate-900">
                {summary.totalSent.toLocaleString('pt-BR')} pecas
              </strong>
            </span>
            <span>
              Total retornado:{' '}
              <strong className="text-slate-900">
                {summary.totalReturned.toLocaleString('pt-BR')} pecas
              </strong>
            </span>
            <span>
              Faltantes:{' '}
              <strong className="text-amber-600">
                {summary.totalMissing.toLocaleString('pt-BR')} pecas
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
