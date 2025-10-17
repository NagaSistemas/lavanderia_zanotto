import { useEffect, useMemo, useState } from 'react';
import { DashboardSection } from './components/DashboardSection';
import { ProductsSection } from './components/ProductsSection';
import { ReportsSection } from './components/ReportsSection';
import { ShipmentsSection } from './components/ShipmentsSection';
import { LoginForm } from './components/LoginForm';
import { useAuth } from './context/AuthContext';
import { useLaundry } from './context/LaundryContext';

type TabOption = 'dashboard' | 'products' | 'shipments' | 'reports';

const navigation: Array<{
  id: TabOption;
  label: string;
  description: string;
}> = [
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
    description: 'Registre lotes enviados e retornos da lavanderia.',
  },
  {
    id: 'reports',
    label: 'Relatorios',
    description: 'Consulta detalhada e exportacao de dados.',
  },
];

const mobileMenuTransition =
  'transition-transform duration-200 ease-out data-[open=true]:translate-y-0 data-[open=false]:-translate-y-full';

const App = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const { loading: dataLoading, error, refresh } = useLaundry();
  const [activeTab, setActiveTab] = useState<TabOption>('dashboard');
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [activeTab]);

  const activeDescription = useMemo(
    () => navigation.find((item) => item.id === activeTab)?.description ?? '',
    [activeTab],
  );

  const renderSection = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardSection />;
      case 'products':
        return <ProductsSection />;
      case 'shipments':
        return <ShipmentsSection />;
      case 'reports':
        return <ReportsSection />;
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="rounded-xl bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow">
          Carregando autenticacao...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="flex min-h-screen bg-surface text-slate-700">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 flex-shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col lg:justify-between">
        <div className="p-6">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Lavanderia Control
            </span>
            <h1 className="text-xl font-semibold text-slate-900">Painel Administrativo</h1>
            <p className="text-sm text-slate-500">
              Monitoramento completo dos processos da lavanderia, sempre sincronizado com a nuvem.
            </p>
          </div>

          <nav className="mt-8 space-y-1">
            {navigation.map((item) => {
              const isActive = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full rounded-lg px-4 py-3 text-left transition ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span
                    className={`mt-1 block text-xs ${
                      isActive ? 'text-primary/20' : 'text-slate-500'
                    }`}
                  >
                    {item.description}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-6 text-sm text-slate-500">
          <p className="font-semibold text-slate-900">{user.email}</p>
          <p className="text-xs text-slate-500">
            Status:{' '}
            <span className={isOnline ? 'text-emerald-600' : 'text-amber-600'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex min-h-screen flex-1 flex-col lg:bg-gradient-to-br lg:from-surface lg:to-slate-100/60">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-primary">Lavanderia Control</p>
              <h2 className="text-lg font-semibold text-slate-900">Painel de Gestão</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                {isOnline ? 'Online' : 'Offline'}
              </span>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen((previous) => !previous)}
                className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Menu
              </button>
            </div>
          </div>

          <div
            data-open={isMobileNavOpen}
            className={`${mobileMenuTransition} border-t border-slate-200 bg-white px-4 pb-4`}
          >
            <p className="mt-3 text-xs text-slate-500">Navegue pela plataforma:</p>
            <nav className="mt-3 grid gap-2">
              {navigation.map((item) => {
                const isActive = item.id === activeTab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="mt-4 grid gap-2 text-xs text-slate-500">
              <span>{user.email}</span>
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Sair da conta
              </button>
            </div>
          </div>
        </header>

        {/* Desktop top bar */}
        <div className="hidden border-b border-slate-200 bg-white/70 px-8 py-6 lg:block">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                {navigation.find((item) => item.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-slate-500">{activeDescription}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void refresh();
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Atualizar dados
              </button>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:px-8 lg:py-8">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="flex items-start justify-between gap-4">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={() => {
                      void refresh();
                    }}
                    className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            ) : null}

            {dataLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
                Carregando dados da lavanderia...
              </div>
            ) : null}

            <div className="space-y-6">{renderSection()}</div>
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white/90">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
            <span>Lavanderia Control • Gestão profissional de envios e retornos</span>
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
    </div>
  );
};

export default App;
