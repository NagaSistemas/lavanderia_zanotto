import { useMemo, useState } from 'react';
import { useLaundry } from '../context/LaundryContext';
import type { Product } from '../types';
import { formatCurrency } from '../utils/format';

type FormState = {
  name: string;
  category: string;
  price: string;
};

const emptyForm: FormState = {
  name: '',
  category: '',
  price: '',
};

const applyPriceMask = (input: string) => {
  const digits = input.replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  const number = Number(digits) / 100;
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const ProductsSection = () => {
  const {
    state: { products },
    addProduct,
    updateProduct,
    removeProduct,
  } = useLaundry();

  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const orderedProducts = useMemo<Product[]>(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [products]);

  const totalProducts = orderedProducts.length;
  const averagePrice =
    totalProducts === 0
      ? 0
      : orderedProducts.reduce((acc, item) => acc + item.pricePerUnit, 0) / totalProducts;
  const categoryCount = orderedProducts.reduce<Record<string, number>>((acc, item) => {
    const key = item.category ?? 'Sem categoria';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const mostCommonCategory =
    Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Sem categoria';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPrice = formState.price.replace(/\./g, '').replace(',', '.');
    const price = Number.parseFloat(normalizedPrice);

    if (!formState.name.trim()) {
      setError('Informe o nome do item.');
      return;
    }

    if (Number.isNaN(price) || price <= 0) {
      setError('Defina um preco valido maior que zero.');
      return;
    }

    const payload = {
      name: formState.name.trim(),
      category: formState.category.trim() || undefined,
      pricePerUnit: price,
    };

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await addProduct(payload);
      }
      setFormState(emptyForm);
      setEditingId(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Falha ao salvar produto.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormState({
      name: product.name,
      category: product.category ?? '',
      price: product.pricePerUnit.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    });
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormState(emptyForm);
    setError(null);
  };

  const handleRemove = async (id: string, productName: string) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja apagar o produto "${productName}"?\n\nTodos os dados de envio, retorno e financeiro relacionados a ele serão perdidos permanentemente.`
    );
    
    if (!confirmed) {
      return;
    }

    setRemovingId(id);
    setError(null);
    try {
      await removeProduct(id);
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : 'Falha ao remover produto.',
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section
      aria-labelledby="products-section"
      className="mx-auto w-full max-w-5xl px-3 pb-6 sm:px-4 lg:px-0"
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200 sm:rounded-3xl sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-2">
              <h2 id="products-section" className="text-lg font-semibold text-slate-900 sm:text-xl md:text-2xl">
                Cadastro e acompanhamentos de produtos
              </h2>
              <p className="text-sm text-slate-600">
                Adicione novos itens ao catalogo, ajuste precos e mantenha as informacoes sempre consistentes.
                Estes dados alimentam os calculos de custos e relatórios operacionais.
              </p>
            </div>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-3 sm:gap-3">
              <StatBadge label="Produtos ativos" value={totalProducts.toString()} />
              <StatBadge
                label="Preco medio"
                value={formatCurrency(Number.isFinite(averagePrice) ? averagePrice : 0)}
              />
              <StatBadge label="Categoria destaque" value={mostCommonCategory} muted />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,380px),1fr]">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-white to-white p-4 shadow-sm ring-1 ring-primary/10 sm:rounded-3xl sm:p-6">
            <header className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                {editingId ? 'Atualizar produto' : 'Adicionar produto'}
              </h3>
              <p className="text-xs text-slate-600">
                Preencha os campos abaixo e confirme para salvar.
              </p>
            </header>

            <form className="mt-4 space-y-4 sm:mt-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="product-name" className="text-sm font-semibold text-slate-700">
                  Nome do item
                </label>
                <input
                  id="product-name"
                  name="name"
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Ex.: Toalha de banho"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="product-category" className="text-sm font-semibold text-slate-700">
                  Categoria (opcional)
                </label>
                <input
                  id="product-category"
                  name="category"
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Ex.: Roupa de cama, Decoracao..."
                  value={formState.category}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, category: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="product-price" className="text-sm font-semibold text-slate-700">
                  Preco por lavagem (R$)
                </label>
                <input
                  id="product-price"
                  name="price"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="0,00"
                  value={formState.price}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      price: applyPriceMask(event.target.value),
                    }))
                  }
                  required
                />
                <p className="text-xs text-slate-500">
                  Digite somente numeros; os centavos serao adicionados automaticamente.
                </p>
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-60"
                >
                  {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar'}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                  >
                    Cancelar edicao
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm sm:rounded-3xl">
            <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Produtos cadastrados
                </h3>
                <p className="text-sm text-slate-600">
                  Gerencie os itens ativos. Utilize editar ou remover conforme necessario.
                </p>
              </div>
            </div>

            <div className="-mx-4 sm:mx-0 sm:overflow-x-auto">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3">Item</th>
                      <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3">Categoria</th>
                      <th scope="col" className="px-3 py-2 text-right sm:px-6 sm:py-3">Preco</th>
                      <th scope="col" className="px-3 py-2 text-right sm:px-6 sm:py-3">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {orderedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500 sm:px-6">
                          Nenhum produto cadastrado ainda. Utilize o formulario ao lado para iniciar.
                        </td>
                      </tr>
                    ) : (
                      orderedProducts.map((product) => (
                        <tr key={product.id} className="transition hover:bg-slate-50/60">
                          <td className="px-3 py-2 text-sm font-semibold text-slate-900 sm:px-6 sm:py-3">
                            <div className="truncate max-w-[100px] sm:max-w-none">{product.name}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-600 sm:px-6 sm:py-3">
                            <div className="truncate max-w-[80px] sm:max-w-none">
                              {product.category ?? <span className="italic text-slate-400">Sem categoria</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-900 whitespace-nowrap sm:px-6 sm:py-3">
                            {formatCurrency(product.pricePerUnit)}
                          </td>
                          <td className="px-3 py-2 text-right sm:px-6 sm:py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(product)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                aria-label="Editar produto"
                              >
                                <svg
                                  className="h-4 w-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemove(product.id, product.name)}
                                disabled={removingId === product.id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={removingId === product.id ? 'Removendo produto' : 'Remover produto'}
                              >
                                {removingId === product.id ? (
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600">
                                    ...
                                  </span>
                                ) : (
                                  <svg
                                    className="h-4 w-4"
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
                                )}
                              </button>
                            </div>
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

type StatBadgeProps = {
  label: string;
  value: string;
  muted?: boolean;
};

const StatBadge = ({ label, value, muted = false }: StatBadgeProps) => (
  <div className={`rounded-2xl border border-slate-200 px-4 py-3 shadow-sm ${muted ? 'bg-slate-50/70' : 'bg-white'}`}>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
  </div>
);
