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
- **Multi-tenant (propriétaires) : schéma unique**, isolation via colonne `owner_id` sur toutes les tables métier. Pas de schéma par propriétaire.
- **Isolation Flyway par microservice : un schéma Postgres dédié par service** (ex. `property`), même si tous partagent la même base `birdhab` en local — évite la collision de `flyway_schema_history` entre services (voir `spring.flyway.schemas` dans `application.yml` de `property`). À reproduire pour chaque nouveau service.
- **`owner_id` sans contrainte FK inter-service** : `owner_id` référence l'id d'un `User` du service `auth` par simple convention applicative (UUID), sans relation JPA ni FK SQL — cohérent avec « un service = un contexte borné » (voir Architecture). Ne pas ajouter de FK vers une table d'un autre microservice.
- **Propagation d'identité inter-services (en l'absence de Gateway) : validation JWT dupliquée dans chaque service consommateur**, secret partagé via `JWT_SECRET` (même valeur par défaut que `auth` en local), sans appel réseau vers `auth`. À reconduire pour chaque nouveau service tant que la Gateway n'existe pas (voir `services/property/.../infrastructure/jwt`).

## Architecture

Microservices dans `services/` : `auth`, `property`, `tenant`, `lease`, `document`, `payment`, `gateway`.
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

Les services `auth` (register/login/refresh/logout/me, JWT, Spring Security),
`property` (CRUD des biens), `tenant` (CRUD locataires) et `lease` (CRUD baux)
sont entièrement implémentés et testés (JUnit 5 + Mockito, couverture visée
80%, 100% atteint sur `TenantService` et `LeaseService`). Documents d'identité
(`tenant`) et calcul automatique de la révision IRL / génération du contrat
PDF (`lease`) restent hors périmètre v1 (voir `CONTEXT.md`). Le statut d'un
bail (`ACTIVE`/`TERMINATED`) est dérivé de `endDate` à la lecture plutôt que
persisté : aucun endpoint de résiliation anticipée n'existe en v1.

Prochaine étape suggérée : **service `payment`** (suivi des paiements —
enregistrement, détection des retards, génération de quittance PDF), module
suivant du MVP. `payment` référencera `leaseId` par la même convention que
les autres relations inter-services (UUID, sans FK). La génération de
quittance PDF utilisera Apache PDFBox (voir décision technique ci-dessus).

Suivre la même méthode que pour `property`/`tenant`/`lease` :
1. Contrat OpenAPI (`docs/api/payment.yml`) — à proposer et faire valider avant de coder
2. Squelette Maven du module (`services/payment/pom.xml`, ajouté aux `<modules>` du pom racine)
3. Entité(s) JPA + migration Flyway V1, dans un schéma Postgres dédié `payment`
   (voir décision « Isolation Flyway par microservice » ci-dessus)
4. Architecture en couches identique à `auth`/`property`/`tenant`/`lease` (domain/api/infrastructure/config)
5. Sécurité : réutiliser le pattern de validation JWT dupliquée introduit dans `property`/`tenant`/`lease`
6. Tests JUnit 5 + Mockito, 80% de couverture visée

## Contrats API

- `docs/api/auth.yaml` : contrat OpenAPI du service `auth` (register, login, refresh, logout, me).
- `docs/api/property.yml` : contrat OpenAPI du service `property` (CRUD des biens).
- `docs/api/tenant.yml` : contrat OpenAPI du service `tenant` (CRUD des locataires).
- `docs/api/lease.yml` : contrat OpenAPI du service `lease` (CRUD des baux).

À respecter strictement lors de l'implémentation des controllers — ne pas ajouter
d'endpoint ou de champ non prévu sans mettre à jour le contrat en premier.

## Environnement local

`docker/docker-compose.yml` fournit PostgreSQL + MinIO pour le développement local.
Lancer avec `cd docker && docker compose up -d`. Détails et identifiants dans `docker/README.md`.
Chaque service applicatif tourne en direct (pas dans Docker) et se connecte à cette infra
via un profil `local` (`application-local.yml`).

## Licence

BUSL-1.1. Ne pas ajouter de dépendance dont la licence serait incompatible avec un usage
commercial futur en Enterprise (éviter AGPL notamment).