import type { RecreationBase } from "../types";

export function getUniqueValues(
  data: RecreationBase[],
  key: "region" | "accommodationType"
): string[] {
  const set = new Set<string>();
  data.forEach((item) => {
    if (key === "accommodationType") {
      (item.accommodationType || []).forEach((v) => set.add(v));
    } else {
      const v = item.region;
      if (v) set.add(v);
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
}

export function describePriceRange(base: RecreationBase): string {
  if (!base.priceFrom && !base.priceTo) return "цена по запросу";
  if (base.priceFrom != null && base.priceTo != null) {
    return `${base.priceFrom.toLocaleString("ru-RU")}–${base.priceTo.toLocaleString("ru-RU")} ₽ / ночь`;
  }
  if (base.priceFrom != null) {
    return `от ${base.priceFrom.toLocaleString("ru-RU")} ₽ / ночь`;
  }
  return `до ${base.priceTo!.toLocaleString("ru-RU")} ₽ / ночь`;
}

export function getPriceBucket(base: RecreationBase): number {
  const from = base.priceFrom ?? base.priceTo ?? 0;
  if (from <= 3000) return 1;
  if (from <= 6000) return 2;
  if (from <= 10000) return 3;
  return 4;
}

export type Filters = {
  search: string;
  region: string;
  type: string;
  priceBucket: number | null;
  features: string[];
};

export function applyFilters(data: RecreationBase[], filters: Filters): RecreationBase[] {
  return data.filter((base) => {
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      const haystack = [
        base.name,
        base.region,
        base.water,
        base.nearestCity,
        base.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (filters.region && base.region !== filters.region) return false;
    if (filters.type) {
      const types = base.accommodationType || [];
      if (!types.includes(filters.type)) return false;
    }
    if (filters.priceBucket != null) {
      if (getPriceBucket(base) !== filters.priceBucket) return false;
    }
    if (filters.features.length) {
      const baseFeatures = new Set(base.features || []);
      if (!filters.features.every((f) => baseFeatures.has(f))) return false;
    }
    return true;
  });
}
