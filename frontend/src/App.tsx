import { useEffect, useMemo, useState } from 'react';
import { DashboardSection } from './components/DashboardSection';
import { ProductsSection } from './components/ProductsSection';
import { ReportsSection } from './components/ReportsSection';
import { ShipmentsSection } from './components/ShipmentsSection';
import { LoginForm } from './components/LoginForm';
import { useAuth } from './context/AuthContext';
import { useLaundry } from './context/LaundryContext';

type TabOption = 'dashboard' | 'products' | 'shipments' | 'reports';

const tabs: Array<{ id: TabOption; label: string; description: string }> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Resumo financeiro e operacional do mes.',
  },
  {
    id: 'products',
    label: 'Produtos',
    description: 'Cadastre itens e defina o preco por lavagem.',
  },
  {
    id: 'shipments',
    label: 'Envios',
    description: 'Registre lotes enviados e os retornos da lavanderia.',
  },
  {
    id: 'reports',
    label: 'Relatorios',
    description: 'Baixe relatórios mensais detalhados.',
  },
];

const App = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const { loading: dataLoading, error, refresh } = useLaundry();
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

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  const activeDescription = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.description ?? '',
    [activeTab],
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="rounded-lg bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow">
          Carregando autenticacao...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                Lavanderia Control
              </span>
              <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                Painel de Operacoes
              </h1>
              <p className="text-sm text-slate-600">
                Controle end-to-end dos envios, retornos e custos sincronizados com a nuvem.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 text-sm text-slate-500 md:items-end">
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <span className="text-slate-700">{user.email}</span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Sair
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>
                  Dados sincronizados com o backend. Clique em atualizar caso necessario.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void refresh();
                  }}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Atualizar
                </button>
              </div>
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

      {error ? (
        <div className="bg-red-50 text-red-700">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 text-sm md:px-6">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                void refresh();
              }}
              className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-6">
        {dataLoading ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 p-6 text-sm text-slate-500">
            Carregando dados da lavanderia...
          </div>
        ) : null}
        {activeTab === 'dashboard' ? <DashboardSection /> : null}
        {activeTab === 'products' ? <ProductsSection /> : null}
        {activeTab === 'shipments' ? <ShipmentsSection /> : null}
        {activeTab === 'reports' ? <ReportsSection /> : null}
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:px-6">
          <span>Lavanderia Control — PWA integrado ao Firebase</span>
          <span>
            Ultima sincronizacao:{' '}
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
