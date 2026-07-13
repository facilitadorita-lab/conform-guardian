export function formatDateBR(value?: string | null) {
  if (!value) return "—";

  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) return `${match[3]}/${match[2]}/${match[1]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export function formatDateTimeBR(value?: string | null) {
  if (!value) return "—";

  const raw = String(value).trim();
  const isoLike = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (isoLike) {
    const date = `${isoLike[3]}/${isoLike[2]}/${isoLike[1]}`;
    return isoLike[4] && isoLike[5] ? `${date} ${isoLike[4]}:${isoLike[5]}` : date;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}
