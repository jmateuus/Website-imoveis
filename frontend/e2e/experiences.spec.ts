import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Experience, Media } from "../src/lib/types";

test("admin creates publishes and deletes a story with media; visitors read the feed and detail", async ({
  page,
}) => {
  let story: Experience | null = null;
  const photo = readFileSync(
    path.resolve("../backend/src/main/resources/demo/casa.png"),
  );
  const video = readFileSync(path.resolve("e2e/fixtures/tour.mp4"));
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      p = url.pathname,
      method = req.method();
    if (p.includes("/photo") || p.includes("/media/")) {
      if (method === "GET") {
        await route.fulfill({
          contentType: p.endsWith("v1") ? "video/mp4" : "image/png",
          body: p.endsWith("v1") ? video : photo,
        });
        return;
      }
    }
    if (p.endsWith("/media") && method === "POST") {
      const isVideo = req.postDataBuffer()!.includes(Buffer.from("tour.mp4"));
      const id = isVideo ? "v1" : "m1";
      const m: Media = {
        id,
        type: isVideo ? "VIDEO" : "IMAGEM",
        url: `/api/public/media/${id}`,
        thumbnailUrl: isVideo ? undefined : `/api/public/media/${id}`,
        originalName: isVideo ? "tour.mp4" : "praia.png",
        contentType: isVideo ? "video/mp4" : "image/png",
        size: 100,
        position: story!.media.length,
        primaryImage: !isVideo,
      };
      story!.media.push(m);
      await route.fulfill({ status: 201, json: m });
      return;
    }
    if (p.endsWith("/primary") && method === "PUT") {
      const id = p.split("/").at(-2);
      story!.media.forEach((m) => {
        m.primaryImage = m.id === id;
      });
      await route.fulfill({ status: 204 });
      return;
    }
    if (p.includes("/experiences") && ["POST", "PUT"].includes(method)) {
      const raw = req.postDataBuffer()!.toString("utf8");
      const input = JSON.parse(
        raw.match(/\{"title":[\s\S]*?"contact":"[^"]*"\}\}/)![0],
      );
      story = {
        ...input,
        id: "e1",
        propertySlug: null,
        review: {
          ...input.review,
          id: "e1",
          photoUrl: "/api/public/experiences/e1/photo",
        },
        media: story?.media ?? [],
      };
      await route.fulfill({
        status: method === "POST" ? 201 : 200,
        json: story,
      });
      return;
    }
    if (p.includes("/experiences") && method === "DELETE") {
      story = null;
      await route.fulfill({ status: 204 });
      return;
    }
    const admin = p.includes("/admin/");
    const content = story && (admin || story.published) ? [story] : [];
    const json =
      p === "/api/auth/me"
        ? { email: "admin@example.com" }
        : p === "/api/auth/csrf"
          ? { token: "test", headerName: "X-CSRF-TOKEN" }
          : p.endsWith("settings")
            ? {
                name: "Privê Lopes",
                whatsapp: "",
                heroTitle: "Dias leves",
                heroText: "Descanso",
                footer: "Privê Lopes",
              }
            : p.endsWith("/experiences/e1")
              ? story
              : p.endsWith("/experiences")
                ? {
                    content,
                    totalElements: content.length,
                    totalPages: content.length ? 1 : 0,
                    page: 0,
                    size: 12,
                  }
                : { content: [], totalElements: 0, totalPages: 0, page: 0 };
    await route.fulfill({ json });
  });
  await page.goto("/admin/vivencias");
  await page.getByRole("link", { name: "Cadastrar vivência" }).click();
  await page
    .getByLabel("Título", { exact: true })
    .fill("Dias de sol em família");
  await page
    .getByLabel("Descrição da vivência", { exact: true })
    .fill(
      "Foram dias de descanso e diversão em família. Uma viagem para guardar na memória.",
    );
  await page
    .getByLabel("Tempo de hospedagem", { exact: true })
    .fill("4 noites");
  await page
    .getByLabel("Nome da hospedagem", { exact: true })
    .fill("Casa Praia dos Carneiros");
  await page.getByLabel("Nome do cliente", { exact: true }).fill("Ana Souza");
  await page
    .getByLabel("Foto do cliente", { exact: true })
    .setInputFiles({ name: "ana.png", mimeType: "image/png", buffer: photo });
  await page.getByLabel("Nota", { exact: true }).selectOption("0");
  await page
    .getByLabel("Comentário da avaliação", { exact: true })
    .fill("Casa confortável e atendimento muito atencioso.");
  await page
    .getByLabel("Contato do cliente (opcional)", { exact: true })
    .fill("@ana.souza");
  await page
    .getByRole("button", { name: "Salvar vivência", exact: true })
    .click();
  await expect(page).toHaveURL(/admin\/vivencias\/e1$/);
  await page
    .getByLabel("Selecionar fotos e vídeos", { exact: true })
    .setInputFiles([
      { name: "praia.png", mimeType: "image/png", buffer: photo },
      { name: "tour.mp4", mimeType: "video/mp4", buffer: video },
    ]);
  await page.getByRole("button", { name: "Enviar arquivos" }).click();
  await expect(
    page.getByRole("button", { name: "Uploads concluídos" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Definir tour.mp4 como principal" })
    .click();
  await page.getByLabel("Publicar vivência no site", { exact: true }).check();
  await page
    .getByRole("button", { name: "Salvar vivência", exact: true })
    .click();
  await expect(page.getByText("Vivência salva com sucesso.")).toBeVisible();
  await page.goto("/vivencias");
  const preview = page.locator(".experience-cover video");
  await expect(preview).toBeVisible();
  await expect
    .poll(() =>
      preview.evaluate(
        (v: HTMLVideoElement) =>
          v.readyState >= 2 && v.videoWidth > 0 && v.paused,
      ),
    )
    .toBe(true);
  await expect(preview).toHaveCSS("object-fit", "cover");
  await page.getByRole("link", { name: "Ler Dias de sol em família" }).click();
  await expect(
    page.getByRole("heading", { name: "Dias de sol em família", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "0 de 5 estrelas" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "@ana.souza" })).toBeVisible();
  await page.getByRole("button", { name: /Ver todas as mídias/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("video")).toHaveCSS("object-fit", "contain");
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator("img")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("experience-detail.png"),
    fullPage: true,
  });
  await page.goto("/admin/vivencias");
  await page
    .getByRole("button", { name: "Excluir Dias de sol em família" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(
    page.getByText("Dias de sol em família", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Excluir Dias de sol em família" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar exclusão", exact: true })
    .click();
  await expect(page.getByText("Nenhuma vivência cadastrada.")).toBeVisible();
  await page.goto("/vivencias");
  await expect(page.getByText("Novas vivências em breve")).toBeVisible();
});
