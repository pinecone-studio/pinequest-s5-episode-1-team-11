# Halo

Гэртээ ганцаараа байгаа хүмүүсийн аюултай нөхцөлийг камерын дүрс, дуугаар илрүүлж асран хамгаалагчид мэдэгдэх систем.

Эхний зорилго: утас эсвэл laptop-ын browser камераар хянах. Дараагийн зорилго: CCTV-ийн RTSP урсгалыг go2rtc → WebRTC-аар авч ижил detection/event pipeline-д холбох. Inference төхөөрөмж дээрээ ажиллана.

Одоогийн хувилбар нь суурь: shared UI, contract, Supabase schema/RLS, auth, query болон placeholder route. Камер, inference, device API, push илгээлт болон feature дэлгэцүүд хэрэгжээгүй.

## Ажиллуулах

[Bun](https://bun.sh) 1.4+ хэрэгтэй (`curl -fsSL https://bun.sh/install | bash`).

```bash
bun install
cp .env.example .env.local   # Supabase-гүй бол хоосон үлдээж болно, жишээ өгөгдлөөр ажиллана
bun dev
```

[http://localhost:3000](http://localhost:3000) нээнэ. Supabase-ийн утга хоосон бол query-ууд жишээ өгөгдөл буцаана. Холбогдсон үед query алдааг жишээ өгөгдлөөр нуухгүй.

- `/design` — shared component, light/dark, palette болон хэлний showcase.
- `/dev` — хөгжүүлэлтийн үед жишээ төлөв солих, route болон query өгөгдөл шалгах. Supabase + server key тохируулсан бол нэвтэрсэн хэрэглэгчийн гэр бүлд тест event үүсгэж, төхөөрөмжийг offline болгож болно. Production-д 404.
- `/login`, `/signup`, `/setup-household` — auth суурь.
- `/monitor` — утас/laptop-ыг камер болгоно: 6 оронтой кодоор холбогдоод (эсвэл `?code=123456`), камер+микрофоноор унах, орилох, удаан уйлах, шил хагарах, галын дохиог илрүүлнэ. Supabase-гүй үед **Туршилтын горим** — илрүүлэлт зөвхөн дэлгэц дээр харагдана.
- `/home`, `/events`, `/devices`, `/settings`, `/onboarding`, `/invite/[code]` болон нийтийн хуудсууд — placeholder.

## Шалгах

```bash
bun run check    # Biome + TypeScript + тест — PR бүрийн өмнө алдаагүй байх ёстой
bun run format   # формат, import-ын дарааллыг автоматаар засна
bun run build
```

Turbopack тухайн орчинд ажиллахгүй бол `bun run build --webpack` ашиглаж болно. SQL тестүүд migration-уудыг өөрчлөлтгүйгээр локал PostgreSQL (PGlite) дээр ажиллуулна; Docker болон cloud холболт шаардахгүй.

## Supabase холбох

1. `supabase/migrations/` доторх бүх SQL файлыг filename-ийн дарааллаар өөрийн Supabase project дээр ажиллуулна (`supabase db push` эсвэл SQL Editor). Дарааллаар нь tables → RLS/storage → household/pairing/invite functions → device API functions.
2. `.env.local`-д URL, publishable key тавина. `SUPABASE_SECRET_KEY` нь зөвхөн server-side device API болон development хэрэгсэлд хэрэглэгдэнэ.
3. Supabase Auth-ийн Site URL-ийг `NEXT_PUBLIC_SITE_URL`-тай тааруулж, `/auth/callback` URL-ийг Redirect URLs-д зөвшөөрнө. Email confirmation асаалттай бүртгэл PKCE callback ашиглана; token-hash email template ашиглавал `/auth/confirm?token_hash=…&type=email` route бэлэн.
4. Push мэдэгдлийн VAPID түлхүүр үүсгэнэ: `bun run vapid`. Public Key-г `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, Private Key-г `VAPID_PRIVATE_KEY`-д тавина. Түлхүүрийг нэг удаа үүсгээд бүх хүн, Vercel ижлийг ашиглана; солих юм бол өмнөх бүх мэдэгдлийн бүртгэл хүчингүй болно. Private key-г хэзээ ч commit хийхгүй.
5. Нэвтэрч гэр бүлээ үүсгэнэ. MVP-д нэг account нэг гэр бүлд харьяалагдана.

Migration нь private `event-snapshots` bucket, events/devices Realtime publication болон household-scoped access policy үүсгэнэ. Бодит төхөөрөмжийн token зөвхөн hash хэлбэрээр `private.device_tokens`-д хадгалагдана.

Demo seed хэрэгтэй бол эхлээд жирийн auth account үүсгэнэ. SQL Editor-ийн **нэг batch** дотор доорх мөрийн араас `supabase/demo-seed.sql`-ийн бүх агуулгыг ажиллуулна:

```sql
select set_config('halo.seed_user_id', 'YOUR_AUTH_USER_UUID', false);
```

Файлыг санаатайгаар `seed.sql` гэж нэрлээгүй: Supabase CLI үүнийг автоматаар ажиллуулж алдаа өгөхөөс сэргийлнэ. Seed нь account үүсгэхгүй, зөвхөн тухайн owner-ийн гэр бүлд `Demo ·` өгөгдөл нэмнэ. Давтан ажиллуулахад давхардахгүй. Demo device-үүд pair хийгдээгүй, бодит camera/CCTV холбогдоогүй.

## Залгах цэгүүд

`src/contracts/` нь browser болон ирээдүйн CCTV төхөөрөмжийн нийтлэг device, pairing, event ingestion, push schema-г тодорхойлно.

Камер төхөөрөмжийн API (`src/app/api/v1/`) нь хэрэглэгчийн cookie биш, `Authorization: Bearer <deviceToken>` ашиглана:

- `POST /api/v1/devices/pair` — `{ code, kind }` → `{ deviceId, deviceToken, name, roomName }`. Код нэг удаа, 10 минут хүчинтэй. Нэг хаягаас 10 минутад 10-аас олон буруу оролдлого хийвэл 429.
- `POST /api/v1/devices/heartbeat` — 30 секунд тутам. Төхөөрөмжийг online болгож `{ deviceId, name, roomName, settings }` буцаана, тиймээс асран хамгаалагчийн өөрчилсөн тохиргоо камерт шууд хүрнэ. 401 бол камер салгагдсан.
- `POST /api/v1/events` — `EventIngest` (`idempotencyKey`, `kind`, `confidence`, `occurredAt`, сонголтоор `snapshot` JPEG base64). Ижил key-ээр дахин илгээвэл эхний event-ийг `duplicate: true`-тай буцаана, тиймээс сүлжээ тасарсан үед дахин оролдох нь аюулгүй. Асран хамгаалагч тухайн төрлийг унтраасан бол 202 `ignored`. Нэг камер 10 минутад 30-аас олон event илгээвэл 429. Хариу өгсний дараа `notifyEvent`-ээр гэр бүлийн бүх гишүүнд push илгээж, хүчингүй болсон subscription-ыг устгана.
- `DELETE /api/v1/devices/me` — камер өөрийгөө салгана. Event-үүд үлдэнэ. `src/lib/routes.ts` нь route-уудын shared contract.

Feature-ийн `queries.ts` нь `src/lib/data/queries.ts`-ийн household-scoped өгөгдлийг ашиглана. User query нь publishable client + RLS ашиглаж, private snapshot URL-ийг 60 секундээр гаргана. Supabase тохируулсан үед auth-гүй query нэвтрэх хуудас руу шилжинэ.

`src/features/notifications/server/notify-event.ts` дахь `notifyEvent(event, subscriptions)` одоогоор `{ sent: 0, expired: [] }` буцаадаг stub. `NotificationSettings` нь settings route-д залгах хоосон slot. Эдгээрийн бодит ажиллагааг notification feature хэрэгжүүлнэ.

## AI илрүүлэлт

Бүх inference төхөөрөмж дээр ажиллана, видео сервер рүү явахгүй. [MediaPipe](https://ai.google.dev/edge/mediapipe) `PoseLandmarker` (lite, ~5 MB) биеийн 33 цэг, `AudioClassifier` + YAMNet (~4 MB) дууны 521 ангиллыг өгнө. Model болон wasm-ыг эхний удаа CDN-ээс татаж browser cache-д хадгална.

- `src/detection/fall.ts` — хонго огцом унах → хэвтээ байрлал → хэдэн секунд босохгүй бол унасан. Хүүхдэд илүү хүчтэй уналт, урт хугацаа шаардана (тоглож байгаад шалан дээр хэвтэх нь элбэг).
- `src/detection/sounds.ts` — орилох (давтагдсан), удаан уйлах (20 с, хүүхдэд 60 с), шил хагарах (нэг удаа), галын дохио (3 с).
- `src/detection/engine.ts` — тохиргоо (унах/дуу/аюул асаах-унтраах, мэдрэмж), төрөл бүрийн cooldown, орилсны дараах уналтын итгэлийг өсгөнө.
- `src/detection/runtime/` — browser-ийн камер, микрофон, model ажиллуулагч. `VideoSource` нь CCTV урсгал залгах цэг.

Дүрмүүдийг `bun run test`-ийн synthetic pose/дууны тестүүд шалгана. Камергүйгээр турших бол development үед `public/` дотор видео тавиад `/monitor?video=/clip.mp4` нээнэ (видеоны дуу бас шинжлэгдэнэ). Жишээ нь галын дохионы дуу:

```bash
ffmpeg -f lavfi -i testsrc=size=640x480:rate=15 -f lavfi -i "sine=frequency=3150,volume='if(lt(mod(t,1),0.5),1,0)':eval=frame" -t 12 -pix_fmt yuv420p -shortest public/alarm.mp4
```

## Дэлгэцийн хэмжээ

Апп утсанд эхэлж зохиогдсон ч таблет, компьютер дээр ч гоё харагдах ёстой. `AppFrame` нь утсанд нэг багана, таблетад өргөн (`md:`), компьютерт хажуу цэстэй өргөн (`lg:`, 1024px+) хэлбэртэй. Доод цэс нь компьютерт хажуу цэс (`SideNav`) болно, `Sheet` баруун талаас гарна.

Дэлгэц бүрээ утсанд эхэлж хийгээд том дэлгэцэд `md:`/`lg:` grid нэмнэ. Жишээ нь нүүр: `lg:grid-cols-[minmax(0,1fr)_380px]`, жагсаалт: `lg:grid-cols-2`. PR-т 375px ба 1440px хоёр зураг хавсаргана.

## Текст ба хэл

Апп Монгол (үндсэн) ба англи хэлтэй. Feature бүр текстээ `src/features/<feature>/messages/mn.json`, `en.json`-д бичиж `useTranslations("<feature>")`-ээр уншина. Хоёр файлын түлхүүрүүд ижил байх ёстой, тест шалгана.
