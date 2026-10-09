import { useEffect } from "react";

export default function Seo({
  title,
  description,
  image,
  noindex = false,
}: {
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
}) {
  useEffect(() => {
    document.title = title;
    const update = (
      attribute: "name" | "property",
      key: string,
      content: string,
    ) => {
      let meta = document.querySelector<HTMLMetaElement>(
        `meta[${attribute}="${key}"]`,
      );
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attribute, key);
        document.head.append(meta);
      }
      meta.content = content;
    };
    update("name", "description", description);
    update("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    update("property", "og:title", title);
    update("property", "og:description", description);
    update("property", "og:url", window.location.href.split("?")[0]);
    update(
      "property",
      "og:image",
      new URL(image ?? "/images/hero.jpg", window.location.origin).href,
    );
    update("name", "twitter:card", "summary_large_image");
  }, [title, description, image, noindex]);
  return null;
}
