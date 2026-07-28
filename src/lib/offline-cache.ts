const QR_CACHE_KEY = "conform-flow:qr-cache:v1";
const EQUIPMENT_CACHE_KEY = "conform-flow:equipment-cache:v1";

type CacheEnvelope<T> = { value: T; savedAt: number };

function read<T>(key: string): Record<string, CacheEnvelope<T>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, CacheEnvelope<T>>;
  } catch {
    return {};
  }
}

function write<T>(key: string, values: Record<string, CacheEnvelope<T>>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Offline cache is optional and must never block normal usage.
  }
}

export type CachedQrEquipment = {
  empresa_id: string;
  equipamento_id: string;
  qr_token: string;
  nome: string;
  codigo: string;
};

export function cacheQrEquipment(value: CachedQrEquipment) {
  const values = read<CachedQrEquipment>(QR_CACHE_KEY);
  values[value.qr_token] = { value, savedAt: Date.now() };
  write(QR_CACHE_KEY, values);
}

export function getCachedQrEquipment(token: string, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  const item = read<CachedQrEquipment>(QR_CACHE_KEY)[token];
  return item && Date.now() - item.savedAt <= maxAgeMs ? item.value : null;
}

export function cacheEquipmentDetail(companyId: string, equipmentId: string, value: unknown) {
  const values = read<unknown>(EQUIPMENT_CACHE_KEY);
  values[`${companyId}:${equipmentId}`] = { value, savedAt: Date.now() };
  write(EQUIPMENT_CACHE_KEY, values);
}

export function getCachedEquipmentDetail(
  companyId: string,
  equipmentId: string,
  maxAgeMs = 24 * 60 * 60 * 1000,
) {
  const item = read<unknown>(EQUIPMENT_CACHE_KEY)[`${companyId}:${equipmentId}`];
  return item && Date.now() - item.savedAt <= maxAgeMs ? item.value : null;
}
