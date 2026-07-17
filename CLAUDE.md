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
- React 18 + Vite + TypeScript + Tailwind CSS v3 pour le frontend (`frontend/`)

## Décisions techniques actées (ne pas remettre en question sans validation explicite)

- **Migrations BDD : Flyway** (pas Liquibase). Fichiers `V{n}__description.sql` dans `src/main/resources/db/migration`.
- **Génération PDF : Apache PDFBox** (pas iText, incompatible licence avec le modèle open-core).
- **Multi-tenant (propriétaires) : schéma unique**, isolation via colonne `owner_id` sur toutes les tables métier. Pas de schéma par propriétaire.
- **Isolation Flyway par microservice : un schéma Postgres dédié par service** (ex. `property`), même si tous partagent la même base `birdhab` en local — évite la collision de `flyway_schema_history` entre services (voir `spring.flyway.schemas` dans `application.yml` de `property`). À reproduire pour chaque nouveau service.
- **`owner_id` sans contrainte FK inter-service** : `owner_id` référence l'id d'un `User` du service `auth` par simple convention applicative (UUID), sans relation JPA ni FK SQL — cohérent avec « un service = un contexte borné » (voir Architecture). Ne pas ajouter de FK vers une table d'un autre microservice.
- **Propagation d'identité inter-services : chaque service valide lui-même le JWT**, secret partagé via `JWT_SECRET` (même valeur par défaut que `auth` en local), sans appel réseau vers `auth`. Décision définitive, y compris maintenant que `gateway` existe (voir ci-dessous). L'implémentation elle-même (`JwtAuthenticationFilter`/`JwtAuthenticationEntryPoint`/`JwtValidatorService`) est partagée dans `shared/common/.../security` depuis la suppression de la duplication entre services — mais l'indépendance de validation par service, elle, reste actée : ne pas centraliser cette vérification dans un composant appelé par les autres au runtime.
- **`gateway` : routage HTTP pur, pas de centralisation JWT.** La Gateway route par préfixe de chemin vers chaque service sans jamais valider ni transmettre l'identité elle-même ; centraliser reviendrait à faire confiance à un en-tête interne (ex. `X-User-Id`) alors que les services restent également joignables directement (pas d'isolation réseau prévue pour un produit open-core self-hosted) — un attaquant pourrait alors forger cet en-tête en s'adressant directement au service. Ne pas revenir sur cette décision sans fermer l'accès direct aux services.
- **Aucune agrégation cross-service côté serveur** : un service qui a besoin de données détenues par un autre (ex. la quittance PDF de `payment`, qui a besoin du nom/adresse du bailleur et du locataire) ne les récupère jamais lui-même par appel réseau ; c'est l'appelant (frontend/BFF) qui les agrège et les transmet dans le corps de la requête. Voir `docs/api/payment.yml` (`ReceiptRequest`) pour l'exemple appliqué.
- **Frontend : Tailwind CSS v3 (pas v4), react-router-dom v6 (pas v7).** Ces versions plus récentes exigent Node ≥ 20 (le moteur natif `@tailwindcss/oxide` de Tailwind v4 en particulier), incompatible avec le poste de développement actuel (Node 18.16). Remonter à ces versions dès que Node est mis à jour — voir `frontend/README.md`.

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

Les services `auth` (register/login/refresh/logout/me, JWT, Spring Security),
`property` (CRUD des biens), `tenant` (CRUD locataires), `lease` (CRUD baux),
`payment` (suivi des paiements, quittance PDF) et `document` (upload des
documents d'identité, stockage MinIO) sont entièrement implémentés et testés
(JUnit 5 + Mockito, couverture visée 80%, 100% atteint sur `TenantService`,
`LeaseService`, `PaymentService`, `ReceiptPdfGenerator` et `DocumentService`).
`gateway` est également en place (Spring Cloud Gateway, routage HTTP pur par
préfixe de chemin vers chaque service — voir décision ci-dessus) ; pas de
couche domaine à tester, vérifié par un test de contexte sur les routes
configurées et manuellement de bout en bout (property + gateway lancés
localement, requête routée avec succès).

Hors périmètre v1 : calcul automatique de la révision IRL et génération du
contrat de bail PDF (`lease`), rattachement d'un document à un bail
(`document`). Le statut d'un bail (`ACTIVE`/`TERMINATED`) et celui d'une
échéance (`PENDING`/`PAID`/`LATE`) sont dérivés à la lecture plutôt que
persistés. La quittance PDF de `payment` ne va jamais chercher elle-même les
informations bailleur/locataire/bien auprès des autres services : l'appelant
les fournit dans `ReceiptRequest` (voir décision « Aucune agrégation
cross-service » ci-dessus). `document` isole le SDK MinIO derrière un port
`FileStorage` (domain/storage), pour garder `DocumentService` testable sans
instance MinIO réelle — ce pattern de port est à reconduire pour toute
future dépendance à un système externe (email, paiement en ligne...).

**Backend du MVP fonctionnellement complet.** Le tableau de bord (dernier
module listé au MVP) ne nécessite aucun service supplémentaire : ses
données (biens, statut occupé/vacant dérivé des baux actifs, loyers attendus
vs perçus et retards dérivés de `payment`) sont déjà entièrement exposées
par `property`/`lease`/`payment` via la Gateway. C'est une question
d'agrégation et d'affichage côté frontend, cohérente avec la décision déjà
prise deux fois (quittance PDF, Gateway) de ne jamais faire d'appel réseau
serveur-à-serveur pour agréger des données inter-services.

**Revue de sécurité menée sur les 6 services + gateway, 3 correctifs appliqués** :
canal temporel au login (`auth` vérifie désormais le mot de passe même si
l'email est inconnu, contre un hash factice), refresh tokens hachés SHA-256
en base au lieu du clair (`RefreshToken.tokenHash`, migration
`V2__hash_refresh_tokens.sql`), type de fichier de `document` détecté par
signature d'octets réels plutôt que par le `Content-Type` déclaré par le
client (falsifiable). Voir le tableau « Décisions actées » de CONTEXT.md
pour le détail de chaque correctif — à reproduire pour tout nouveau code
touchant à l'authentification ou à l'upload de fichiers.

**Consolidation complémentaire** : un `FlywayMigrationIT` par service avec
base de données (failsafe, `mvn verify`) comble le trou entre migrations
Flyway et mapping JPA que les tests unitaires mockés ne couvrent pas (voir
« Tests d'intégration Flyway » dans Conventions de code). L'infrastructure
JWT dupliquée (`JwtService`/`JwtProperties`/`JwtAuthenticationFilter`/
`JwtAuthenticationEntryPoint`) a été extraite vers
`shared/common/.../security` : `JwtAuthenticationFilter`/`EntryPoint` sont
component-scannés automatiquement partout, `JwtValidatorService`/`JwtProperties`
sont déclarés explicitement par un petit `JwtConfig` par service (voir
point 5 ci-dessous) pour ne pas entrer en conflit avec le `JwtService`
propre à `auth`, qui implémente directement `JwtValidator`.

**Frontend démarré** (`frontend/`, React 18 + Vite + TypeScript + Tailwind v3,
voir décisions ci-dessus et `frontend/README.md`). En place : authentification
complète (login/register/logout, JWT en localStorage, rafraîchissement
automatique sur 401, garde de route), layout avec navigation, et le module
**Biens** en CRUD complet (`src/pages/PropertiesPage.tsx`) servant de gabarit.
Vérifié de bout en bout dans un vrai navigateur (pas seulement au build) :
inscription → connexion auto → CRUD réel via Gateway → property → Postgres →
déconnexion → garde de route.

Prochaine étape suggérée : construire les modules restants sur le même
gabarit que Biens — **Locataires**, **Baux**, **Paiements** (avec le flux de
génération de quittance PDF : le frontend doit agréger nom/adresse du
bailleur via `/auth/me`, nom du locataire via `tenant`, adresse du bien via
`property`, puis appeler `POST /payments/{id}/receipt`, voir décision
« Aucune agrégation cross-service » ci-dessus), **Documents** (upload
multipart), et le **tableau de bord** (agrégation property/lease/payment
côté client, voir CONTEXT.md). Chaque module suit le même schéma que
`PropertiesPage.tsx` : fichier `src/api/<module>.ts` typé depuis
`src/types/api/<service>.ts`, page avec `useQuery`/`useMutation`
(TanStack Query), formulaire de création/édition, table de liste.

Si un nouveau microservice backend s'avère nécessaire un jour (ex.
`messaging` pour le portail locataire, hors MVP), suivre la même méthode que
pour `property`/`tenant`/`lease`/`payment`/`document` :
1. Contrat OpenAPI — à proposer et faire valider avant de coder
2. Squelette Maven du module (ajouté aux `<modules>` du pom racine si nouveau service)
3. Entité(s) JPA + migration Flyway V1, dans un schéma Postgres dédié
   (voir décision « Isolation Flyway par microservice » ci-dessus)
4. Architecture en couches identique aux services existants (domain/api/infrastructure/config)
5. Sécurité : déclarer un `JwtConfig` local exposant les beans `JwtProperties`/`JwtValidator`
   de `shared/common` (voir `services/property/.../infrastructure/jwt/JwtConfig.java`) —
   `JwtAuthenticationFilter`/`EntryPoint` sont déjà component-scannés automatiquement
6. Tests JUnit 5 + Mockito, 80% de couverture visée, + un `FlywayMigrationIT`
   (voir « Tests d'intégration Flyway » dans Conventions de code)

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