export const formatCurrency = (value: number, minimumFractionDigits = 2) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits,
  });

export const formatDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
};

export const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) {
    return monthKey;
  }

  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
};
