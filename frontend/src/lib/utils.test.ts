import { describe, expect, it } from "vitest";
import { money, slugify, whatsappUrl } from "./utils";
describe("WhatsApp", () => {
  it("gera o contato contextual com mensagem codificada e URL do imóvel", () => {
    const result = whatsappUrl(
      "5581999999999",
      {
        title: "Casa & Jardim",
        neighborhood: "Casa Forte",
        city: "Recife",
        slug: "casa-jardim",
      },
      "https://morada.example",
    );
    const url = new URL(result!);
    expect(url.host).toBe("wa.me");
    expect(url.pathname).toBe("/5581999999999");
    expect(url.searchParams.get("text")).toBe(
      "Oi, tenho interesse na hospedagem Casa & Jardim que encontrei no site Privê Lopes | Hospedagens. Gostaria de consultar valores e disponibilidade. Link: https://morada.example/imoveis/casa-jardim",
    );
    expect(result).not.toContain("Casa & Jardim");
  });
  it("não cria links para contatos ausentes ou inválidos", () => {
    for (const number of [
      "",
      "+55 (81) 99999-9999",
      "123",
      "javascript:alert(1)",
    ])
      expect(
        whatsappUrl(number, undefined, "https://morada.example"),
      ).toBeNull();
  });
  it("gera contato geral sem referência a um imóvel", () => {
    const url = new URL(
      whatsappUrl("5581999999999", undefined, "https://morada.example")!,
    );
    expect(url.searchParams.get("text")).toContain(
      "Oi, tenho interesse na casa",
    );
  });
});
describe("apresentação", () => {
  it("mantém os centavos do aluguel", () => {
    expect(money(1200.75)).toContain("1.200,75");
  });
  it("normaliza a URL de títulos com acentos", () => {
    expect(slugify(" Apartamento: Beira-mar em Piedade! ")).toBe(
      "apartamento-beira-mar-em-piedade",
    );
  });
});
