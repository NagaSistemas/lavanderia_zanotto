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

  const handleRemove = async (id: string) => {
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
    <section aria-labelledby="products-section">
      <div className="space-y-6">
        <div className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-2">
              <h2 id="products-section" className="text-xl font-semibold text-slate-900 md:text-2xl">
                Cadastro e acompanhamentos de produtos
              </h2>
              <p className="text-sm text-slate-600">
                Adicione novos itens ao catalogo, ajuste precos e mantenha as informacoes sempre consistentes.
                Estes dados alimentam os calculos de custos e relatórios operacionais.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBadge label="Produtos ativos" value={totalProducts.toString()} />
              <StatBadge
                label="Preco medio"
                value={formatCurrency(Number.isFinite(averagePrice) ? averagePrice : 0)}
              />
              <StatBadge label="Categoria destaque" value={mostCommonCategory} muted />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px),1fr]">
          <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-white to-white p-6 shadow-sm ring-1 ring-primary/10">
            <header className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingId ? 'Atualizar produto' : 'Adicionar produto'}
              </h3>
              <p className="text-xs text-slate-600">
                Preencha os campos abaixo e confirme para salvar.
              </p>
            </header>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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

              <div className="flex flex-wrap gap-3">
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

          <div className="rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="flex flex-col gap-1 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Produtos cadastrados
                </h3>
                <p className="text-sm text-slate-600">
                  Gerencie os itens ativos. Utilize editar ou remover conforme necessario.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-6 py-3">Item</th>
                    <th scope="col" className="px-6 py-3">Categoria</th>
                    <th scope="col" className="px-6 py-3 text-right">Preco</th>
                    <th scope="col" className="px-6 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {orderedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-6 text-center text-sm text-slate-500">
                        Nenhum produto cadastrado ainda. Utilize o formulario ao lado para iniciar.
                      </td>
                    </tr>
                  ) : (
                    orderedProducts.map((product) => (
                      <tr key={product.id} className="transition hover:bg-slate-50/60">
                        <td className="px-6 py-3 text-sm font-semibold text-slate-900">
                          {product.name}
                        </td>
                        <td className="px-6 py-3 text-slate-600">
                          {product.category ?? <span className="italic text-slate-400">Sem categoria</span>}
                        </td>
                        <td className="px-6 py-3 text-right text-slate-900">
                          {formatCurrency(product.pricePerUnit)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(product)}
                              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemove(product.id)}
                              disabled={removingId === product.id}
                              className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                            >
                              {removingId === product.id ? 'Removendo...' : 'Remover'}
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
