import { useMemo, useState } from 'react';
import { useLaundry } from '../context/LaundryContext';
import { deriveDashboardMetrics, enhanceShipment } from '../lib/metrics';
import { formatCurrency, formatDate, formatMonthLabel } from '../utils/format';

const getCurrentMonthKey = () => new Date().toISOString().slice(0, 7);

const formatPieces = (amount: number) =>
  `${amount.toLocaleString('pt-BR')} ${amount === 1 ? 'peça' : 'peças'}`;

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
    <section aria-labelledby="dashboard-section">
      <div className="flex flex-col gap-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <h2 id="dashboard-section" className="text-lg font-semibold text-slate-900">
              Visão Geral
            </h2>
            <p className="text-sm text-slate-600">
              Acompanhe o volume de peças enviadas, retornos e custos do mês selecionado. Tudo é
              atualizado automaticamente com base nos registros.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="month-filter" className="text-sm font-medium text-slate-700">
              Selecionar mês
            </label>
            <input
              id="month-filter"
              type="month"
              value={monthKey}
              onChange={(event) => setMonthKey(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              min={availableMonths.at(-1)}
              max={availableMonths[0]}
            />
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title="Peças enviadas"
            value={formatPieces(metrics.totalSent)}
            helper={toDateRange ? `Período: ${formatDate(toDateRange.start)} a ${formatDate(toDateRange.end)}` : 'Sem envios no mês selecionado'}
          />
          <DashboardCard
            title="Peças retornadas"
            value={formatPieces(metrics.totalReturned)}
            helper={
              metrics.totalSent > 0
                ? `${((metrics.totalReturned / metrics.totalSent) * 100).toFixed(0)}% dos itens voltaram`
                : 'Aguardando envios'
            }
          />
          <DashboardCard
            title="Peças faltantes"
            value={formatPieces(metrics.totalMissing)}
            tone="alert"
            helper={
              metrics.totalMissing > 0
                ? 'Revisar com a lavanderia'
                : 'Sem inconsistências registradas'
            }
          />
          <DashboardCard
            title="Custo total"
            value={formatCurrency(metrics.totalCost)}
            helper={
              metrics.productBreakdown.length > 0
                ? `${metrics.productBreakdown.length} ${metrics.productBreakdown.length === 1 ? 'item' : 'itens'} envolvidos`
                : 'Cadastre produtos e envios para acompanhar'
            }
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">
              Custo por produto — {formatMonthLabel(metrics.monthKey)}
            </h3>
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-600">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Produto
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Envio
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Retorno
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Custo total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {metrics.productBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                        Nenhum dado disponível para o mês selecionado.
                      </td>
                    </tr>
                  ) : (
                    metrics.productBreakdown.map((item) => (
                      <tr key={item.productId} className="transition hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-900">{item.productName}</td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {item.quantitySent.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {item.quantityReturned.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-900">
                          {formatCurrency(item.totalCost)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">
              Evolução diária — {formatMonthLabel(metrics.monthKey)}
            </h3>
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-600">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Data
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
                  {metrics.dailyTotals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                        Sem envios no mês selecionado.
                      </td>
                    </tr>
                  ) : (
                    metrics.dailyTotals.map((day) => (
                      <tr key={day.date} className="transition hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-900">{formatDate(day.date)}</td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {day.sent.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {day.returned.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-3 py-2 text-right text-red-600">
                          {day.missing.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-900">
                          {formatCurrency(day.cost)}
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
    </section>
  );
};

type DashboardCardProps = {
  title: string;
  value: string;
  helper?: string;
  tone?: 'default' | 'alert';
};

const DashboardCard = ({ title, value, helper, tone = 'default' }: DashboardCardProps) => {
  const toneClasses =
    tone === 'alert'
      ? 'bg-red-50 ring-1 ring-inset ring-red-100 text-red-700'
      : 'bg-primary/10 ring-1 ring-inset ring-primary/20 text-primary';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</span>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-3 text-xs text-slate-500">{helper}</p> : null}
      <div
        className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${toneClasses}`}
      >
        {tone === 'alert' ? 'Atenção' : 'Em dia'}
      </div>
    </div>
  );
};
