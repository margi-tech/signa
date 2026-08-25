# Sistemul de Prieteni — Documentație

## Rezumat
Sistemul social permite utilizatorilor să se urmărească și derivă prietenia din
follow reciproc. Interfața este integrată în pagina **Profil**, nu într-o pagină
sau intrare separată din sidebar.

### Logică
- **Follow**: User A urmărește User B
- **Friendship**: User A urmărește User B ȘI User B urmărește User A → devin prieteni

Prietenia **nu se stochează** — e derivată din urmăriri reciproce, prin view-ul
`friendships`. Așa nu există stare de „cerere în așteptare" de întreținut.

### Confidențialitate
`user_directory` filtrează pe `visibility = 'public'`, la fel ca `leaderboard`.
Un profil privat **nu apare** în căutare și nu poate fi urmărit. Dacă cineva își
face profilul privat după ce a legat prietenii, dispare din listele celorlalți.

## Schema Supabase

Sursa de adevăr e `supabase/schema.sql` — rulează fișierul acolo, nu fragmentele
de mai jos.

### `follows` tabel
```sql
create table if not exists public.follows (
  id bigserial primary key,
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);
```
RLS: citesc participanții sau utilizatorii implicați în relații între două
profiluri publice. Inserezi/ștergi doar cu `auth.uid() = follower_id`, iar o
țintă nouă trebuie să fie publică. `update` este revocat.

### `friendships` view
Computed view care calculează prietenii (urmăriri reciproce):
```sql
create view friendships as
  select least(f1.follower_id, f1.following_id) as user_id_1,
         greatest(f1.follower_id, f1.following_id) as user_id_2,
         min(f1.created_at) as since
  from follows f1
  join follows f2 on f1.follower_id = f2.following_id
    and f1.following_id = f2.follower_id
  group by user_id_1, user_id_2;
```

## API Helpers (`src/lib/supabase.js`)

### `followUser(targetUserId)`
Urmărește un utilizator.

```js
await followUser('user-id-uuid');
```

### `unfollowUser(targetUserId)`
Anulează urmărirea unui utilizator.

```js
await unfollowUser('user-id-uuid');
```

### `checkFollowStatus(targetUserId)` → boolean
Verific dacă utilizatorul curent urmărește targetUserId.

```js
const following = await checkFollowStatus('user-id-uuid');
```

### `checkFriendshipStatus(targetUserId)` → boolean
Verific dacă utilizatorul curent și targetUserId sunt prieteni (urmăriri reciproce).

```js
const isFriend = await checkFriendshipStatus('user-id-uuid');
```

### `getFriends(userId)` → Array<Profile>
Obține lista de prieteni ai unui utilizator.

```js
const friends = await getFriends('user-id-uuid');
// [{ id, display_name, avatar_url, since }, ...]
```

### `getFollowing(userId)` → Array<Profile>
Obține lista de utilizatori urmăriți.

```js
const following = await getFollowing('user-id-uuid');
```

### `getFollowers(userId)` → Array<Profile>
Obține lista de urmăritori.

```js
const followers = await getFollowers('user-id-uuid');
```

### `searchUsers(query)` → Array<Profile>
Caută utilizatori după display_name.

```js
const results = await searchUsers('ana');
// [{ id, display_name, avatar_url }, ...]
```

### `getDirectoryProfile(userId)` → Profile | null
Încarcă un profil public din `user_directory` și îl completează cu XP/streak.

### `getIncomingRequests(userId)` → Array<Profile>
Returnează urmăritorii pe care utilizatorul nu îi urmărește încă. Acestea sunt
„cererile” din UI; nu există tabel separat.

## Componente React și integrare

| Fișier | Rol |
|---|---|
| `FriendsSection.jsx` | Secțiunea din Profil: taburi, contoare, profil selectat și erori |
| `UserRow.jsx` | Rând comun pentru rezultate și liste |
| `UserSearch.jsx` | Căutare cu debounce 300 ms și minimum 2 caractere |
| `FriendsList.jsx` | Prieteni, persoane urmărite și cereri derivate |
| `UserProfile.jsx` | Profilul public al altui jucător |
| `FollowButton.jsx` | Stări: Urmărește → Urmărești → Prieteni |

Props importante:

- `FollowButton`: `userId`, `idleLabel`, `onStatusChange`, `onError`, `onDark`
- `FriendsList`: `userId`, `mode`, `includeFollowing`, `onSelect`, `onError`,
  `onChanged`, `onFindFriends`

`ProfileDashboard` randează:

```jsx
<FriendsSection userId={user.id} />
```

Taburile sunt:

1. **Prietenii mei** — prieteni reciproci și persoane urmărite;
2. **Cereri** — utilizatori care te urmăresc, dar pe care nu îi urmărești încă;
3. **Caută** — directorul profilurilor publice.

„Cererea” este doar o stare calculată din follow-uri, nu un rând separat în DB.
Selectarea unui utilizator deschide `UserProfile` în aceeași secțiune.

Nu există `FriendsPage`, rută `friends`, handler `onFriends` sau element
„Prieteni” în sidebar. Erorile urcă prin `onError` până la `FriendsSection`.

## RLS Policies

### `follows` tabel
```sql
-- Participant sau relație între două profiluri publice
SELECT: using (
  auth.uid() = follower_id
  or auth.uid() = following_id
  or (profile_is_public(follower_id) and profile_is_public(following_id))
)

-- Utilizatorul poate urmări numai un profil public
INSERT: with check (
  auth.uid() = follower_id
  and profile_is_public(following_id)
)

-- Utilizator poate anula urmărire
DELETE: using (auth.uid() = follower_id)
```

## Validări

- ✅ Nu poți urma pe tine însuți (constraint `no_self_follow`)
- ✅ Follow duplicat e prevenit (unique constraint)
- ✅ Friendship require reciprocal follows
- ✅ Ștergere utilizator = ștergere follow records

## Setup Supabase

1. Copiază `.env.example` → `.env.local`
2. Setează `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY`
3. Rulează `supabase/schema.sql` în Supabase SQL Editor
4. Activează RLS pe tabelele: `profiles`, `progress`, `follows`

Pe un proiect creat înaintea funcției sociale, re-rulează **tot**
`supabase/schema.sql` (este idempotent), nu doar fragmentele pentru `follows`.

## Testing

### Manual
1. Creează 2 conturi de test
2. Logare User A, căutare User B
3. User A urmărește User B → status: "Urmărești"
4. Logare User B, căutare User A
5. User B urmărește User A → status: "👥 Prieten"
6. Verific FriendsList pe ambii utilizatori

### Edge cases
- Search pe 1 caracter (min 2)
- Unfollow și re-follow
- Secțiunea Profil pe cont fără prieteni
- Profil utilizator care nu urmărește înapoi
- Profil privat care dispare din director și liste

## Viitor

- [ ] Notificări la follow reciproc
- [ ] Activity feed (prietenii au luat X XP)
- [ ] Group challenges
- [ ] Chat privat (Fase viitoare)
