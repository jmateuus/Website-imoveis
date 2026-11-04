import { test, expect } from "@playwright/test";
import type { Review } from "../src/lib/types";

test("home shows six reviews and modal can reach every comment", async ({
  page,
}) => {
  const reviews = Array.from({ length: 62 }, (_, i) => ({
    id: String(i),
    customerName: `Hóspede ${i}`,
    rating: i % 6,
    comment:
      `Comentário completo ${i}. ` + "Uma estadia para lembrar. ".repeat(15),
    propertyName: "Casa de praia",
    contact: "@cliente",
    photoUrl: "/avatar.svg",
  }));
  await page.route("**/avatar.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="orange"/></svg>',
    }),
  );
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const size = Number(url.searchParams.get("size") ?? 6),
      p = Number(url.searchParams.get("page") ?? 0);
    await route.fulfill({
      json: url.pathname.endsWith("reviews")
        ? {
            content: reviews.slice(p * size, (p + 1) * size),
            totalElements: 62,
            totalPages: Math.ceil(62 / size),
            page: p,
            average: 2.5,
          }
        : url.pathname.endsWith("settings")
          ? {
              name: "Privê Lopes",
              whatsapp: "",
              heroTitle: "Sua viagem",
              heroText: "Descanso",
              footer: "Privê Lopes",
            }
          : { content: [], totalElements: 0, totalPages: 0, page: 0 },
    });
  });
  await page.goto("/");
  await expect(page.locator("#avaliacoes .review-card")).toHaveCount(6);
  const open = page.getByRole("button", {
    name: "Visualizar todas as avaliações",
  });
  await open.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".review-card")).toHaveCount(30);
  await dialog
    .getByRole("button", { name: "Carregar mais avaliações" })
    .click();
  await expect(dialog.locator(".review-card")).toHaveCount(60);
  await dialog
    .getByRole("button", { name: "Carregar mais avaliações" })
    .click();
  await expect(dialog.locator(".review-card")).toHaveCount(62);
  await expect(dialog.getByText("Hóspede 61", { exact: true })).toBeVisible();
  expect(
    await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
  await expect(page.locator("#avaliacoes .review-card")).toHaveCount(6);
});

test("admin manages reviews and public sees contact and zero stars", async ({
  page,
}) => {
  let reviews: Review[] = [];
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (path.includes("/reviews") && req.method() === "DELETE") {
      reviews = [];
      await route.fulfill({ status: 204 });
      return;
    }
    if (path.includes("/reviews") && ["POST", "PUT"].includes(req.method())) {
      const json = req
        .postDataBuffer()!
        .toString("utf8")
        .match(/\{\s*"customerName"[\s\S]*?\}/)![0];
      reviews = [
        {
          ...JSON.parse(json),
          id: "review-1",
          photoUrl: "/api/public/reviews/review-1/photo?v=1",
        },
      ];
      await route.fulfill({
        status: req.method() === "POST" ? 201 : 200,
        json: reviews[0],
      });
      return;
    }
    if (path.includes("/photo")) {
      await route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="orange"/></svg>',
      });
      return;
    }
    const data =
      path === "/api/auth/me"
        ? { email: "admin@example.com" }
        : path === "/api/auth/csrf"
          ? { token: "test", headerName: "X-CSRF-TOKEN" }
          : path.endsWith("/settings")
            ? {
                name: "Privê Lopes",
                whatsapp: "",
                heroTitle: "Dias de descanso",
                heroText: "Sua próxima viagem",
                footer: "Privê Lopes",
              }
            : path.endsWith("/reviews")
              ? {
                  content: reviews,
                  totalElements: reviews.length,
                  totalPages: reviews.length ? 1 : 0,
                  page: 0,
                  average: reviews[0]?.rating ?? 0,
                }
              : {
                  content: [],
                  totalElements: 0,
                  totalPages: 0,
                  page: 0,
                  size: 9,
                };
    await route.fulfill({ json: data });
  });
  await page.goto("/admin/configuracoes");
  await page
    .getByRole("button", { name: "Cadastrar avaliação", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome do cliente", { exact: true }).fill("Ana Souza");
  await dialog.getByLabel("Foto do cliente", { exact: true }).setInputFiles({
    name: "cliente.png",
    mimeType: "image/png",
    buffer: Buffer.from("test-photo"),
  });
  await dialog.getByLabel("Nota", { exact: true }).selectOption("0");
  await dialog
    .getByLabel("Hospedagem", { exact: true })
    .fill("Casa dos Carneiros");
  await dialog
    .getByLabel("Comentário", { exact: true })
    .fill("Atendimento muito atencioso e casa confortável.");
  await dialog
    .getByLabel("Contato do cliente (opcional)", { exact: true })
    .fill("@ana.souza");
  await dialog
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(page.getByText("Avaliação salva com sucesso.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Ana Souza", { exact: true })).toBeVisible();
  await page.goto("/");
  const section = page.locator("#avaliacoes");
  await expect(
    section.getByRole("img", { name: "0 de 5 estrelas" }),
  ).toBeVisible();
  await expect(
    section.getByRole("link", { name: "@ana.souza" }),
  ).toHaveAttribute("href", "https://www.instagram.com/ana.souza/");
  await expect(
    section.getByText("Hospedagem: Casa dos Carneiros"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await section.screenshot({ path: test.info().outputPath("reviews.png") });
  await page.goto("/admin/configuracoes");
  await page
    .getByRole("button", { name: "Editar avaliação de Ana Souza" })
    .click();
  await dialog.getByLabel("Nota", { exact: true }).selectOption("5");
  await dialog
    .getByLabel("Contato do cliente (opcional)", { exact: true })
    .fill("javascript:alert(1)");
  await dialog
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(page.getByText("Avaliação salva com sucesso.")).toBeVisible();
  await page.goto("/");
  await expect(
    section.getByRole("img", { name: "5 de 5 estrelas" }),
  ).toBeVisible();
  await expect(section.getByText(/javascript:alert/)).toBeVisible();
  await expect(section.getByRole("link")).toHaveCount(0);
  await page.goto("/admin/configuracoes");
  await page
    .getByRole("button", { name: "Excluir avaliação de Ana Souza" })
    .click();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByText("Ana Souza", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Excluir avaliação de Ana Souza" })
    .click();
  await dialog
    .getByRole("button", { name: "Confirmar exclusão", exact: true })
    .click();
  await expect(page.getByText("Avaliação excluída.")).toBeVisible();
  await page.goto("/");
  await expect(section).toHaveCount(0);
});
