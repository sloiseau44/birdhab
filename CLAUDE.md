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
de bout en bout dans un vrai navigateur, pas seulement au build. Pour le
détail de chaque module/décision, voir `git log` (les messages de commit
documentent le raisonnement) et le tableau « Décisions actées » de
CONTEXT.md — cette section ne duplique plus l'historique, qui change trop
vite pour rester à jour ici.

**Patterns à reproduire pour tout nouveau code :**
- Nouveau microservice backend : contrat OpenAPI d'abord, schéma Postgres
  dédié, couches domain/api/infrastructure/config, `JwtConfig` local
  exposant les beans partagés de `shared/common` (voir
  `services/property/.../infrastructure/jwt/JwtConfig.java`), tests JUnit 5
  + Mockito + `FlywayMigrationIT`.
- Nouveau module frontend CRUD : `src/api/<module>.ts` typé depuis
  `src/types/api/<service>.ts` (régénéré via `openapi-typescript` si le
  contrat change), page avec `useQuery`/`useMutation`, formulaire +
  table de liste (voir `PropertiesPage.tsx` comme gabarit) ; résoudre les
  références inter-entités (ex. `propertyId`) via des `Map` construites
  depuis `useQuery` plutôt que d'afficher des UUID bruts (voir
  `LeasesPage.tsx`) ; vérifier dans un vrai navigateur, pas seulement au
  build — un module a déjà révélé un vrai trou backend (adresse du
  propriétaire manquante) que `tsc`/`eslint` ne pouvaient pas détecter.
- Toute donnée agrégée depuis plusieurs services (quittance PDF, tableau de
  bord) : jamais d'appel réseau serveur-à-serveur, toujours côté appelant
  (voir décision « Aucune agrégation cross-service »).

**Chantiers restants, aucun n'est urgent — à discuter avant de commencer :**
- Portail locataire, encadrement des loyers, intégrations comptables et
  autres fonctionnalités v2+/Enterprise listées dans CONTEXT.md — hors
  scope tant que non demandées explicitement.
- Déploiement / mise en production — aucune décision prise à ce stade.

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