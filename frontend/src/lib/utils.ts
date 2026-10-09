import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Property } from "./types";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
export function preciseMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
export function whatsappUrl(
  number: string,
  property?: Pick<Property, "title" | "neighborhood" | "city" | "slug">,
  origin = window.location.origin,
) {
  if (!/^[1-9]\d{9,14}$/.test(number)) return null;
  const text = property
    ? `Olá! Tenho interesse no imóvel ${property.title}, localizado em ${property.neighborhood}/${property.city}. Gostaria de receber mais informações. Link: ${origin}/imoveis/${property.slug}`
    : "Olá! Gostaria de saber mais sobre os imóveis disponíveis para aluguel.";
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export function cover(property: Property) {
  return (
    property.media.find((m) => m.primaryImage) ??
    property.media.find((m) => m.type === "IMAGEM")
  );
}
