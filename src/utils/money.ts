export function formatCurrencyFromCents(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((value ?? 0) / 100);
}

export function centsToInputValue(value?: number | null) {
  return String(((value ?? 0) / 100).toFixed(2)).replace(".", ",");
}
