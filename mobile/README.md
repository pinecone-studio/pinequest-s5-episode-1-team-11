# Halo mobile

## Хавтасны бүтэц
Expo, React Native, TypeScript, Supabase ашигласан асран хамгаалагчийн app-ийн эх код.

```text
repo/
└── mobile/
    ├── package.json          # create-expo-app үүсгэнэ
    ├── package-lock.json     # npm mobile/ дотор үүсгэнэ
    ├── app.json
    ├── tsconfig.json
    ├── .gitignore
    ├── .env.example
    ├── .env                  # өөрийн publishable тохиргоо
    ├── expo-env.d.ts         # Expo автоматаар үүсгэнэ
    └── src/
        ├── app/
        │   ├── _layout.tsx
        │   ├── login.tsx
        │   ├── (tabs)/
        │   │   ├── _layout.tsx
        │   │   ├── index.tsx
        │   │   ├── events.tsx
        │   │   └── family.tsx
        │   ├── events/
        │   │   └── [id].tsx
        │   └── devices/
        │       └── [id].tsx
        ├── components/
        │   ├── ui.tsx
        │   ├── Snapshot.tsx
        │   ├── EventRow.tsx
        │   ├── HaloTabBar.tsx
        │   ├── CriticalAlert.tsx
        │   ├── FamilyActions.tsx   # мэдэгдэл, камер нэмэх, урих
        │   └── PushSetup.tsx
        ├── providers/
        │   ├── AuthProvider.tsx
        │   └── HouseholdProvider.tsx
        └── lib/
            ├── types.ts
            ├── supabase.ts
            ├── dashboard.ts
            ├── push.ts
            └── events.ts
```
## Дэлгэцийн файлууд

Энд байгаа файлууд нь таны web repo-д байрлуулах mobile эх код. Энэ workspace-д web repo болон Supabase тохиргоо байхгүй тул dependency scaffold, бодит төхөөрөмжийн болон backend-ийн туршилтыг гүйцэтгээгүй. Доорх бүх засвар, эх код, install target зөвхөн `mobile/` дотор байна.
| Дэлгэц | Байрлах файл |
| --- | --- |
| Нэвтрэх | `src/app/login.tsx` |
| Нүүр | `src/app/(tabs)/index.tsx` |
| Үйл явдал | `src/app/(tabs)/events.tsx` |
| Дэлгэрэнгүй | `src/app/events/[id].tsx` |
| Гэр бүл, тохиргоо, бүртгэл устгах | `src/app/(tabs)/family.tsx` |
| Төхөөрөмж засах, устгах, detection | `src/app/devices/[id].tsx` |
| Улаан alert | `src/components/CriticalAlert.tsx` |

## 1. Expo үүсгэх
Бүтэн код тус тусын файлдаа байна. Нүүрийн UI-г үзэхдээ `src/app/(tabs)/index.tsx`-ийг нээнэ.

Таны **жинхэнэ web repo-ийн root**-оос, `mobile/` хараахан байхгүй үед:
## Холболт

```bash
npx create-expo-app@latest mobile --no-install
cd mobile
```
- `src/lib/supabase.ts` — publishable key, AsyncStorage session.
- `src/providers/AuthProvider.tsx` — нэвтрэлт, session сэргээх.
- `src/providers/HouseholdProvider.tsx` — гэр бүл, өгөгдөл, realtime.
- `src/lib/events.ts` — дохионы query болон conditional update.
- `src/components/Snapshot.tsx` — 60 секундийн signed URL.
- `src/components/ui.tsx` — өнгө, карт, товч зэрэг нийтлэг UI.

Таны хүссэн `npx create-expo-app@latest mobile` үүсгэх алхмыг `--no-install`-тай хийж байна: dependency суулгалтыг `mobile/` дотор тусад нь ажиллуулна. Root workspace-ийн package/lock файлыг install-аар өөрчлөхөөс зайлсхийхийн тулд npm workspace auto-detection-ийг унтраана.
## Одоогийн байдал

```bash
npm install --workspaces=false
npm_config_workspaces=false npx expo install --npm @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill expo-linear-gradient @expo/vector-icons
```
Энэ workspace-д эх кодыг бэлдсэн. Таны VS Code-д нээлттэй repo-д хуулж, Expo dependency болон Supabase тохиргоог холбоно.

Default Expo template нь Expo Router, TypeScript, safe-area болон шаардлагатай үндсэн navigation package-уудыг өгнө. Хувилбарын дугаарыг гараар таахын оронд үүсгэсэн `package.json` болон `package-lock.json`-ийг хадгална. Expo-ийн сангуудыг `expo install` SDK-д нь тааруулна. [Expo create-expo-app](https://docs.expo.dev/more/create-expo/), [Supabase React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native).

Дараа нь **шинэ scaffold-ийн** template route-уудыг `mobile/src/app/`-оос гаргаж, доор өгсөн route файлуудаар солино. Template нь `mobile/app/` route root-той үүссэн бол тэр template route-уудыг мөн `mobile/` дотор backup хавтас руу зөөнө; route root-оор зөвхөн `mobile/src/app/` ашиглана. Бусад web repo файлыг өөрчлөхгүй. Энэ кодын багцын `src/`, `app.json`, `tsconfig.json`, `.gitignore`, `.env.example`-ийг scaffold-ийн `mobile/` дотор байрлуулна. Үүссэн бусад config файлыг хадгалж болно.

Scaffold-ийн `package.json` дахь entry нь `"main": "expo-router/entry"` байна. Гараар dependency version бүхий package.json солиогүй.

## 2. Supabase тохиргоо

Бүх дараагийн командыг `mobile/` дотор ажиллуулна.

```bash
cp .env.example .env
```

`mobile/.env`-д өөрийн URL болон **sb_publishable_...** key-г оруулна. Env уншихад `process.env.EXPO_PUBLIC_...` гэсэн static property ашигласан. Secret/service-role key, backend admin API, хэрэглэгчийн нууц үгийг disk-д хадгалах код байхгүй. Session нь AsyncStorage-д хадгалагдана.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
EXPO_PUBLIC_SITE_URL=https://halo-team11.vercel.app
EXPO_PUBLIC_USE_RN_FETCH=1
```

Expo SDK 57 нь native дээр `expo/fetch`-ийг default болгодог. iOS buffered response-ийн мэдэгдсэн доголдлыг тойрохын тулд `EXPO_PUBLIC_USE_RN_FETCH=1` ашиглаж React Native-ийн transport-ийг хадгална. [Expo fetch тохиргоо](https://docs.expo.dev/versions/v57.0.0/sdk/expo/#expofetch-api), [iOS buffered fetch issue](https://github.com/expo/expo/issues/50213). SDK-ийн native fetch засвар батлагдсаны дараа энэ тохиргоог дахин үнэлнэ.

Web болон mobile нэг Supabase project-ийн URL, publishable key ашиглана. `EXPO_PUBLIC_SITE_URL` нь утаснаас нээгдэх deployed web URL байна; утсан дээр `localhost` ашиглахгүй. Env өөрчилсний дараа Expo-г `bunx expo start --clear`-ээр дахин асааж, app-аа reload хийнэ.

Mobile нь email/password бүртгэл, нэвтрэлт дэмжинэ. Email баталгаажуулалт асаалттай бол холбоосоо нээсний дараа app руу буцаж нэвтэрнэ. Supabase **Authentication → URL Configuration → Redirect URLs** дотор `${EXPO_PUBLIC_SITE_URL}/login`-ийг зөвшөөрнө. Mobile-ийн confirmation холбоос web-ийн PKCE `/auth/callback` руу очихгүй.

“Нууц үгээ мартсан” нь web-ийн `/forgot-password` хуудсыг нээнэ. Тэр браузертаа email хүсэлт илгээж, email-д ирсэн холбоосоо мөн тэр браузерт нээгээд нууц үгээ солино. Дараа нь app руу буцаж нэвтэрнэ.

Email ирэхгүй бол Supabase-ийн email provider болон rate limit-ийг шалгана. [Default SMTP](https://supabase.com/docs/guides/auth/auth-smtp) нь зөвхөн project-ийн багийн хаягуудад email илгээдэг, цагт 2 email-ийн хязгаартай. Бусад хэрэглэгчид email илгээхэд custom SMTP тохируулна. Баталгаажаагүй account нэвтрэх үед app-аас confirmation email дахин хүсэж болно.

## 3. Ажиллуулах, шалгах

```bash
npm_config_workspaces=false npx expo start --clear
```

Expo Go-оор бодит Android/iPhone дээр QR уншуулна. iOS simulator нь утасны дуудлагыг бүрэн шалгах орчин биш. `103` товч нь хэрэглэгч дарахад л `Linking.openURL('tel:103')` дуудна.

```bash
npm_config_workspaces=false npx tsc --noEmit
npm_config_workspaces=false npx expo install --check
npm_config_workspaces=false npx expo export --platform ios --output-dir dist/ios
npm_config_workspaces=false npx expo export --platform android --output-dir dist/android
```

`dist/` мөн `mobile/` дотор үүснэ. Metro route type-уудыг үүсгэхийн тулд typecheck-аас өмнө Expo-г нэг удаа асаана. Өөрийн repo дээр нэмэлт lint script байгаа бол mobile package-ийн script-ийг mobile/ дотроос ажиллуулна.

## 4. Backend-ийн шаардлагатай одоогийн тохиргоо

Энэ багц backend schema, RLS, storage policy, publication-ийг өөрчлөхгүй. Дараах тохиргоо Supabase талд байх ёстой:

- Email/password Auth хэрэглэгч бий; mobile нь `signInWithPassword` ашиглана.
- `household_members` SELECT хэрэглэгчийн өөрийн `user_id`-тай membership-ийг зөвшөөрнө. Гэр бүлийг эндээс авна; `households.owner_id`-гаар асран хамгаалагчийг шүүхгүй.
- `households`, `devices`, `events` SELECT тухайн household-ийн member-д зөвшөөрөгдөнө; `profiles` өөрийн profile-ийг уншуулна.
- `events` UPDATE эрх owner/caregiver-ийн шаардлагатай үйлдэлд зөвшөөрөгдөнө. Хэрэглэгч хэн болох болон зөвшөөрөгдсөн field-үүдийн хамгаалалтыг server-side RLS/constraint/trigger хангана. Client-ийн `.eq(...)` шүүлт дангаараа RLS-ийг орлохгүй.
- `events` хүснэгт `supabase_realtime` publication-д байна. `devices`-ийн live status update хэрэгтэй бол мөн publication-д байна. [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).
- `event-snapshots` bucket **private** байна. `storage.objects` SELECT policy нь зөвхөн хэрэглэгчийн household-д харьяалах event-ийн `snapshot_path`-д хандахыг зөвшөөрнө. URL гаргахад Storage SELECT эрх шаардлагатай. [createSignedUrl](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl).

## 5. Ажиллах зан төлөв

- Нэвтэрсний дараа membership-үүдийн гэр бүлүүдийг уншина. Олон гэр бүлтэй бол нэрээр нь сонгож болно; эхэнд нэрээр эрэмбэлсэн эхний гэр бүл сонгогдоно.
- Нүүр нь бодит төхөөрөмжийн онлайн тоо, камер/төхөөрөмжийн жагсаалт, сүүлийн дохиог харуулна. Schema-д байхгүй хөдөлгөөний graph, биеийн өнцөг, ёолох дууны хувь зэрэг зохиомол үзүүлэлт нэмээгүй.
- Үйл явдал `occurred_at DESC`, тогтвортой хоёр дахь эрэмбэ `id DESC`, `limit(100)`-тай. Filter нь ачаалсан сүүлийн 100 мөрийг шүүнэ.
- Дэлгэрэнгүй нь event ID болон сонгосон household ID-аар дахин SELECT хийнэ. Latest 100-д байхгүй хуучин event-ийн deep link ч энэ query-г ашиглана.
- “Харлаа” нь `status='acknowledged'`, `acknowledged_by=user.id`, `acknowledged_at=now` тавина. “Хуурамч” нь `status='false_alarm'` тавина. Хоёулаа `.eq('status','new')` хамгаалалттай. 0 мөр шинэчлэгдсэн үед амжилттай гэж харуулахгүй.
- `events INSERT` realtime filter нь `household_id=eq.<id>`. `events UPDATE` нь өөр caregiver-ийн “Харлаа” үйлдлийг давхар тусгана. Subscription цэвэрлэгдэх болон өгөгдөл keyed provider-аар reset хийх тул өөр household/account-ийн хуучин data үлдэхгүй.
- `critical` ба `new` event нь app даяар React Native `Modal`-оор бүтэн улаан Alert дэлгэц нээнэ. Олон critical дохио бол хуучнаас нь эхэлж нэг нэгээр харуулна. Boot/foreground refresh дээрх сүүлийн 100 дахь шийдээгүй critical дохио мөн нээгдэнэ.
- “Хаах” нь энэ app session-д дэлгэцийг л хаана, event status өөрчлөхгүй. Дараагийн critical дохио байвал нээгдэнэ; app дахин эхлэхэд шийдээгүй дохио дахин харагдаж болно.
- Signed URL 60 секунд хүчинтэй; mounted зураг 50 секундийн дараа болон foreground болох үед дахин гаргана. URL-ийг disk-д хадгалахгүй.
- `confidence`-ийг 0–1 гэсэн normalization-той гэж үзсэн; 0.87 → 87%. Backend-ийн confidence нь 0–100 бол дэлгэрэнгүй дэх `* 100`-г авна.
- Чичиргээнд React Native-ийн Vibration ашиглана; Android VIBRATE permission app.json-д байна. [React Native Vibration](https://reactnative.dev/docs/vibration).

**Хязгаар:** Realtime websocket нь app ажиллаж/foreground байх үеийн in-app дохио. OS app-ыг suspend/kill хийсэн үед background push эсвэл системийн full-screen alert хүргэнэ гэж энэ код батлахгүй. App хаалттай үед мэдэгдэл хүргэхэд Expo Notifications/APNs/FCM болон backend push илгээх урсгал тусад нь шаардлагатай.

## 6. Бодит integration шалгалт

1. Email/password нэвтрэлт, app restart дээр session сэргэлт, logout дээр login руу буцахыг шалгана.
2. Membershipгүй хэрэглэгчид хоосон төлөв, олон household хэрэглэгчид scope зөв солигдож байгааг шалгана.
3. Backend-ийн одоогийн web ingest урсгалаар өөрийн household-д шинэ warning/info болон critical event үүсгэнэ; critical нь зураг, улаан дэлгэц, чичиргээтэй харагдана.
4. Хоёр caregiver төхөөрөмжөөс нэг `new` event-ийг зэрэг “Харлаа” гэж тэмдэглэнэ; нэг л conditional update амжилттай болох ёстой, attributed user болон хугацааг шалгана.
5. “Хуурамч” event, өмнө нь acknowledged event-ийг дарж өөрчлөх боломжгүйг шалгана.
6. Өөр household-ийн ID-тай event/snapshot-д хандах оролдлогыг RLS хориглож байгааг backend test account-аар шалгана. Mobile-д admin key оруулахгүй.
7. Signed URL-тай дэлгэцийг 60 секундээс удаан нээлттэй байлгаж болон background/foreground сольж зураг шинэчлэгдэж байгааг шалгана.
8. Холболт тасрах, pull-to-refresh, realtime reconnect, app foreground дээр хоцорсон event ирэхийг шалгана.

## 7. Push мэдэгдэл

Уналт, дуу илэрмэгц server нь web-ийн Web Push-тэй зэрэг Expo push service-ээр (`https://exp.host/--/api/v2/push/send`) энэ апп руу дохио илгээнэ (`src/features/notifications/server/expo-push.ts`). Утас нэвтэрсний дараа өөрийн Expo token-ийг `register_expo_push_token`-оор хадгална (`src/lib/push.ts`). Дохиог дарахад тэр event нээгдэнэ. Гарахад token устгагдана.

Remote push **Expo Go дээр ажиллахгүй** (SDK 53+), development build хэрэгтэй ([Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/)).

1. Supabase SQL editor-т `supabase/migrations/20261014120000_expo_push_tokens.sql`-ийг ажиллуулна.
2. Expo бүртгэлээр (`mobile/` дотор):
   ```bash
   npx eas-cli login
   npx eas-cli init          # app.json-д extra.eas.projectId бичнэ
   npx eas-cli build:configure
   ```
3. Android: Firebase project → Cloud Messaging-ийн FCM V1 service account key-г `npx eas-cli credentials`-оор оруулна. iOS: Apple Developer бүртгэл ($99/жил) хэрэгтэй.
4. `npx eas-cli build --profile development --platform android` → APK-г утсанд суулгаад `npx expo start --dev-client`.
5. Гэр бүл tab → Мэдэгдэл → "Мэдэгдэл асаах". Камерын горимоос туршилтын event үүсгэж дохио ирэхийг шалгана.
