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
    ? `Oi, tenho interesse na hospedagem ${property.title} que encontrei no site Privê Lopes | Hospedagens. Gostaria de consultar valores e disponibilidade. Link: ${origin}/imoveis/${property.slug}`
    : "Oi, tenho interesse na casa";
  return property ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : `http://wa.me/${number}?text=Oi%2C+tenho+interesse+na+casa`;
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
