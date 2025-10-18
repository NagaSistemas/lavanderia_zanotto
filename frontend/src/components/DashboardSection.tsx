import { useMemo, useState } from 'react';
import { useLaundry } from '../context/LaundryContext';
import { deriveDashboardMetrics, enhanceShipment } from '../lib/metrics';
import { formatCurrency, formatDate, formatMonthLabel } from '../utils/format';

const getCurrentMonthKey = () => new Date().toISOString().slice(0, 7);

const formatPieces = (amount: number) =>
  `${amount.toLocaleString('pt-BR')} ${amount === 1 ? 'peca' : 'pecas'}`;

export const DashboardSection = () => {
  const {
    state: { shipments, products },
  } = useLaundry();
  const [monthKey, setMonthKey] = useState<string>(getCurrentMonthKey());

  const availableMonths = useMemo(() => {
    const unique = new Set<string>();
    shipments.forEach((shipment) => unique.add(shipment.sentAt.slice(0, 7)));
    const months = Array.from(unique).sort((a, b) => b.localeCompare(a));
    if (months.length === 0) {
      months.push(getCurrentMonthKey());
    }
    return months;
  }, [shipments]);

  const metrics = useMemo(
    () => deriveDashboardMetrics(shipments, products, monthKey),
    [shipments, products, monthKey],
  );

  const toDateRange = useMemo(() => {
    const selectedShipments = shipments
      .filter((shipment) => shipment.sentAt.startsWith(monthKey))
      .map((shipment) => enhanceShipment(shipment, products));
    if (selectedShipments.length === 0) {
      return null;
    }
    const dates = selectedShipments.map((shipment) => shipment.sentAt).sort();
    return {
      start: dates[0],
      end: dates[dates.length - 1],
    };
  }, [shipments, monthKey, products]);

  return (
    <section
      aria-labelledby="dashboard-section"
      className="mx-auto w-full max-w-5xl px-3 pb-6 sm:px-4 lg:px-0"
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-surface to-white p-4 shadow-sm ring-1 ring-slate-100 sm:rounded-3xl sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 id="dashboard-section" className="text-lg font-semibold text-slate-900 sm:text-xl md:text-2xl">
                Visao geral do periodo
              </h2>
              <p className="text-sm text-slate-600">
                Acompanhe os principais indicadores operacionais e financeiros do mes selecionado.
                Os dados sao atualizados em tempo real conforme voce registra envios e retornos.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl bg-white/80 p-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center">
              <label htmlFor="month-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Mes de referencia
              </label>
              <input
                id="month-filter"
                type="month"
                value={monthKey}
                onChange={(event) => setMonthKey(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 sm:w-auto"
                min={availableMonths.at(-1)}
                max={availableMonths[0]}
              />
              {toDateRange ? (
                <span className="text-xs text-slate-500">
                  Periodo: {formatDate(toDateRange.start)} a {formatDate(toDateRange.end)}
                </span>
              ) : (
                <span className="text-xs text-slate-500">Sem movimentacoes registradas</span>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Pecas enviadas"
              value={formatPieces(metrics.totalSent)}
              trend={
                toDateRange
                  ? `Periodo: ${formatDate(toDateRange.start)} a ${formatDate(toDateRange.end)}`
                  : 'Sem envios registrados'
              }
            />
            <SummaryCard
              title="Pecas retornadas"
              value={formatPieces(metrics.totalReturned)}
              trend={
                metrics.totalSent > 0
                  ? `${((metrics.totalReturned / metrics.totalSent) * 100).toFixed(0)}% de retorno`
                  : 'Aguardando envios'
              }
            />
            <SummaryCard
              tone="alert"
              title="Pecas faltantes"
              value={formatPieces(metrics.totalMissing)}
              trend={
                metrics.totalMissing > 0
                  ? 'Acione a lavanderia'
                  : 'Nenhuma pendencia registrada'
              }
            />
            <SummaryCard
              title="Custo total"
              value={formatCurrency(metrics.totalCost)}
              trend={
                metrics.productBreakdown.length > 0
                  ? `${metrics.productBreakdown.length} ${metrics.productBreakdown.length === 1 ? 'item' : 'itens'} envolvidos`
                  : 'Cadastre produtos para acompanhar'
              }
            />
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Distribuicao por produto
                </h3>
                <p className="text-sm text-slate-600">
                  {formatMonthLabel(metrics.monthKey)}
                </p>
              </div>
            </div>
            <div className="mt-4 -mx-4 sm:mx-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3">Produto</th>
                      <th scope="col" className="px-3 py-2 text-right sm:px-4 sm:py-3">Enviadas</th>
                      <th scope="col" className="px-3 py-2 text-right sm:px-4 sm:py-3">Retornadas</th>
                      <th scope="col" className="px-3 py-2 text-right sm:px-4 sm:py-3">Custo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {metrics.productBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500 sm:px-4">
                          Nenhum dado disponivel para o mes selecionado.
                        </td>
                      </tr>
                    ) : (
                      metrics.productBreakdown.map((item) => (
                        <tr key={item.productId} className="transition hover:bg-slate-50/60">
                          <td className="px-3 py-2 text-sm font-semibold text-slate-900 sm:px-4 sm:py-3">
                            <div className="truncate max-w-[120px] sm:max-w-none">{item.productName}</div>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 sm:px-4 sm:py-3">
                            {item.quantitySent.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 sm:px-4 sm:py-3">
                            {item.quantityReturned.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-900 sm:px-4 sm:py-3">
                            {formatCurrency(item.totalCost)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Evolucao diaria de envios
                </h3>
                <p className="text-sm text-slate-600">{formatMonthLabel(metrics.monthKey)}</p>
              </div>
            </div>
            <div className="mt-4 -mx-4 sm:mx-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-2 py-2 sm:px-4 sm:py-3">Data</th>
                      <th scope="col" className="px-2 py-2 text-right sm:px-4 sm:py-3">Env.</th>
                      <th scope="col" className="px-2 py-2 text-right sm:px-4 sm:py-3">Ret.</th>
                      <th scope="col" className="px-2 py-2 text-right sm:px-4 sm:py-3">Falt.</th>
                      <th scope="col" className="px-2 py-2 text-right sm:px-4 sm:py-3">Custo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {metrics.dailyTotals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-2 py-6 text-center text-sm text-slate-500 sm:px-4">
                          Nenhuma movimentacao registrada neste mes.
                        </td>
                      </tr>
                    ) : (
                      metrics.dailyTotals.map((day) => (
                        <tr key={day.date} className="transition hover:bg-slate-50/60">
                          <td className="px-2 py-2 text-xs font-semibold text-slate-900 sm:px-4 sm:py-3 sm:text-sm">
                            {formatDate(day.date)}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-600 sm:px-4 sm:py-3">
                            {day.sent.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-600 sm:px-4 sm:py-3">
                            {day.returned.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-2 py-2 text-right text-amber-600 sm:px-4 sm:py-3">
                            {day.missing.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-900 sm:px-4 sm:py-3">
                            <span className="whitespace-nowrap">{formatCurrency(day.cost)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

type SummaryCardProps = {
  title: string;
  value: string;
  trend?: string;
  tone?: 'default' | 'alert';
};

const SummaryCard = ({ title, value, trend, tone = 'default' }: SummaryCardProps) => {
  const toneClasses =
    tone === 'alert'
      ? 'bg-red-50 ring-1 ring-inset ring-red-100 text-red-600'
      : 'bg-primary/10 ring-1 ring-inset ring-primary/20 text-primary';

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </span>
        <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      </div>
      {trend ? <p className="mt-4 text-xs text-slate-500">{trend}</p> : null}
      <div className={`mt-4 inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${toneClasses}`}>
        {tone === 'alert' ? 'Atenção' : 'Em andamento'}
      </div>
    </div>
  );
};
