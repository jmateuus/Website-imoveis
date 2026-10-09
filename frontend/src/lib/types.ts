export type PropertyType =
  "CASA" | "APARTAMENTO" | "KITNET" | "FLAT" | "SOBRADO" | "OUTRO";
export type PropertyStatus = "RASCUNHO" | "DISPONIVEL" | "INDISPONIVEL";
export interface Amenity {
  id: string;
  name: string;
}
export interface Media {
  id: string;
  type: "IMAGEM" | "VIDEO";
  url: string;
  thumbnailUrl?: string;
  originalName: string;
  contentType: string;
  size: number;
  position: number;
  primaryImage: boolean;
}
export interface Property {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: PropertyType;
  rent: number;
  condoFee?: number | null;
  propertyTax?: number | null;
  area?: number | null;
  bedrooms?: number | null;
  suites?: number | null;
  bathrooms?: number | null;
  parking?: number | null;
  guests?: number | null;
  city: string;
  state: string;
  neighborhood: string;
  address?: string | null;
  showAddress: boolean;
  furnished: boolean;
  petsAllowed: boolean;
  featured: boolean;
  status: PropertyStatus;
  createdAt: string;
  updatedAt: string;
  amenities: Amenity[];
  media: Media[];
}
export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
export interface Settings {
  name: string;
  whatsapp: string;
  email?: string | null;
  heroTitle: string;
  heroText: string;
  footer: string;
  logoUrl?: string;
}
export interface Dashboard {
  total: number;
  published: number;
  drafts: number;
  unavailable: number;
}
export const propertyTypes: Record<PropertyType, string> = {
  CASA: "Casa",
  APARTAMENTO: "Apartamento",
  KITNET: "Kitnet",
  FLAT: "Flat",
  SOBRADO: "Sobrado",
  OUTRO: "Outro",
};
export const statuses: Record<PropertyStatus, string> = {
  RASCUNHO: "Rascunho",
  DISPONIVEL: "Disponível",
  INDISPONIVEL: "Indisponível",
};
