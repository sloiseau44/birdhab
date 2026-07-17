# Birdhab — Frontend

Interface web du backend Birdhab (React 18 + Vite 8 + TypeScript + Tailwind CSS v4).

## Démarrer en local

Backend requis : `gateway` (port 8080) et les services consultés (`auth`, `property`...)
doivent tourner en local, voir le `README.md` à la racine du repo.

```bash
npm install
npm run dev
```

Le serveur de dev écoute sur `http://localhost:5173` et proxifie `/api/*` vers la
Gateway (`http://localhost:8080`, voir `vite.config.ts`) — pas de configuration CORS
nécessaire côté backend en dev.

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement (HMR) |
| `npm run build` | Vérification des types (`tsc -b`) puis build de production |
| `npm run lint` | ESLint |
| `npm run preview` | Sert le build de production en local |
| `npm test` | Tests (Vitest, une seule passe) |
| `npm run test:watch` | Tests en mode watch |

## Tests

Vitest + React Testing Library + MSW (mock des appels HTTP au niveau réseau,
pas de mock d'Axios). Convention : `*.test.ts(x)` à côté du fichier testé.
Config dans `vite.config.ts` (bloc `test`), setup global (matchers
`@testing-library/jest-dom`, cycle de vie du serveur MSW) dans
`src/test/setup.ts`. Couvre la logique critique (intercepteur JWT/refresh de
`src/api/client.ts`, `AuthContext`/`RequireAuth`) et les 5 modules CRUD
(Biens, Locataires, Baux, Paiements avec génération de quittance, Documents
avec upload/download). Exécutés en CI (`.github/workflows/ci.yml`, job
« Frontend »), en plus de la vérification manuelle dans un vrai navigateur
qui reste la référence pour valider un nouveau module de bout en bout.

Deux limitations de jsdom à connaître si un test touche à un `<input type="file">` :
validation `required` toujours en échec même rempli (contourner avec
`fireEvent.submit(form)` plutôt qu'un clic sur le bouton), et perte du nom de
fichier à travers `FormData` + XHR (se limiter à `request.text()` côté MSW).

## Types API générés depuis OpenAPI

Les types TypeScript de `src/types/api/*.ts` sont générés depuis les contrats
OpenAPI du backend (`docs/api/*.yml` à la racine du repo), via `openapi-typescript`.
Ne pas les éditer à la main. Pour les régénérer après une modification d'un contrat :

```bash
npx openapi-typescript ../docs/api/<service>.yml -o src/types/api/<service>.ts
```

## Structure

```
src/
├── api/          # Appels HTTP typés par service (client.ts = instance Axios + JWT)
├── auth/         # Contexte d'authentification, garde de route
├── components/ui/  # Composants réutilisables (Button, Input, Card...)
├── layout/       # Layout applicatif (nav latérale)
├── lib/          # Utilitaires transverses
├── pages/        # Une page par route
└── types/api/    # Types générés depuis les contrats OpenAPI (voir ci-dessus)
```

## Authentification

Jetons stockés en `localStorage` (pas de cookie httpOnly, pas de BFF) : compromis
pragmatique pour une SPA sans backend dédié à ça, voir `src/api/client.ts`.
Rafraîchissement automatique de l'access token sur une réponse 401 (intercepteur Axios).

## Node.js

Ce projet nécessite Node **≥ 20** (Tailwind v4 et son moteur natif `@tailwindcss/oxide`
en particulier). Node 24 LTS utilisé en développement.
