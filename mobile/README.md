# Halo — Expo mobile
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
        │   │   └── events.tsx
        │   └── events/
        │       └── [id].tsx
        ├── components/
        │   ├── ui.tsx
        │   ├── Snapshot.tsx
        │   └── CriticalAlert.tsx
        ├── providers/
        │   ├── AuthProvider.tsx
        │   └── HouseholdProvider.tsx
        └── lib/
            ├── types.ts
            ├── supabase.ts
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
```

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

## 7. Файл бүрийн бүрэн код

Доорх замууд бүгд repo root-оос эхэлнэ. Generated package/lock/Expo type файлуудыг CLI үүсгэнэ; доор authored файлуудын бүтэн эх код байна.

### `mobile/.gitignore`

```text
node_modules/
.expo/
dist/
web-build/
*.log
.DS_Store
.env
.env.*
!.env.example
ios/
android/
```

### `mobile/.env.example`

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

### `mobile/app.json`

```json
{
  "expo": {
    "name": "Halo",
    "slug": "halo-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "halo",
    "userInterfaceStyle": "dark",
    "plugins": ["expo-router"],
    "android": { "permissions": ["android.permission.VIBRATE"] },
    "experiments": { "typedRoutes": true }
  }
}
```

### `mobile/tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": { "strict": true },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

### `mobile/src/lib/types.ts`

```ts
export type Household = { id: string; name: string; owner_id: string };
export type Member = {
  household_id: string;
  user_id: string;
  role: 'owner' | 'caregiver';
};
export type Profile = { id: string; name: string | null };
export type Device = {
  id: string;
  household_id: string;
  name: string;
  room_name: string | null;
  kind: 'phone' | 'laptop' | 'ip_camera';
  status: 'online' | 'offline' | 'pairing';
  last_seen_at: string | null;
};
export type HaloEvent = {
  id: string;
  household_id: string;
  device_id: string | null;
  kind: 'fall' | 'scream' | 'cry' | 'glass' | 'alarm' | 'offline' | 'test';
  severity: 'critical' | 'warning' | 'info';
  status: 'new' | 'acknowledged' | 'false_alarm' | 'resolved';
  confidence: number | null;
  person_name: string | null;
  room_name: string | null;
  occurred_at: string;
  snapshot_path: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  note: string | null;
  created_at: string;
};
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};
// Only the tables this client uses. Replace with generated types if available.
export type Database = {
  public: {
    Tables: {
      households: Table<Household>;
      household_members: Table<Member>;
      profiles: Table<Profile>;
      devices: Table<Device>;
      events: Table<HaloEvent>;
    };
    Views: { [key in never]: never };
    Functions: { [key in never]: never };
    Enums: { [key in never]: never };
    CompositeTypes: { [key in never]: never };
  };
};
```

### `mobile/src/lib/supabase.ts`

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key || !key.startsWith('sb_publishable_')) {
  throw new Error('mobile/.env дотор Supabase URL болон publishable key оруулна уу.');
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
```

### `mobile/src/lib/events.ts`

```ts
import { supabase } from './supabase';
import type { HaloEvent } from './types';

export const kindLabel: Record<HaloEvent['kind'], string> = {
  fall: 'Унасан байж магадгүй',
  scream: 'Орилох дуу',
  cry: 'Уйлах дуу',
  glass: 'Шил хагарах дуу',
  alarm: 'Аюулын дохио',
  offline: 'Камер салсан',
  test: 'Туршилтын дохио',
};
export const statusLabel: Record<HaloEvent['status'], string> = {
  new: 'Шинэ', acknowledged: 'Харсан', false_alarm: 'Хуурамч', resolved: 'Шийдсэн',
};
export const severityLabel: Record<HaloEvent['severity'], string> = {
  critical: 'Яаралтай', warning: 'Анхааруулга', info: 'Мэдээлэл',
};
export function dateLabel(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Огноо тодорхойгүй' :
    date.toLocaleString('mn-MN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
}
export function sortedEvents(rows: HaloEvent[]) {
  return [...rows].sort((a, b) =>
    Date.parse(b.occurred_at) - Date.parse(a.occurred_at) || b.id.localeCompare(a.id)
  ).slice(0, 100);
}
export async function getEvent(id: string, householdId: string) {
  const { data, error } = await supabase.from('events').select('*')
    .eq('id', id).eq('household_id', householdId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Дохио олдсонгүй эсвэл хандах эрхгүй байна.');
  return data;
}
export async function setEventStatus(
  id: string, householdId: string, userId: string,
  status: 'acknowledged' | 'false_alarm',
) {
  const patch = status === 'acknowledged'
    ? { status, acknowledged_by: userId, acknowledged_at: new Date().toISOString() }
    : { status };
  const { data, error } = await supabase.from('events').update(patch)
    .eq('id', id).eq('household_id', householdId).eq('status', 'new')
    .select('*').maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error('Дохионы төлөв өөрчлөгдсөн эсвэл шинэчлэх эрхгүй байна. Дахин ачаална уу.');
  }
  return data;
}
```

### `mobile/src/providers/AuthProvider.tsx`

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthValue = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};
const Context = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    let receivedAuthEvent = false;
    setLoading(true);
    setError(null);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      // Keep this callback synchronous; no Supabase requests inside it.
      receivedAuthEvent = true;
      if (alive) { setSession(next); setLoading(false); setError(null); }
    });
    void supabase.auth.getSession().then(({ data, error: authError }) => {
      if (!alive || receivedAuthEvent) return;
      if (authError) setError('Нэвтрэлтийн төлөвийг уншиж чадсангүй.');
      else setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (alive && !receivedAuthEvent) {
        setError('Нэвтрэлтийн төлөвийг уншиж чадсангүй.'); setLoading(false);
      }
    });
    const refresh = (state: string) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const appState = AppState.addEventListener('change', refresh);
    return () => {
      alive = false; subscription.unsubscribe(); appState.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [attempt]);

  return <Context.Provider value={{ session, loading, error, retry: () => setAttempt(n => n + 1) }}>
    {children}
  </Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider байхгүй байна.');
  return value;
}
```

### `mobile/src/providers/HouseholdProvider.tsx`

```tsx
import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { sortedEvents } from '../lib/events';
import type { Device, HaloEvent, Household } from '../lib/types';
import { useAuth } from './AuthProvider';

type HomesValue = {
  households: Household[];
  household: Household | null;
  name: string;
  loading: boolean;
  error: string | null;
  select: (id: string) => void;
  retry: () => void;
};
const HomesContext = createContext<HomesValue | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    async function load() {
      const members = await supabase.from('household_members').select('*').eq('user_id', userId);
      if (members.error) throw members.error;
      const ids = [...new Set((members.data ?? []).map(m => m.household_id))];
      const homes = ids.length
        ? await supabase.from('households').select('*').in('id', ids).order('name')
        : { data: [] as Household[], error: null };
      if (homes.error) throw homes.error;
      const profile = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (!alive) return;
      const list = homes.data ?? [];
      setHouseholds(list);
      setSelected(id => list.some(h => h.id === id) ? id : (list[0]?.id ?? null));
      setName(profile.data?.name ?? '');
    }
    void load().catch(() => {
      if (alive) {
        setHouseholds([]); setSelected(null);
        setError('Гэр бүлийн мэдээллийг ачаалж чадсангүй.');
      }
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId, attempt]);

  const household = households.find(h => h.id === selected) ?? null;
  return <HomesContext.Provider value={{
    households, household, name, loading, error,
    select: id => { if (households.some(h => h.id === id)) setSelected(id); },
    retry: () => setAttempt(n => n + 1),
  }}>
    <DataProvider key={household?.id ?? 'no-household'} householdId={household?.id ?? null}>
      {children}
    </DataProvider>
  </HomesContext.Provider>;
}

type DataValue = {
  devices: Device[];
  events: HaloEvent[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  realtimeError: string | null;
  refresh: () => Promise<void>;
  applyEvent: (event: HaloEvent) => void;
  critical: HaloEvent | null;
  dismissCritical: (id: string) => void;
};
const DataContext = createContext<DataValue | null>(null);

function DataProvider({ householdId, children }: { householdId: string | null; children: ReactNode }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [events, setEvents] = useState<HaloEvent[]>([]);
  const [loading, setLoading] = useState(!!householdId);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const alive = useRef(true);
  const request = useRef(0);
  const version = useRef(0);
  const changes = useRef(new Map<string, { version: number; event: HaloEvent }>());

  const applyEvent = useCallback((event: HaloEvent) => {
    if (!alive.current || event.household_id !== householdId) return;
    changes.current.set(event.id, { version: ++version.current, event });
    if (changes.current.size > 200) {
      const oldest = changes.current.keys().next().value;
      if (oldest) changes.current.delete(oldest);
    }
    setEvents(old => sortedEvents([event, ...old.filter(e => e.id !== event.id)]));
  }, [householdId]);

  const refresh = useCallback(async () => {
    if (!householdId || !alive.current) return;
    const ticket = ++request.current;
    const startedAt = version.current;
    setRefreshing(true);
    try {
      const [deviceResult, eventResult] = await Promise.all([
        supabase.from('devices').select('*').eq('household_id', householdId).order('name'),
        supabase.from('events').select('*').eq('household_id', householdId)
          .order('occurred_at', { ascending: false }).order('id', { ascending: false }).limit(100),
      ]);
      if (deviceResult.error) throw deviceResult.error;
      if (eventResult.error) throw eventResult.error;
      if (!alive.current || ticket !== request.current) return;
      const merged = new Map((eventResult.data ?? []).map(e => [e.id, e]));
      // Keep INSERT/UPDATE received while the initial query was in flight.
      changes.current.forEach(change => {
        if (change.version > startedAt) merged.set(change.event.id, change.event);
      });
      setDevices(deviceResult.data ?? []); setEvents(sortedEvents([...merged.values()]));
      setError(null);
    } catch {
      if (alive.current && ticket === request.current) setError('Өгөгдөл шинэчлэгдсэнгүй. Холболтоо шалгаад дахин оролдоно уу.');
    } finally {
      if (alive.current && ticket === request.current) { setLoading(false); setRefreshing(false); }
    }
  }, [householdId]);

  useEffect(() => {
    alive.current = true;
    if (!householdId) return () => { alive.current = false; };
    const channel = supabase.channel(`household:${householdId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'events', filter: `household_id=eq.${householdId}`,
      }, payload => applyEvent(payload.new as HaloEvent))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'events', filter: `household_id=eq.${householdId}`,
      }, payload => applyEvent(payload.new as HaloEvent))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'devices', filter: `household_id=eq.${householdId}`,
      }, () => { void refresh(); })
      .subscribe(status => {
        if (!alive.current) return;
        if (status === 'SUBSCRIBED') { setRealtimeError(null); void refresh(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeError('Шууд дохионы холболт тасарсан. Дахин холбогдохыг хүлээж байна.');
        }
      });
    void refresh();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => {
      alive.current = false; ++request.current;
      listener.remove(); void supabase.removeChannel(channel);
    };
  }, [householdId, applyEvent, refresh]);

  const critical = [...events].reverse().find(e =>
    e.severity === 'critical' && e.status === 'new' && !dismissed.has(e.id)
  ) ?? null;
  return <DataContext.Provider value={{
    devices, events, loading, refreshing, error, realtimeError, refresh, applyEvent, critical,
    dismissCritical: id => setDismissed(old => new Set([...old, id])),
  }}>{children}</DataContext.Provider>;
}

export function useHomes() {
  const value = useContext(HomesContext);
  if (!value) throw new Error('HouseholdProvider байхгүй байна.');
  return value;
}
export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error('DataProvider байхгүй байна.');
  return value;
}
```

### `mobile/src/components/ui.tsx`

```tsx
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { dateLabel, kindLabel, setEventStatus, severityLabel, statusLabel } from '../lib/events';
import type { HaloEvent } from '../lib/types';
import { useAuth } from '../providers/AuthProvider';
import { useData, useHomes } from '../providers/HouseholdProvider';

export const colors = {
  bg: '#07191D', card: '#0D2830', border: '#29454D', text: '#F1F6F7',
  muted: '#A2B9C0', primary: '#5EEAD4', danger: '#FB7185',
};
export const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 20, gap: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  heading: { color: colors.text, fontSize: 18, fontWeight: '700' },
  text: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 16, gap: 8 },
  input: { color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, padding: 15 },
  button: { backgroundColor: colors.primary, minHeight: 48, padding: 14, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  buttonSecondary: { backgroundColor: '#203C43', borderColor: colors.border, borderWidth: 1 },
  buttonText: { color: '#063A34', fontSize: 15, fontWeight: '700' },
  badge: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  error: { color: '#FFB0BC', fontSize: 13, lineHeight: 20 },
});

export function Screen({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return <LinearGradient colors={danger ? ['#8A292F', '#260D18', '#160A10'] : ['#134D47', colors.bg, '#0A2D37']} style={styles.fill}>
    <SafeAreaView style={styles.fill}>{children}</SafeAreaView>
  </LinearGradient>;
}
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function Button({ title, onPress, secondary = false, disabled = false, busy = false }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; busy?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }}
    disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, { opacity: disabled || busy ? 0.5 : pressed ? 0.8 : 1 }]}>
    {busy ? <ActivityIndicator color={secondary ? colors.text : '#063A34'} /> :
      <Text style={[styles.buttonText, secondary && { color: colors.text }]}>{title}</Text>}
  </Pressable>;
}
export function Problem({ text, retry }: { text: string; retry?: () => void }) {
  return <View style={{ gap: 10 }}><Text accessibilityRole="alert" style={styles.error}>{text}</Text>
    {retry && <Button title="Дахин оролдох" secondary onPress={retry} />}</View>;
}
export function Loading() {
  return <Screen><View style={[styles.fill, { justifyContent: 'center', alignItems: 'center' }]}>
    <ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Ачаалж байна…</Text>
  </View></Screen>;
}
export function HouseholdPicker() {
  const { households, household, select } = useHomes();
  if (households.length < 2) return household ? <Text style={styles.muted}>{household.name}</Text> : null;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
    {households.map(home => <Pressable key={home.id} onPress={() => select(home.id)} accessibilityRole="button"
      accessibilityState={{ selected: household?.id === home.id }}
      style={[styles.button, styles.buttonSecondary, household?.id === home.id && { borderColor: colors.primary }]}>
      <Text style={styles.text}>{home.name}</Text>
    </Pressable>)}
  </ScrollView>;
}
export function EventCard({ event }: { event: HaloEvent }) {
  return <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
    style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}>
    <View style={styles.row}><Text style={[styles.heading, { flex: 1 }]}>{kindLabel[event.kind]}</Text>
      <Text style={[styles.badge, event.severity === 'critical' && { color: colors.danger }]}>{severityLabel[event.severity]}</Text></View>
    <Text style={styles.muted}>{[event.person_name, event.room_name].filter(Boolean).join(' · ') || 'Байршил тодорхойгүй'}</Text>
    <View style={styles.row}><Text style={styles.muted}>{dateLabel(event.occurred_at)}</Text>
      <Text style={styles.badge}>{statusLabel[event.status]}</Text></View>
  </Pressable>;
}
export function EventActions({ event, onUpdated }: { event: HaloEvent; onUpdated?: (row: HaloEvent) => void }) {
  const { session } = useAuth();
  const { applyEvent, refresh } = useData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(status: 'acknowledged' | 'false_alarm') {
    if (!session || busy || event.status !== 'new') return;
    setBusy(true); setError(null);
    try {
      const updated = await setEventStatus(event.id, event.household_id, session.user.id, status);
      applyEvent(updated); onUpdated?.(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Дохиог шинэчилж чадсангүй.');
      void refresh();
    } finally { setBusy(false); }
  }
  return <View style={{ gap: 10 }}>
    <Button title="Харлаа" busy={busy} disabled={event.status !== 'new'} onPress={() => { void submit('acknowledged'); }} />
    <Button title="Хуурамч дохио" secondary disabled={busy || event.status !== 'new'} onPress={() => Alert.alert(
      'Хуурамч дохио', 'Энэ дохиог хуурамч гэж тэмдэглэх үү?', [
        { text: 'Болих', style: 'cancel' },
        { text: 'Тэмдэглэх', onPress: () => { void submit('false_alarm'); } },
      ],
    )} />
    {event.status !== 'new' && <Text style={styles.muted}>Төлөв: {statusLabel[event.status]}</Text>}
    {error && <Problem text={error} />}
  </View>;
}
```

### `mobile/src/components/Snapshot.tsx`

```tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Image, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Button, colors, styles } from './ui';

export function Snapshot({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    let ticket = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setUrl(null); setError(false); setLoading(!!path);
    if (!path) return;
    async function sign() {
      const current = ++ticket;
      try {
        const { data, error: storageError } = await supabase.storage.from('event-snapshots').createSignedUrl(path!, 60);
        if (storageError || !data) throw storageError;
        if (alive && current === ticket) { setUrl(data.signedUrl); setError(false); }
      } catch {
        if (alive && current === ticket) { setUrl(null); setError(true); }
      } finally {
        if (alive && current === ticket) {
          setLoading(false);
          if (AppState.currentState === 'active') timer = setTimeout(() => { void sign(); }, 50_000);
        }
      }
    }
    void sign();
    const listener = AppState.addEventListener('change', state => {
      clearTimeout(timer);
      if (state === 'active') { setLoading(true); void sign(); }
      else ++ticket;
    });
    return () => { alive = false; ++ticket; clearTimeout(timer); listener.remove(); };
  }, [path, attempt]);
  return <View style={[styles.card, { minHeight: 220, justifyContent: 'center' }]}>
    {!path ? <Text style={styles.muted}>Энэ дохионы зураг байхгүй.</Text> :
      loading ? <ActivityIndicator color={colors.primary} /> :
      error ? <><Text style={styles.muted}>Зургийг ачаалж чадсангүй.</Text><Button secondary title="Зураг дахин ачаалах" onPress={() => setAttempt(n => n + 1)} /></> :
      url ? <Image source={{ uri: url }} accessibilityLabel="Дохио илэрсэн үеийн зураг" resizeMode="contain"
        style={{ width: '100%', height: 240, borderRadius: 12 }} onError={() => setError(true)} /> : null}
  </View>;
}
```

### `mobile/src/components/CriticalAlert.tsx`

```tsx
import { useEffect } from 'react';
import { AppState, Linking, Modal, Platform, ScrollView, Text, Vibration, View, Alert } from 'react-native';
import { dateLabel, kindLabel } from '../lib/events';
import { useData } from '../providers/HouseholdProvider';
import { Snapshot } from './Snapshot';
import { Button, EventActions, Screen, styles } from './ui';

export function CriticalAlert() {
  const { critical, dismissCritical } = useData();
  const id = critical?.id;
  useEffect(() => {
    if (!id) return;
    const vibrate = () => Vibration.vibrate(Platform.OS === 'ios' ? [0, 450, 450] : [0, 450, 180, 450], false);
    if (AppState.currentState === 'active') vibrate();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') vibrate(); else Vibration.cancel();
    });
    return () => { listener.remove(); Vibration.cancel(); };
  }, [id]);
  if (!critical) return null;
  return <Modal visible presentationStyle="fullScreen" animationType="slide" statusBarTranslucent
    onRequestClose={() => dismissCritical(critical.id)}>
    <Screen danger><ScrollView contentContainerStyle={styles.content}>
      <View style={styles.row}><Button title="Хаах" secondary onPress={() => dismissCritical(critical.id)} />
        <Text style={[styles.badge, { color: '#FFB3BB' }]}>● ЯАРАЛТАЙ</Text></View>
      <Text style={styles.muted}>{dateLabel(critical.occurred_at)}</Text>
      <Text style={[styles.title, { fontSize: 34 }]}>{kindLabel[critical.kind]}</Text>
      <Text style={styles.heading}>{[critical.person_name, critical.room_name].filter(Boolean).join(' · ') || 'Байршил тодорхойгүй'}</Text>
      <Snapshot key={`snapshot:${critical.id}`} path={critical.snapshot_path} />
      <Text style={styles.muted}>Илрүүлсэн агшин · {dateLabel(critical.occurred_at)}</Text>
      <EventActions key={critical.id} event={critical} />
      <Button title="103 руу залгах" secondary onPress={() => {
        void Linking.openURL('tel:103').catch(() => Alert.alert('Дуудлага', 'Энэ төхөөрөмжөөс дуудлага хийх боломжгүй байна.'));
      }} />
      <Text style={styles.muted}>Хаах нь дохиог “Харсан” гэж тэмдэглэхгүй.</Text>
    </ScrollView></Screen>
  </Modal>;
}
```

### `mobile/src/app/_layout.tsx`

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { HouseholdProvider } from '../providers/HouseholdProvider';
import { CriticalAlert } from '../components/CriticalAlert';
import { Loading, Problem, Screen, styles } from '../components/ui';
import { View } from 'react-native';

function Routes({ authenticated }: { authenticated: boolean }) {
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={!authenticated}><Stack.Screen name="login" /></Stack.Protected>
    <Stack.Protected guard={authenticated}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="events/[id]" />
    </Stack.Protected>
  </Stack>;
}
function RootNavigator() {
  const { session, loading, error, retry } = useAuth();
  if (loading) return <Loading />;
  if (error) return <Screen><View style={styles.content}><Problem text={error} retry={retry} /></View></Screen>;
  if (!session) return <Routes authenticated={false} />;
  return <HouseholdProvider key={session.user.id}>
    <Routes authenticated />
    <CriticalAlert />
  </HouseholdProvider>;
}
export default function RootLayout() {
  return <SafeAreaProvider><StatusBar style="light" /><AuthProvider><RootNavigator /></AuthProvider></SafeAreaProvider>;
}
```

### `mobile/src/app/login.tsx`

```tsx
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Button, colors, Problem, Screen, styles } from '../components/ui';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function login() {
    if (busy) return;
    if (!email.trim() || !password) { setError('Email болон нууц үгээ оруулна уу.'); return; }
    setBusy(true); setError(null);
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setPassword('');
      // Protected routes respond to the auth session automatically.
    } catch { setError('Нэвтэрч чадсангүй. Email, нууц үг болон интернэт холболтоо шалгана уу.'); }
    finally { setBusy(false); }
  }
  return <Screen><KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { flexGrow: 1, justifyContent: 'center' }]}>
      <View style={{ alignItems: 'center', marginBottom: 30, gap: 12 }}>
        <Text style={{ color: colors.primary, fontSize: 58, fontWeight: '800', letterSpacing: -3 }}>Halo</Text>
        <Text style={styles.heading}>Гэр бүлийнхээ дэргэд</Text>
        <Text style={styles.muted}>Асран хамгаалагчийн нэвтрэлт</Text>
      </View>
      <Text style={styles.text}>Email</Text>
      <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="name@example.com"
        placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none"
        autoCorrect={false} autoComplete="email" textContentType="username" editable={!busy} />
      <Text style={styles.text}>Нууц үг</Text>
      <TextInput value={password} onChangeText={setPassword} style={styles.input} placeholder="Нууц үг"
        placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" autoCorrect={false}
        autoComplete="current-password" textContentType="password" editable={!busy} onSubmitEditing={() => { void login(); }} />
      {error && <Problem text={error} />}
      <Button title="Нэвтрэх" busy={busy} onPress={() => { void login(); }} />
    </ScrollView>
  </KeyboardAvoidingView></Screen>;
}
```

### `mobile/src/app/(tabs)/_layout.tsx`

```tsx
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../components/ui';

export default function TabsLayout() {
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: '#132D33', borderTopColor: colors.border },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Нүүр', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="events" options={{ title: 'Үйл явдал', tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size} /> }} />
  </Tabs>;
}
```

### `mobile/src/app/(tabs)/index.tsx`

```tsx
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { dateLabel } from '../../lib/events';
import { useData, useHomes } from '../../providers/HouseholdProvider';
import { Button, Card, colors, EventCard, HouseholdPicker, Loading, Problem, Screen, styles } from '../../components/ui';

export default function HomeScreen() {
  const homes = useHomes();
  const data = useData();
  const [signingOut, setSigningOut] = useState(false);
  async function logout() {
    setSigningOut(true);
    try {
      const result = await supabase.auth.signOut();
      if (result.error) throw result.error;
    } catch { Alert.alert('Гарах', 'Гарч чадсангүй. Дахин оролдоно уу.'); }
    finally { setSigningOut(false); }
  }
  if (homes.loading) return <Loading />;
  const online = data.devices.filter(d => d.status === 'online').length;
  const warnings = data.events.filter(e => e.status === 'new' && e.severity !== 'info').length;
  const summary = data.loading ? 'Шалгаж байна…' : data.error || data.realtimeError ? 'Холболтоо шалгана уу' :
    warnings ? `${warnings} шинэ анхааруулга` : !data.devices.length ? 'Төхөөрөмж нэмэгдээгүй' :
    online === 0 ? 'Онлайн төхөөрөмж алга' : online < data.devices.length ? 'Төхөөрөмжөө шалгана уу' : 'Бүгд тайван';
  const deviceStatus = { online: 'Онлайн', offline: 'Салсан', pairing: 'Холбож байна' };
  return <Screen><ScrollView contentContainerStyle={styles.content} refreshControl={
    <RefreshControl refreshing={data.refreshing} tintColor={colors.primary} onRefresh={() => { homes.error ? homes.retry() : void data.refresh(); }} />
  }>
    <View style={styles.row}><Text style={[styles.title, { flex: 1 }]}>Сайн уу{homes.name ? `, ${homes.name}` : ''}</Text>
      <Button title="Гарах" secondary busy={signingOut} onPress={() => { void logout(); }} /></View>
    <HouseholdPicker />
    {homes.error && <Problem text={homes.error} retry={homes.retry} />}
    {!homes.error && !homes.household ? <Card><Text style={styles.heading}>Гэр бүлд холбогдоогүй байна</Text>
      <Text style={styles.muted}>Гэр бүлийн эзнээр өөрийгөө асран хамгаалагч болгон нэмүүлнэ үү.</Text>
      <Button title="Дахин шалгах" secondary onPress={homes.retry} /></Card> : homes.household && <>
      <View style={{ alignItems: 'center', paddingVertical: 28, gap: 22 }}>
        <LinearGradient colors={['#CFFFF1', '#5EEAD4', '#125A58']} style={{ width: 118, height: 118, borderRadius: 59, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.55, shadowRadius: 25, shadowOffset: { width: 0, height: 0 }, elevation: 10 }}>
          <Text style={{ color: '#053932', fontSize: 42, fontWeight: '800' }}>{online.toString().padStart(2, '0')}</Text>
          <Text style={{ color: '#053932', fontSize: 12 }}>онлайн</Text>
        </LinearGradient>
        <View style={{ alignItems: 'center', gap: 5 }}><Text style={styles.heading}>{summary}</Text>
          <Text style={styles.muted}>{online}/{data.devices.length} төхөөрөмж онлайн</Text></View>
      </View>
      {data.error && <Problem text={data.error} retry={() => { void data.refresh(); }} />}
      {data.realtimeError && <Problem text={data.realtimeError} />}
      <Text style={styles.heading}>Камерууд ба төхөөрөмжүүд</Text>
      {!data.loading && !data.devices.length && <Text style={styles.muted}>Одоогоор төхөөрөмж алга.</Text>}
      {data.devices.map(device => <Card key={device.id}>
        <View style={styles.row}><Text style={[styles.heading, { flex: 1 }]}>{device.name}</Text>
          <Text style={[styles.badge, device.status !== 'online' && { color: '#FCD34D' }]}>{deviceStatus[device.status]}</Text></View>
        <Text style={styles.muted}>{device.room_name || 'Өрөө тодорхойгүй'} · {device.kind === 'phone' ? 'Утас' : device.kind === 'laptop' ? 'Компьютер' : 'IP камер'}</Text>
        <Text style={styles.muted}>Сүүлийн холболт: {device.last_seen_at ? dateLabel(device.last_seen_at) : 'Тодорхойгүй'}</Text>
      </Card>)}
      <Text style={styles.heading}>Сүүлийн дохио</Text>
      {data.events[0] ? <EventCard event={data.events[0]} /> : <Text style={styles.muted}>{data.loading ? 'Ачаалж байна…' : 'Дохио бүртгэгдээгүй.'}</Text>}
    </>}
  </ScrollView></Screen>;
}
```

### `mobile/src/app/(tabs)/events.tsx`

```tsx
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useData, useHomes } from '../../providers/HouseholdProvider';
import { colors, EventCard, HouseholdPicker, Loading, Problem, Screen, styles } from '../../components/ui';

const filters = [
  { id: 'all', label: 'Бүгд' }, { id: 'fall', label: 'Унах' },
  { id: 'sound', label: 'Дуу' }, { id: 'device', label: 'Төхөөрөмж' },
] as const;
export default function EventsScreen() {
  const homes = useHomes();
  const data = useData();
  const [filter, setFilter] = useState<string>('all');
  if (homes.loading) return <Loading />;
  const list = data.events.filter(event => filter === 'all' ||
    (filter === 'fall' && event.kind === 'fall') ||
    (filter === 'sound' && ['scream', 'cry', 'glass', 'alarm'].includes(event.kind)) ||
    (filter === 'device' && ['offline', 'test'].includes(event.kind)));
  return <Screen><FlatList data={list} keyExtractor={event => event.id}
    contentContainerStyle={styles.content} refreshing={data.refreshing}
    onRefresh={() => { homes.error ? homes.retry() : void data.refresh(); }}
    ListHeaderComponent={<View style={{ gap: 16 }}><Text style={styles.title}>Үйл явдал</Text>
      <Text style={styles.muted}>Сүүлийн 100 дохио · Шинээс хуучин руу</Text><HouseholdPicker />
      {homes.error && <Problem text={homes.error} retry={homes.retry} />}
      {data.error && <Problem text={data.error} retry={() => { void data.refresh(); }} />}
      {data.realtimeError && <Problem text={data.realtimeError} />}
      <View style={{ flexDirection: 'row', borderRadius: 25, backgroundColor: colors.card, padding: 4 }}>
        {filters.map(item => <Pressable key={item.id} onPress={() => setFilter(item.id)} accessibilityRole="button"
          accessibilityState={{ selected: filter === item.id }} style={{ flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', padding: 4, borderRadius: 22, backgroundColor: filter === item.id ? '#2B5156' : 'transparent' }}>
          <Text style={{ color: filter === item.id ? colors.text : colors.muted, fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
        </Pressable>)}
      </View></View>}
    renderItem={({ item }) => <EventCard event={item} />}
    ListEmptyComponent={<Text style={[styles.muted, { textAlign: 'center', paddingVertical: 35 }]}>
      {!homes.household ? 'Гэр бүлд холбогдоогүй байна.' : data.loading ? 'Ачаалж байна…' : 'Энэ төрлийн дохио алга.'}
    </Text>} />
  </Screen>;
}
```

### `mobile/src/app/events/[id].tsx`

```tsx
import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, Text } from 'react-native';
import { dateLabel, getEvent, kindLabel, severityLabel, statusLabel } from '../../lib/events';
import type { HaloEvent } from '../../lib/types';
import { useData, useHomes } from '../../providers/HouseholdProvider';
import { Snapshot } from '../../components/Snapshot';
import { Button, Card, colors, EventActions, Problem, Screen, styles } from '../../components/ui';

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { household } = useHomes();
  const { events } = useData();
  const [saved, setSaved] = useState<HaloEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const householdId = household?.id;
  useFocusEffect(useCallback(() => {
    let alive = true;
    setSaved(null); setError(null); setLoading(true);
    if (!id || !householdId) {
      setError('Дохио эсвэл гэр бүл сонгогдоогүй байна.'); setLoading(false);
      return () => { alive = false; };
    }
    void getEvent(id, householdId).then(row => { if (alive) setSaved(row); })
      .catch(() => { if (alive) setError('Дохио олдсонгүй эсвэл ачаалах боломжгүй байна.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, householdId, attempt]));
  const event = events.find(e => e.id === id && e.household_id === householdId) ??
    (saved?.id === id && saved.household_id === householdId ? saved : null);
  return <Screen><ScrollView contentContainerStyle={styles.content} refreshControl={
    <RefreshControl refreshing={loading} tintColor={colors.primary} onRefresh={() => setAttempt(n => n + 1)} />
  }>
    <Button title="Буцах" secondary onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }} />
    {loading && <ActivityIndicator color={colors.primary} />}
    {error && <Problem text={error} retry={() => setAttempt(n => n + 1)} />}
    {event && <>
      <Text style={styles.title}>{kindLabel[event.kind]}</Text>
      <Text style={styles.muted}>{[event.person_name, event.room_name].filter(Boolean).join(' · ') || 'Байршил тодорхойгүй'}</Text>
      <Snapshot key={`${event.id}:${event.snapshot_path}`} path={event.snapshot_path} />
      <Card>
        <Text style={styles.text}>Илэрсэн: {dateLabel(event.occurred_at)}</Text>
        <Text style={styles.text}>Түвшин: {severityLabel[event.severity]}</Text>
        <Text style={styles.text}>Төлөв: {statusLabel[event.status]}</Text>
        {event.confidence != null && <Text style={styles.text}>Итгэлцүүр: {Math.round(event.confidence * 100)}%</Text>}
        {event.acknowledged_at && <Text style={styles.muted}>Харсан: {dateLabel(event.acknowledged_at)}</Text>}
        {event.note && <Text style={styles.muted}>{event.note}</Text>}
      </Card>
      <EventActions key={event.id} event={event} onUpdated={setSaved} />
    </>}
  </ScrollView></Screen>;
}
```
Үүсгэх, install, ажиллуулах болон шалгах дэлгэрэнгүй алхмууд `docs/setup.md`-д байна.