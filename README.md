# pinequest-s5-episode-1-team-11

Halo — гэртээ ганцаараа байгаа хүүхэд, ахмад настан, хөгжлийн бэрхшээлтэй хүмүүсийн унах, орилох, уйлахыг камераар илрүүлж асран хамгаалагчид мэдэгдэнэ.

## Ажиллуулах

[Bun](https://bun.sh) 1.4+ хэрэгтэй (`curl -fsSL https://bun.sh/install | bash`).

```bash
bun install
cp .env.example .env.local   # Supabase-гүй бол хоосон үлдээж болно, жишээ өгөгдлөөр ажиллана
bun dev
```

http://localhost:3000 нээнэ.

## Шалгах

```bash
bun run check    # Biome + TypeScript + тест — PR бүрийн өмнө алдаагүй байх ёстой
bun run format   # формат, import-ын дарааллыг автоматаар засна
bun run build
```

## Текст ба хэл

Апп Монгол (үндсэн) ба англи хэлтэй. Feature бүр текстээ `src/features/<feature>/messages/mn.json`, `en.json`-д бичиж `useTranslations("<feature>")`-ээр уншина. Хоёр файлын түлхүүрүүд ижил байх ёстой, тест шалгана.
