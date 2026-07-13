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

## Décisions techniques actées (ne pas remettre en question sans validation explicite)

- **Migrations BDD : Flyway** (pas Liquibase). Fichiers `V{n}__description.sql` dans `src/main/resources/db/migration`.
- **Génération PDF : Apache PDFBox** (pas iText, incompatible licence avec le modèle open-core).
- **Multi-tenant : schéma unique**, isolation via colonne `owner_id` en FK sur toutes les tables métier. Pas de schéma par propriétaire.

## Architecture

Microservices dans `services/` : `auth`, `property`, `tenant`, `document`, `payment`, `gateway`.
Code partagé dans `shared/common/`.
Un service = un contexte borné, pas de dépendance directe entre services (passer par API ou événements).

## Conventions de code

- Branches : `main` (prod), `develop` (dev). Toujours partir de `develop`.
- Commits : Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`)
- DTOs en `record`
- Tests : JUnit 5 + Mockito, viser 80% de couverture minimum
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

Le squelette Maven du service `auth` est en place (pom.xml, application.yml,
classe principale, entités JPA, migration Flyway V1). Reste à implémenter,
en respectant strictement `docs/api/auth.yaml` :
- Repositories Spring Data JPA (`UserRepository`, `RoleRepository`, `RefreshTokenRepository`)
- Service d'authentification (hash BCrypt, génération/validation JWT avec jjwt)
- Configuration Spring Security (filtre JWT, `SecurityFilterChain`)
- Controllers REST + DTOs (records) pour `/auth/register`, `/auth/login`,
  `/auth/refresh`, `/auth/logout`, `/auth/me`
- Tests JUnit 5 + Mockito (viser 80% de couverture)

## Contrats API

`docs/api/auth.yaml` : contrat OpenAPI du service `auth` (register, login, refresh,
logout, me). À respecter strictement lors de l'implémentation des controllers —
ne pas ajouter d'endpoint ou de champ non prévu sans mettre à jour le contrat en premier.

## Environnement local

`docker/docker-compose.yml` fournit PostgreSQL + MinIO pour le développement local.
Lancer avec `cd docker && docker compose up -d`. Détails et identifiants dans `docker/README.md`.
Chaque service applicatif tourne en direct (pas dans Docker) et se connecte à cette infra
via un profil `local` (`application-local.yml`).

## Licence

BUSL-1.1. Ne pas ajouter de dépendance dont la licence serait incompatible avec un usage
commercial futur en Enterprise (éviter AGPL notamment).