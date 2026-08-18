# Sistemul de Prieteni — Documentație

## Overview
Sistemul de prieteni permite utilizatorilor să se urmărească reciproc și să formeze prietenii pe baza follow bidirectional.

### Logică
- **Follow**: User A urmărește User B
- **Friendship**: User A urmărește User B ȘI User B urmărește User A → devin prieteni 👥

## Schema Supabase

### `follows` tabel
```sql
create table follows (
  id bigserial primary key,
  follower_id uuid references auth.users(id),
  following_id uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(follower_id, following_id),
  constraint no_self_follow check (follower_id != following_id)
);
```

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

## Componente React

### `FollowButton`
Buton pentru urmărire/amiciție. Afișează status: `+ Urmărește`, `Urmărești`, sau `👥 Prieten`.

```jsx
<FollowButton userId={userId} onStatusChange={handleChange} />
```

Props:
- `userId` (uuid): ID-ul utilizatorului de urmărit
- `onStatusChange` (fn): Callback optional la schimbarea status-ului

### `FriendsList`
Afișează lista de prieteni ai unui utilizator.

```jsx
<FriendsList userId={userId} compact={false} />
```

Props:
- `userId` (uuid): ID-ul utilizatorului
- `compact` (bool): Stil compact (default: false)

### `UserSearch`
Bară de căutare interactivă pentru găsirea și urmărirea utilizatorilor.

```jsx
<UserSearch />
```

Utilizează `searchUsers()` și afișează `FollowButton` pe fiecare rezultat.

### `UserProfile`
Card de profil cu urmărire și lista de prieteni.

```jsx
<UserProfile userId={userId} />
```

Features:
- Avatar + display_name
- FollowButton (dacă nu e profilul propriu)
- Buton pentru a folosi FriendsList

## Pagini

### `FriendsPage`
Pagina principală cu 2 tab-uri:

1. **🔍 Caută**: UserSearch component
2. **👥 Prietenii mei**: FriendsList pentru user-ul curent

```jsx
<FriendsPage onBack={handleBack} />
```

Accessible din:
- HomePage → butón "Prieteni"
- App.jsx routing

## Integrări

### HomePage
- Adăugat buton "Prieteni" în footer menu-uri

### ProfilePage
- Adăugat FriendsList compact sub secțiunea de autentificare

### App.jsx
- Adăugat rută pentru FriendsPage
- Adăugat prop `onFriends` handler

## RLS Policies

### `follows` tabel
```sql
-- Toți pot vedea urmăriri publice
SELECT: using (true)

-- Utilizator poate urma/urmări
INSERT: with check (auth.uid() = follower_id)

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
- Pagina prieteni pe cont fără prieteni
- Profil utilizator care nu urmărește înapoi

## Viitor

- [ ] Notificări la follow reciproc
- [ ] Activity feed (prietenii au luat X XP)
- [ ] Group challenges
- [ ] Chat privat (Fase viitoare)
