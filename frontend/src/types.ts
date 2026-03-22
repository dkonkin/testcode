export type RecreationBase = {
  id: number;
  name: string;
  region: string;
  water?: string;
  accommodationType: string[];
  priceFrom?: number;
  priceTo?: number;
  features: string[];
  rating?: number;
  season?: string;
  distanceFromCityKm?: number;
  nearestCity?: string;
  website?: string;
  mapsLink?: string;
  lat?: number;
  lng?: number;
  description?: string;
};

export type UserRole = "admin" | "user";
