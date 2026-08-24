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
- Nu trimite în cloud imagini, video sau landmarks. Supabase păstrează doar
  profil, progres și relații sociale.

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
- RLS: citirea relațiilor este permisă; insert/delete numai când
  `auth.uid() = follower_id`; update este revocat.
- Păstrează protecțiile `no_self_follow` și unicitatea perechii.

## Verificare

Testează cu două conturi publice:

1. A îl urmărește pe B → „Urmărești”.
2. B îl urmărește pe A → „Prieteni”.
3. Unfollow revine la starea corectă pentru ambele conturi.
4. Profilul privat dispare din căutare și liste.
5. Secțiunea rămâne exclusiv în Profil, fără rută/sidebar separat.

Rulează și verificările din `signa-verify`.
