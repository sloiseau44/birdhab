# Birdhab — Instructions pour Claude Code

> Contexte produit/business complet dans `CONTEXT.md` à la racine du repo.
> Ce fichier ne contient que ce qui est utile pour coder correctement au quotidien.

## Stack

- Java 21 (records, virtual threads, pattern matching si pertinent)
- Spring Boot 3
- Spring Security + JWT + OAuth2
- PostgreSQL
- MinIO pour le stockage de fichiers
- Docker / Docker Compose
- GitHub Actions (CI sur `main` et `develop`)
- OpenAPI / Swagger pour la doc API
- Spring Cloud Gateway (pile réactive WebFlux) pour le point d'entrée unique (`gateway`)
- React 18 + Vite 8 + TypeScript + Tailwind CSS v4 pour le frontend (`frontend/`)

## Décisions techniques actées (ne pas remettre en question sans validation explicite)

- **Migrations BDD : Flyway** (pas Liquibase). Fichiers `V{n}__description.sql` dans `src/main/resources/db/migration`.
- **Génération PDF : Apache PDFBox** (pas iText, incompatible licence avec le modèle open-core).
- **Multi-tenant (propriétaires) : schéma unique**, isolation via colonne `owner_id` sur toutes les tables métier. Pas de schéma par propriétaire.
- **Isolation Flyway par microservice : un schéma Postgres dédié par service** (ex. `property`), même si tous partagent la même base `birdhab` en local — évite la collision de `flyway_schema_history` entre services (voir `spring.flyway.schemas` dans `application.yml` de `property`). À reproduire pour chaque nouveau service.
- **`owner_id` sans contrainte FK inter-service** : `owner_id` référence l'id d'un `User` du service `auth` par simple convention applicative (UUID), sans relation JPA ni FK SQL — cohérent avec « un service = un contexte borné » (voir Architecture). Ne pas ajouter de FK vers une table d'un autre microservice.
- **Propagation d'identité inter-services : chaque service valide lui-même le JWT**, secret partagé via `JWT_SECRET` (même valeur par défaut que `auth` en local), sans appel réseau vers `auth`. Décision définitive, y compris maintenant que `gateway` existe (voir ci-dessous). L'implémentation elle-même (`JwtAuthenticationFilter`/`JwtAuthenticationEntryPoint`/`JwtValidatorService`) est partagée dans `shared/common/.../security` depuis la suppression de la duplication entre services — mais l'indépendance de validation par service, elle, reste actée : ne pas centraliser cette vérification dans un composant appelé par les autres au runtime.
- **`gateway` : routage HTTP pur, pas de centralisation JWT.** La Gateway route par préfixe de chemin vers chaque service sans jamais valider ni transmettre l'identité elle-même ; centraliser reviendrait à faire confiance à un en-tête interne (ex. `X-User-Id`) alors que les services restent également joignables directement (pas d'isolation réseau prévue pour un produit open-core self-hosted) — un attaquant pourrait alors forger cet en-tête en s'adressant directement au service. Ne pas revenir sur cette décision sans fermer l'accès direct aux services.
- **Aucune agrégation cross-service côté serveur** : un service qui a besoin de données détenues par un autre (ex. la quittance PDF de `payment`, qui a besoin du nom/adresse du bailleur et du locataire) ne les récupère jamais lui-même par appel réseau ; c'est l'appelant (frontend/BFF) qui les agrège et les transmet dans le corps de la requête. Voir `docs/api/payment.yml` (`ReceiptRequest`) pour l'exemple appliqué.
- **Adresse postale sur `User` (`auth`) : ajoutée a posteriori, pas à l'inscription.** `RegisterRequest` ne demande toujours que email/mot de passe/prénom/nom ; l'adresse (nécessaire pour la quittance PDF) se renseigne via `PUT /auth/me`, colonnes nullable en base. Ne pas rendre l'adresse obligatoire à l'inscription : ça alourdirait ce flux pour une donnée qui n'est utile qu'au moment de générer une quittance.
- **Node du poste de dev : 24 LTS** (mis à jour depuis 18.16 via `winget install OpenJS.NodeJS.LTS`, action confirmée explicitement car changement système). Débloque Tailwind CSS v4 et react-router-dom v7 (utilisés depuis), et Vite 8 (corrige une vulnérabilité esbuild du serveur de dev signalée par `npm audit` depuis le début du frontend). Plus de contrainte de version basse à surveiller pour les futures dépendances frontend.
- **Tests frontend : Vitest + React Testing Library + MSW**, pas de mock d'Axios — MSW intercepte au niveau réseau (XHR, via `@mswjs/interceptors`) pour rester proche du comportement réel, y compris pour l'intercepteur JWT de `src/api/client.ts`. Fichiers `*.test.ts(x)` à côté du fichier testé, config dans le bloc `test` de `vite.config.ts`, setup global dans `src/test/setup.ts`. `npm test` exécuté en CI (job « Frontend » de `.github/workflows/ci.yml`), en plus — pas à la place — de la vérification manuelle dans un vrai navigateur qui reste la référence pour valider un nouveau module de bout en bout. Couvre désormais les 5 modules CRUD (voir `src/pages/*.test.tsx`).
- **Upload multipart (`documents.ts`) : ne jamais fixer `Content-Type: multipart/form-data` à la main.** Seul Axios/le navigateur peut générer le `boundary` requis ; un header posé manuellement sans boundary casse le parsing du corps côté serveur (bug réel trouvé en écrivant les tests de `DocumentsPage`, reproductible aussi en dehors des tests). Laisser Axios déduire l'en-tête à partir du `FormData` passé en corps.
- **Limitations connues de jsdom (tests frontend, pas le code applicatif)** : `<input type="file" required>` ne passe jamais la validation native de jsdom même rempli (bug jsdom#2422) — contourner avec `fireEvent.submit(form)` plutôt qu'un clic sur le bouton ; `request.formData()` de MSW plante sur un `File` jsdom, et le nom de fichier ne survit pas à un aller-retour `FormData` + XHR sous jsdom — se limiter à `request.text()` pour les assertions sur le corps multipart dans ce cas.
- **Erreurs sur requêtes `responseType: 'blob'` (téléchargement de document, quittance) : ne jamais utiliser `extractErrorMessage` directement.** Axios respecte le `responseType` demandé même sur une réponse d'erreur, donc `error.response.data` est un `Blob`, pas le JSON `ErrorResponse` attendu. Utiliser `extractBlobErrorMessage` (`src/lib/errors.ts`), qui relit le Blob en texte et le parse avant de retomber sur le message générique.
- **Session expirée en cours d'usage (refresh token mort, pas au montage) : `client.ts` émet `SESSION_EXPIRED_EVENT`, `AuthContext` l'écoute pour déconnecter immédiatement.** Sans ça, l'intercepteur nettoyait bien les jetons mais l'état React (`user`) ne le savait jamais avant un prochain montage — l'utilisateur restait sur une page cassée au lieu d'être redirigé vers `/login` par `RequireAuth`.
- **`ErrorBoundary` global (`src/components/ErrorBoundary.tsx`, montée dans `main.tsx` autour de toute l'app)** : filet de sécurité contre un écran blanc en cas d'exception de rendu inattendue, pas un mécanisme de gestion d'erreur métier — les erreurs attendues (validation, 4xx/5xx) restent gérées localement par page via des `ErrorBanner`.
- **Accessibilité frontend : lien d'évitement dans `AppLayout` (cible `#main-content`), `scope="col"` sur tous les `<th>`, `role="progressbar"` avec `aria-valuenow/min/max` sur le `Meter` du tableau de bord, `role="status"` sur les indicateurs « Chargement… ».** À reproduire pour tout nouveau tableau (scope="col") ou nouvelle jauge de progression (role="progressbar").
- **Déploiement : bundle Docker tout-en-un (`docker-compose.yml` à la racine) pour l'usage self-hosted, distinct de `docker/docker-compose.yml` (infra dev-only, inchangé).** Un seul `Dockerfile` générique (`docker/service.Dockerfile`) sert aux 7 services Spring Boot, paramétré par `--build-arg MODULE=services/<nom>` — build Maven du reactor complet (`-am`) puis image JRE seule en runtime. Le frontend a son propre `Dockerfile` (build Vite + Nginx, qui sert les statiques et reverse-proxy `/api/*` vers `gateway`, même contrat que le proxy du serveur de dev Vite). Les URI de routage de `gateway` sont surchargeables par variable d'environnement (`AUTH_SERVICE_URL`...) pour pointer vers les noms de service Docker au lieu de `localhost`. Ne pas lancer les deux compose files en même temps (mêmes noms de conteneurs).
- **`spring-boot-maven-plugin` a besoin d'une exécution explicite liée à `package` dans le `pluginManagement` racine (`pom.xml`).** Le projet n'hérite pas de `spring-boot-starter-parent` (qui fournirait cette liaison par défaut), donc sans elle `mvn package` produit un jar "plain" non exécutable — invisible en dev puisque `mvn spring-boot:run` ne passe jamais par le jar packagé. Ne pas retirer cette exécution.
- **Déploiement gratuit sur Render (`render.yaml`), en plus du bundle Docker tout-en-un.** Motivé par le futur portail locataire : une instance qui doit rester accessible en permanence, pas seulement quand le PC du propriétaire tourne. Postgres et le stockage documents restent **externes à Render** (Neon, Backblaze B2) — son tier gratuit supprime sa base Postgres après 44 jours et n'autorise aucun disque persistant pour les services web. Autre limite du tier gratuit : un service web gratuit ne peut pas *recevoir* de trafic réseau privé Render (seulement en émettre), donc la Gateway appelle les 6 services via leurs URL publiques `*.onrender.com` (variables `sync: false`, renseignées à la main après le premier déploiement), pas via `fromService`/réseau interne qui ne fonctionnerait pas sur ce tier. `render.yaml` ne supportant pas les `--build-arg`, chaque service backend a son propre `docker/<service>.Dockerfile` figé plutôt que le `docker/service.Dockerfile` générique. Le frontend lit l'URL de la Gateway via `GATEWAY_URL` substituée au démarrage du conteneur (`frontend/nginx.conf.template`, templating Nginx officiel), puisqu'elle diffère entre Docker Compose local et Render. **En cours de premier déploiement réel par l'utilisateur** (7 des 8 services live au dernier point) — plusieurs écarts trouvés via ce test réel et corrigés dans `render.yaml`/README/`setup-wizard.html` : version Postgres Neon non précisée, comptes à créer non explicités, chemin de navigation Cloudflare R2 obsolète puis **Cloudflare R2 abandonné pour Backblaze B2** (R2 exige une carte bancaire dès l'activation, même à 0€), `JWT_SECRET` collé tronqué sur un service (clé HMAC < 256 bits, Spring refuse de démarrer), bouton de progression de l'assistant bloqué à tort par une détection de clic peu fiable. **Vrai bug de code trouvé et corrigé au passage** : `minio.bucket` était codé en dur à `birdhab-documents` dans `services/document/.../application.yml`, empêchant tout nom de bucket différent (ex. Backblaze B2) de fonctionner — devenu `${MINIO_BUCKET:birdhab-documents}`, variable ajoutée à `render.yaml`/README/assistant. Si un futur déploiement révèle un nouvel écart, corriger `render.yaml` et ce fichier en conséquence.
- **`setup-wizard.html` : assistant interactif pour le déploiement Render, en complément (pas en remplacement) des instructions du README.** Fichier HTML autonome, zéro dépendance, ouvrable en local sans rien installer — guide les 7 étapes, calcule les valeurs dérivées (URL JDBC depuis la chaîne de connexion Neon, secret JWT généré), état persisté en `localStorage` (survit à l'aller-retour vers Render/Neon/Backblaze). Deux bugs réels trouvés en le testant dans un vrai navigateur (pas en le relisant) : (1) le rendu reconstruit toute la page à chaque frappe (nécessaire pour les champs dérivés) — sans capture/restauration explicite du focus et de la position du curseur, un vrai clavier perdrait le focus à chaque caractère tapé, un nœud DOM recréé n'étant jamais focus par défaut ; (2) l'utilitaire de création d'éléments posait l'attribut HTML `disabled` même avec une valeur `null`, désactivant le bouton "Étape suivante" en permanence quelle que soit la valeur. Si ce fichier est modifié, revérifier ces deux points (focus/curseur préservés caractère par caractère, pas seulement testés via un simulateur de frappe qui peut masquer le problème ; boutons réellement activés/désactivés, pas juste visuellement). L'objet d'état pour le stockage s'appelle `state.storage` (pas `state.r2`) — générique, indépendant du fournisseur choisi.

## Architecture

Microservices dans `services/` : `auth`, `property`, `tenant`, `lease`, `document`, `payment`, `gateway`.
Code partagé dans `shared/common/`. Frontend dans `frontend/` (React SPA, appelle la Gateway).
Un service = un contexte borné, pas de dépendance directe entre services (passer par API ou événements).

## Conventions de code

- Branches : `main` (prod), `develop` (dev). Toujours partir de `develop`.
- Commits : Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`)
- DTOs en `record`
- Tests : JUnit 5 + Mockito, viser 80% de couverture minimum
- Tests d'intégration Flyway (`FlywayMigrationIT`, un par service avec base de données) : convention `*IT.java`,
  exécutés par `mvn verify` (failsafe) contre un Postgres réel, jamais par `mvn test` (nécessite
  `docker compose up` localement, voir `docker/README.md`). À reproduire pour tout nouveau service avec migrations.
- Javadoc sur toutes les classes publiques
- Un contrat OpenAPI à jour pour chaque endpoint exposé

## Périmètre MVP (v1) — ne pas déborder dessus sans le signaler

- Gestion des biens (ajout/modif : adresse, type, surface, loyer de référence)
- Gestion des locataires (fiche, coordonnées, documents d'identité)
- Gestion des baux (création, dates, loyer, dépôt de garantie, révision IRL)
- Suivi des paiements (enregistrement, détection retards, quittance PDF)
- Tableau de bord (loyers attendus vs perçus, biens occupés/vacants, alertes)

Tout le reste (v2+, Enterprise) est hors scope tant que non demandé explicitement — voir `CONTEXT.md`.

## Prochaine tâche pour Claude Code

**MVP complet, backend et frontend, de bout en bout.** Les 6 microservices
(`auth`, `property`, `tenant`, `lease`, `payment`, `document`) + `gateway`
sont implémentés et testés (JUnit 5 + Mockito, `FlywayMigrationIT` par
service avec base de données). Le frontend (`frontend/`, React 18 + Vite +
TypeScript + Tailwind v3) couvre l'authentification, le profil propriétaire,
et les 5 modules CRUD (Biens, Locataires, Baux, Paiements avec génération
réelle de quittance PDF, Documents) plus le tableau de bord — chacun vérifié
de bout en bout dans un vrai navigateur, pas seulement au build. Un premier
socle de tests automatisés frontend existe désormais (Vitest + Testing
Library + MSW, voir décision ci-dessus) sur la logique critique ; pas encore
une couverture exhaustive de toutes les pages. Pour le détail de chaque
module/décision, voir `git log` (les messages de commit documentent le
raisonnement) et le tableau « Décisions actées » de CONTEXT.md — cette
section ne duplique plus l'historique, qui change trop vite pour rester à
jour ici.

**Patterns à reproduire pour tout nouveau code :**
- Nouveau microservice backend : contrat OpenAPI d'abord, schéma Postgres
  dédié, couches domain/api/infrastructure/config, `JwtConfig` local
  exposant les beans partagés de `shared/common` (voir
  `services/property/.../infrastructure/jwt/JwtConfig.java`), tests JUnit 5
  + Mockito + `FlywayMigrationIT`.
- Nouveau module frontend CRUD : `src/api/<module>.ts` typé depuis
  `src/types/api/<service>.ts` (régénéré via `openapi-typescript` si le
  contrat change), page avec `useQuery`/`useMutation`, formulaire +
  table de liste (voir `PropertiesPage.tsx` comme gabarit, y compris son
  `PropertiesPage.test.tsx`) ; résoudre les références inter-entités (ex.
  `propertyId`) via des `Map` construites depuis `useQuery` plutôt que
  d'afficher des UUID bruts (voir `LeasesPage.tsx`) ; vérifier dans un vrai
  navigateur, pas seulement au build — un module a déjà révélé un vrai trou
  backend (adresse du propriétaire manquante) que `tsc`/`eslint` ne
  pouvaient pas détecter.
- Toute donnée agrégée depuis plusieurs services (quittance PDF, tableau de
  bord) : jamais d'appel réseau serveur-à-serveur, toujours côté appelant
  (voir décision « Aucune agrégation cross-service »).

**Chantiers restants, aucun n'est urgent — à discuter avant de commencer :**
- Portail locataire — le prochain demandé (compte + connexion locataire lié à sa
  fiche `Tenant` existante, puis accès à ses propres documents ; la messagerie
  avec le propriétaire viendrait ensuite, à part, nouveau microservice `messaging`).
  Motive aussi le déploiement Render (instance permanente).
- Encadrement des loyers, intégrations comptables et autres fonctionnalités
  v2+/Enterprise listées dans CONTEXT.md — hors scope tant que non demandées
  explicitement.
- `render.yaml` jamais déployé pour de vrai (pas de compte Render/Neon/Backblaze
  disponible) — à vérifier/corriger au premier déploiement réel.

## Contrats API

- `docs/api/auth.yml` : contrat OpenAPI du service `auth` (register, login, refresh, logout, me).
- `docs/api/property.yml` : contrat OpenAPI du service `property` (CRUD des biens).
- `docs/api/tenant.yml` : contrat OpenAPI du service `tenant` (CRUD des locataires).
- `docs/api/lease.yml` : contrat OpenAPI du service `lease` (CRUD des baux).
- `docs/api/payment.yml` : contrat OpenAPI du service `payment` (suivi des paiements, quittance PDF).
- `docs/api/document.yml` : contrat OpenAPI du service `document` (upload/téléchargement des documents d'identité).

À respecter strictement lors de l'implémentation des controllers — ne pas ajouter
d'endpoint ou de champ non prévu sans mettre à jour le contrat en premier.

## Environnement local

`docker/docker-compose.yml` fournit PostgreSQL + MinIO pour le développement local.
Lancer avec `cd docker && docker compose up -d`. Détails et identifiants dans `docker/README.md`.
Chaque service applicatif tourne en direct (pas dans Docker) et se connecte à cette infra
via les valeurs par défaut déjà présentes dans son propre `application.yml` (pas de profil
`local` séparé), surchargeables par variable d'environnement (`JWT_SECRET`, `MINIO_*`...).

## Licence

BUSL-1.1. Ne pas ajouter de dépendance dont la licence serait incompatible avec un usage
commercial futur en Enterprise (éviter AGPL notamment).