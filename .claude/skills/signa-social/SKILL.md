---
name: signa-social
description: Modifică funcțiile sociale Signa — profil public/privat, follow reciproc, prieteni, căutare și integrarea Supabase. Folosește când lucrezi la FriendsSection, UserProfile, UserSearch, FriendsList, FollowButton, profiles/follows sau RLS.
---

# Social și prieteni în Signa

## Model

- Un follow este un rând în `public.follows`.
- O prietenie este derivată din două follow-uri reciproce prin view-ul
  `public.friendships`; nu crea tabel sau stare separată pentru cereri.
- `user_directory` și listele sociale expun doar profiluri publice.
- Tabela `profiles` nu este director public: profilul complet propriu se citește
  prin RPC-ul `get_own_profile()`, iar ceilalți apar numai prin view-uri cu
  coloane allowlist.
- Nu trimite în cloud imagini sau video. Datasetul colaborativ stochează doar
  vectori normalizați (199 / 30×199) pentru membri invitați; socialul rămâne
  profil + progres + follow.

## UI curent

- Prietenii trăiesc în `FriendsSection`, integrat în `ProfileDashboard`.
- Nu există `FriendsPage`, rută `friends` sau intrare „Prieteni” în sidebar.
- `FriendsSection` coordonează taburile, profilul selectat, listele și erorile.
- `UserRow` este rândul comun pentru căutare și liste.
- Erorile urcă prin `onError`; nu folosi `alert()` și nu ascunde eșecurile.

## Supabase

- Helpers sunt în `src/lib/supabase.js`: `followUser`, `unfollowUser`,
  `checkFollowStatus`, `checkFriendshipStatus`, `getFriends`, `getFollowing`,
  `getFollowers`, `searchUsers`.
- Follow/unfollow cere sesiune activă. Listele fără Supabase sau fără `userId`
  întorc `[]` acolo unde helper-ul definește fallback.
- RLS: un follow este vizibil participanților sau când ambele profiluri sunt
  publice. Insert/delete sunt permise numai când `auth.uid() = follower_id`,
  iar ținta este publică; update este revocat.
- Păstrează protecțiile `no_self_follow` și unicitatea perechii.
- `leaderboard`, `user_directory` și `friendships` folosesc
  `security_invoker = false` intenționat și expun doar coloanele declarate.
- Rolul se promovează numai operațional, din SQL Editor; trigger-ul
  `protect_profile_role` forțează clientul autentificat la `role = 'user'`.

## Verificare

Testează cu două conturi publice:

1. A îl urmărește pe B → „Urmărești”.
2. B îl urmărește pe A → „Prieteni”.
3. Unfollow revine la starea corectă pentru ambele conturi.
4. Profilul privat dispare din căutare și liste.
5. Secțiunea rămâne exclusiv în Profil, fără rută/sidebar separat.

Rulează și verificările din `signa-verify`.
