import { describe, expect, it } from "vitest";
import { propertySchema } from "./property-schema";
const valid = {
  title: "Casa para alugar",
  slug: "",
  description: "Uma casa com espaços iluminados.",
  type: "CASA",
  rent: 1200,
  condoFee: null,
  propertyTax: null,
  area: null,
  bedrooms: null,
  suites: null,
  bathrooms: null,
  parking: null,
  guests: null,
  city: "Recife",
  state: "PE",
  neighborhood: "Casa Forte",
  address: "",
  showAddress: false,
  furnished: false,
  petsAllowed: false,
  featured: false,
  status: "RASCUNHO",
  amenityIds: [],
};
describe("formulário de imóveis", () => {
  it("aceita características opcionais sem inventar valores", () => {
    expect(propertySchema.parse(valid).bedrooms).toBeNull();
  });
  it("recusa aluguel inválido, estado desconhecido e suites incompatíveis", () => {
    expect(propertySchema.safeParse({ ...valid, rent: -1 }).success).toBe(
      false,
    );
    expect(propertySchema.safeParse({ ...valid, state: "XX" }).success).toBe(
      false,
    );
    expect(
      propertySchema.safeParse({ ...valid, suites: 3, bedrooms: 2 }).success,
    ).toBe(false);
  });
});
