import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Halo — Гэрийн аюулгүй байдал",
    short_name: "Halo",
    description: "Гэрийн камерын дохио, үйл явдал, гэр бүлийн мэдэгдэл.",
    lang: "mn",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#08181c",
    theme_color: "#08181c",
    icons: [
      { src: "/icons/halo-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/halo-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/halo-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
