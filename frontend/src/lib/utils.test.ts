import { describe, expect, it } from "vitest";
import { money, slugify, whatsappUrl } from "./utils";
describe("WhatsApp", () => {
  it("preserva o link oficial nos contatos gerais", () => {
    expect(
      whatsappUrl("5581995809198", undefined, "https://privelopes.example"),
    ).toBe("http://wa.me/5581995809198?text=Oi%2C+tenho+interesse+na+casa");
  });
  it("gera o contato contextual com mensagem codificada e URL da hospedagem", () => {
    const result = whatsappUrl(
      "5581999999999",
      {
        title: "Casa & Jardim",
        neighborhood: "Casa Forte",
        city: "Recife",
        slug: "casa-jardim",
      },
      "https://privelopes.example",
    );
    const url = new URL(result!);
    expect(url.host).toBe("wa.me");
    expect(url.pathname).toBe("/5581999999999");
    expect(url.searchParams.get("text")).toBe(
      "Oi, tenho interesse na hospedagem Casa & Jardim que encontrei no site Privê Lopes | Hospedagens. Gostaria de consultar valores e disponibilidade. Link: https://privelopes.example/imoveis/casa-jardim",
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
        whatsappUrl(number, undefined, "https://privelopes.example"),
      ).toBeNull();
  });
  it("gera contato geral sem referência a uma hospedagem", () => {
    const url = new URL(
      whatsappUrl("5581999999999", undefined, "https://privelopes.example")!,
    );
    expect(url.searchParams.get("text")).toContain(
      "Oi, tenho interesse na casa",
    );
  });
});
describe("apresentação", () => {
  it("mantém os centavos do valor de referência", () => {
    expect(money(1200.75)).toContain("1.200,75");
  });
  it("normaliza a URL de títulos com acentos", () => {
    expect(slugify(" Apartamento: Beira-mar em Piedade! ")).toBe(
      "apartamento-beira-mar-em-piedade",
    );
  });
});
