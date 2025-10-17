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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = Number.parseFloat(formState.price.replace(',', '.'));

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
      price: product.pricePerUnit.toString().replace('.', ','),
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
      <div className="flex flex-col gap-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <header className="flex flex-col gap-2">
          <h2 id="products-section" className="text-lg font-semibold text-slate-900">
            Cadastro de Produtos
          </h2>
          <p className="text-sm text-slate-600">
            Defina os itens enviados para a lavanderia e o valor por peca. Essas informacoes
            alimentam os calculos de custo por lote e os relatorios financeiros.
          </p>
        </header>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label htmlFor="product-name" className="text-sm font-medium text-slate-700">
              Nome do item
            </label>
            <input
              id="product-name"
              name="name"
              type="text"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Ex.: Toalha de banho"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="product-category" className="text-sm font-medium text-slate-700">
              Categoria (opcional)
            </label>
            <input
              id="product-category"
              name="category"
              type="text"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Roupa de cama, decoracao..."
              value={formState.category}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, category: event.target.value }))
              }
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-2 md:flex-row md:items-end md:gap-4">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="product-price" className="text-sm font-medium text-slate-700">
                Preco por lavagem (R$)
              </label>
              <input
                id="product-price"
                name="price"
                inputMode="decimal"
                pattern="^\\d+(?:[\\.,]\\d{0,2})?$"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="0,00"
                value={formState.price}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    price: event.target.value.replace(/[^0-9.,]/g, ''),
                  }))
                }
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-60"
              >
                {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>
        </form>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Item
                </th>
                <th scope="col" className="px-4 py-3">
                  Categoria
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Preco por lavagem
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {orderedProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                    Nenhum produto cadastrado ainda. Adicione itens para iniciar o controle.
                  </td>
                </tr>
              ) : (
                orderedProducts.map((product) => (
                  <tr key={product.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {product.category ?? <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {formatCurrency(product.pricePerUnit)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(product)}
                          className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(product.id)}
                          disabled={removingId === product.id}
                          className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
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
    </section>
  );
};
