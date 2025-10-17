import { useEffect, useMemo, useState } from 'react';
import { DashboardSection } from './components/DashboardSection';
import { ProductsSection } from './components/ProductsSection';
import { ReportsSection } from './components/ReportsSection';
import { ShipmentsSection } from './components/ShipmentsSection';

type TabOption = 'dashboard' | 'products' | 'shipments' | 'reports';

const tabs: Array<{ id: TabOption; label: string; description: string }> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Resumo financeiro e operacional do mês.',
  },
  {
    id: 'products',
    label: 'Produtos',
    description: 'Cadastre itens e defina o preço por lavagem.',
  },
  {
    id: 'shipments',
    label: 'Envios',
    description: 'Registre lotes enviados e retornos da lavanderia.',
  },
  {
    id: 'reports',
    label: 'Relatórios',
    description: 'Faça o download dos relatórios mensais detalhados.',
  },
];

const App = () => {
  const [activeTab, setActiveTab] = useState<TabOption>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateStatus = () =>
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);
  const activeDescription = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.description ?? '',
    [activeTab],
  );

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                PWA de Controle
              </span>
              <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                Lavanderia Control
              </h1>
              <p className="text-sm text-slate-600">
                Monitoramento completo dos envios, retornos e custos para manter a operação da
                lavanderia sempre sob controle.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 text-sm text-slate-500 md:items-end">
              <span>
                Status:{' '}
                <strong className="font-semibold text-primary">
                  {isOnline ? 'Online' : 'Offline (modo consulta)'}
                </strong>
              </span>
              <span className="text-xs">
                Dados armazenados localmente. Instale o app para uso offline completo.
              </span>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-sm focus-visible:ring-primary/60'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 focus-visible:ring-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <p className="text-xs text-slate-500">{activeDescription}</p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-6">
        {activeTab === 'dashboard' ? <DashboardSection /> : null}
        {activeTab === 'products' ? <ProductsSection /> : null}
        {activeTab === 'shipments' ? <ShipmentsSection /> : null}
        {activeTab === 'reports' ? <ReportsSection /> : null}
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:px-6">
          <span>Lavanderia Control • Progressive Web App em React + Tailwind CSS</span>
          <span>
            Dados salvos localmente • Atualizado em{' '}
            {new Date().toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
