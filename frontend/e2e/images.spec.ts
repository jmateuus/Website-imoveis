import { test, expect } from "@playwright/test";

const dimensions = [
  [600, 2400],
  [6000, 300],
  [321, 321],
  [19, 37],
  [1, 5000],
];

test("gallery, cards and lightbox preserve unusual images within the viewport", async ({
  page,
}) => {
  const media = dimensions.map(([w, h], i) => ({
    id: `image-${i}`,
    type: "IMAGEM",
    url: `/fixtures/${i}.svg`,
    thumbnailUrl: `/fixtures/${i}.svg?thumbnail=true`,
    originalName: `${w}x${h}`,
    position: i,
    primaryImage: i === 0,
    contentType: "image/svg+xml",
    size: 100,
  }));
  const property = {
    id: "property",
    slug: "image-test",
    title: "Hospedagem de teste ".repeat(8),
    description: "Teste de proporções",
    type: "CASA",
    status: "DISPONIVEL",
    city: "Recife",
    state: "PE",
    neighborhood: "Centro",
    amenities: [],
    media,
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith("settings")
      ? {
          name: "Teste",
          whatsapp: "",
          heroTitle: "Teste",
          heroText: "",
          footer: "",
        }
      : path.endsWith("image-test")
        ? property
        : {
            content: [{ ...property, id: "related" }],
            totalElements: 1,
            totalPages: 1,
            page: 0,
            size: 4,
          };
    await route.fulfill({ json: data });
  });
  await page.route("**/fixtures/**", async (route) => {
    const i = Number(
      new URL(route.request().url()).pathname.match(/(\d+)\.svg/)![1],
    );
    const [w, h] = dimensions[i];
    await route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="orange"/><path d="M0 0L${w} ${h}M${w} 0L0 ${h}" stroke="black"/></svg>`,
    });
  });
  await page.goto("/imoveis/image-test");
  for (const selector of [".gallery img", ".card-photo img"]) {
    const images = page.locator(selector);
    await expect(images.first()).toBeVisible();
    for (const image of await images.all())
      await expect(image).toHaveCSS("object-fit", "cover");
  }
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.getByRole("button", { name: /Ver todas as mídias/ }).click();
  const dialog = page.getByRole("dialog");
  const image = dialog.locator("img");
  for (let i = 0; i < dimensions.length; i++) {
    await expect(image).toHaveAttribute("src", media[i].url);
    await expect
      .poll(() =>
        image.evaluate(
          (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(image).toHaveCSS("object-fit", "contain");
    const geometry = await image.evaluate((el: HTMLImageElement) => {
      const box = el.getBoundingClientRect();
      const stage = el.parentElement!.getBoundingClientRect();
      const modal = el.closest('[role="dialog"]')!.getBoundingClientRect();
      return {
        natural: [el.naturalWidth, el.naturalHeight],
        withinStage:
          box.width <= stage.width + 1 && box.height <= stage.height + 1,
        withinViewport:
          modal.top >= 0 &&
          modal.bottom <= innerHeight &&
          modal.left >= 0 &&
          modal.right <= innerWidth,
        noScroll:
          el.closest('[role="dialog"]')!.scrollHeight <= modal.height + 1,
      };
    });
    expect(geometry.natural).toEqual(dimensions[i]);
    expect(geometry.withinStage).toBe(true);
    expect(geometry.withinViewport).toBe(true);
    expect(geometry.noScroll).toBe(true);
    await expect(
      dialog.getByRole("button", { name: "Próxima mídia", exact: true }),
    ).toBeInViewport();
    await page.keyboard.press("ArrowRight");
  }
  await expect(image).toHaveAttribute("src", media[0].url);
  await page.keyboard.press("ArrowLeft");
  await expect(image).toHaveAttribute("src", media.at(-1)!.url);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
