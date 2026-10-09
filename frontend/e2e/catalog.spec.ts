import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(
  readFileSync(path.join(root, ".env"), "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);
async function mutate(
  request: APIRequestContext,
  method: string,
  url: string,
  data?: unknown,
) {
  const token = await (await request.get("/api/auth/csrf")).json();
  return request.fetch(url, {
    method,
    data,
    headers: { [token.headerName]: token.token },
    timeout: 10000,
  });
}
async function login(request: APIRequestContext) {
  const response = await mutate(request, "POST", "/api/auth/login", {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });
  expect(response.status()).toBe(200);
}
test("catálogo responsivo, navegação e busca vazia", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Seu próximo destino começa aqui." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hospedagens em destaque" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Qual é o seu próximo destino?" })
    .fill("imovel-inexistente-xyz");
  await page.getByRole("button", { name: "Encontrar", exact: true }).click();
  await expect(page).toHaveURL(/imoveis\?search=/);
  await expect(
    page.getByRole("heading", { name: "Nenhuma hospedagem encontrada" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Filtros" }).click();
  await page.getByLabel("Cidade", { exact: true }).fill("Recife");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/city=Recife/);
  await page.getByRole("button", { name: /Filtros/ }).click();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(
    page.getByRole("textbox", { name: "Pesquisar hospedagens" }),
  ).toHaveValue("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/");
  await expect(page.locator(".feedback")).toHaveCount(0);
  await page.screenshot({
    path: path.join(root, ".local", `home-${info.project.name}.png`),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("painel é restrito e formulário de login valida dados", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/admin\/login/);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  await expect(page.getByText("Informe sua senha.")).toBeVisible();
});
test("cadastro, mídia, publicação, WhatsApp e exclusão com confirmação", async ({
  page,
}, info) => {
  await login(page.request);
  const originalSettings = await (
    await page.request.get("/api/public/settings")
  ).json();
  let propertyId: string | undefined;
  try {
    await mutate(page.request, "PUT", "/api/admin/settings", {
      ...originalSettings,
      whatsapp: "5581999999999",
    });
    await page.goto("/admin/imoveis/novo");
    const title = `Casa de teste ${info.project.name} ${Date.now()}`;
    await page.getByLabel("Título *", { exact: true }).fill(title);
    await page
      .getByLabel("Descrição *", { exact: true })
      .fill("Um imóvel de teste completo, com varanda e iluminação natural.");
    await page
      .getByLabel("Valor de referência para temporada (R$) *", { exact: true })
      .fill("1500.75");
    await page.getByLabel("Cidade *", { exact: true }).fill("Recife");
    await page
      .getByRole("combobox", { name: "Estado *", exact: true })
      .selectOption("PE");
    await page.getByLabel("Bairro *", { exact: true }).fill("Boa Viagem");
    await page
      .getByLabel("Endereço complementar", { exact: true })
      .fill("ENDERECO-PRIVADO-123");
    await page
      .getByRole("button", { name: "Salvar hospedagem", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/admin\/imoveis\/[0-9a-f-]{36}$/);
    propertyId = page.url().split("/").at(-1);
    const draft = await (
      await page.request.get(`/api/admin/properties/${propertyId}`)
    ).json();
    expect(
      (await page.request.get(`/api/public/properties/${draft.slug}`)).status(),
    ).toBe(404);
    for (const field of ["area", "bedrooms", "guests", "condoFee"])
      expect(draft[field]).toBeUndefined();
    await page
      .getByLabel("Selecionar fotos e vídeos", { exact: true })
      .setInputFiles([
        path.join(root, "backend/src/main/resources/demo/casa.png"),
        path.join(root, "frontend/e2e/fixtures/tour.mp4"),
      ]);
    await page.getByRole("button", { name: "Enviar arquivos" }).click();
    await expect(
      page.getByRole("button", { name: "Uploads concluídos" }),
    ).toBeVisible();
    await expect(page.getByText("Principal", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Mover tour.mp4 para trás" })
      .click();
    await expect(
      page.locator(".media-item").first().locator("video"),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Situação da hospedagem", exact: true })
      .selectOption("DISPONIVEL");
    await page
      .getByRole("button", { name: "Salvar hospedagem", exact: true })
      .first()
      .click();
    await expect(page.getByText("Hospedagem salva com sucesso.")).toBeVisible();
    await page.goto(`/imoveis/${draft.slug}`);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("ENDERECO-PRIVADO-123")).toHaveCount(0);
    const whatsapp = page.getByRole("link", {
      name: "Consultar disponibilidade",
    });
    const contact = new URL((await whatsapp.getAttribute("href"))!);
    expect(contact.host).toBe("wa.me");
    expect(contact.searchParams.get("text")).toContain(title);
    expect(contact.searchParams.get("text")).toContain(
      `/imoveis/${draft.slug}`,
    );
    await page.getByRole("button", { name: /Ver todas as mídias/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("button", { name: "Próxima mídia", exact: true })
      .click();
    await expect(page.getByRole("dialog").locator("video")).toBeVisible();
    await expect
      .poll(() =>
        page
          .getByRole("dialog")
          .locator("video")
          .evaluate((element: HTMLVideoElement) => element.readyState),
      )
      .toBeGreaterThanOrEqual(1);
    const published = await (
      await page.request.get(`/api/admin/properties/${propertyId}`)
    ).json();
    const video = published.media.find(
      (m: { type: string }) => m.type === "VIDEO",
    );
    const range = await page.request.get(
      video.url.replace("/admin/", "/public/"),
      { headers: { Range: "bytes=0-15" } },
    );
    expect(range.status()).toBe(206);
    expect((await range.body()).length).toBe(16);
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await page.screenshot({
      path: path.join(root, ".local", `detail-${info.project.name}.png`),
      fullPage: true,
    });
    await page.goto("/admin/imoveis");
    await page
      .getByRole("textbox", { name: "Buscar hospedagens no painel" })
      .fill(title);
    await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
    await page.getByRole("button", { name: `Excluir ${title}` }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(page.getByRole("link", { name: title })).toBeVisible();
    await page.getByRole("button", { name: `Excluir ${title}` }).click();
    await page.getByRole("button", { name: "Sim, excluir hospedagem" }).click();
    await expect(
      page.getByRole("heading", { name: "Nenhuma hospedagem encontrada" }),
    ).toBeVisible();
    expect(
      (await page.request.get(`/api/public/properties/${draft.slug}`)).status(),
    ).toBe(404);
    for (const field of ["area", "bedrooms", "guests", "condoFee"])
      expect(draft[field]).toBeUndefined();
    propertyId = undefined;
    await page.goto("/admin");
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await expect(page).toHaveURL(/admin\/login/);
    expect((await page.request.get("/api/admin/dashboard")).status()).toBe(401);
  } finally {
    test.setTimeout(test.info().timeout + 15000);
    await login(page.request);
    if (propertyId)
      await mutate(
        page.request,
        "DELETE",
        `/api/admin/properties/${propertyId}`,
      );
    await mutate(page.request, "PUT", "/api/admin/settings", originalSettings);
  }
});

test("configurações atualizam marca, apresentação, imagens e contato oficial", async ({
  page,
}, info) => {
  await login(page.request);
  const original = await (
    await page.request.get("/api/public/settings")
  ).json();
  let logoCreated = false;
  let heroCreated = false;
  const name = `Privê Lopes | Hospedagens ${info.project.name}`;
  const title = `Sua temporada de teste ${info.project.name}`;
  try {
    await page.goto("/admin/configuracoes");
    await page.getByLabel("Nome da marca", { exact: true }).fill(name);
    await page.getByLabel("Chamada principal", { exact: true }).fill(title);
    await page
      .getByLabel("Texto de apresentação", { exact: true })
      .fill("Dias de descanso e conforto para a sua próxima viagem.");
    await page.getByLabel("WhatsApp", { exact: true }).fill("5581995809198");
    await page
      .getByRole("button", { name: "Salvar alterações", exact: true })
      .click();
    await expect(
      page.getByText("Configurações salvas com sucesso."),
    ).toBeVisible();
    if (!original.logoUrl) {
      logoCreated = true;
      await page
        .getByLabel("Selecionar logotipo", { exact: true })
        .setInputFiles(
          path.join(root, "backend/src/main/resources/demo/casa.png"),
        );
      await expect(page.locator(".logo-preview")).toBeVisible();
    }
    if (!original.heroImageUrl) {
      heroCreated = true;
      await page
        .getByLabel("Selecionar foto principal", { exact: true })
        .setInputFiles(
          path.join(root, "backend/src/main/resources/demo/casa.png"),
        );
      await expect(page.locator(".hero-preview")).toBeVisible();
    }
    const configured = await (
      await page.request.get("/api/public/settings")
    ).json();
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: `${name} — página inicial`, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".hero-visual > img")).toHaveAttribute(
      "src",
      configured.heroImageUrl,
    );
    await expect(page.locator(".hero-caption")).toHaveCount(0);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      "href",
      configured.logoUrl,
    );
    const official =
      "http://wa.me/5581995809198?text=Oi%2C+tenho+interesse+na+casa";
    await expect(page.locator(".hero-actions a").first()).toHaveAttribute(
      "href",
      official,
    );
    await expect(page.locator(".whatsapp-float")).toHaveAttribute(
      "href",
      official,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "Abrir menu" }).click();
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Contatos", exact: true })
      .click();
    await expect(page).toHaveURL(/\/contatos$/);
    await expect(
      page.getByRole("heading", { name: "O que enviar na sua mensagem" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Falar pelo WhatsApp", exact: true }),
    ).toHaveAttribute("href", official);
    await expect(page).toHaveTitle(`Contatos | ${name}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: path.join(root, ".local", `contacts-${info.project.name}.png`),
      fullPage: true,
    });
  } finally {
    if (logoCreated)
      await mutate(page.request, "DELETE", "/api/admin/settings/logo");
    if (heroCreated)
      await mutate(page.request, "DELETE", "/api/admin/settings/hero");
    await mutate(page.request, "PUT", "/api/admin/settings", original);
  }
});
