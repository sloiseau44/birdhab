# Birdhab

Application de gestion locative tout-en-un pour propriétaires bailleurs particuliers (1 à 10 biens).

Pensée pour la France : bail type, quittances légales, révision IRL, encadrement des loyers.
Développée en architecture microservices avec Java 21 et Spring Boot 3, en open-core.

## Pourquoi ce projet

- Remplacer le suivi locatif sous Excel par un outil dédié, simple et complet
- Servir de vitrine technique (Java 21, Spring Boot 3, microservices, sécurité JWT)
- Rester 100% open-core : le code est public, aucune infrastructure SaaS à héberger

## Stack technique

| Composant | Technologie |
|---|---|
| Langage | Java 21 |
| Framework | Spring Boot 3 |
| Sécurité | Spring Security + JWT + OAuth2 |
| Base de données | PostgreSQL (migrations Flyway) |
| Stockage fichiers | MinIO |
| Documentation API | OpenAPI / Swagger |
| Conteneurisation | Docker |
| CI/CD | GitHub Actions |

## Architecture

Microservices indépendants, chacun avec son propre build Maven, son propre schéma de
données et son propre déploiement :

```
birdhab/
├── services/
│   ├── auth/          # Authentification, JWT, rôles, utilisateurs
│   ├── property/      # Biens immobiliers
│   ├── tenant/         # Locataires
│   ├── document/       # Documents, contrats, quittances PDF
│   ├── payment/        # Paiements, loyers, relances
│   └── gateway/        # API Gateway (point d'entrée unique)
├── shared/
│   └── common/         # Code technique partagé (pas de logique métier)
├── docker/              # Environnement local (Postgres, MinIO)
└── docs/api/            # Contrats OpenAPI
```

Le détail des décisions techniques et fonctionnelles est documenté dans
[`CONTEXT.md`](./CONTEXT.md).

## Démarrer en local

```bash
# 1. Lancer l'infrastructure (PostgreSQL + MinIO)
cd docker
docker compose up -d

# 2. Builder le projet
cd ..
mvn clean install

# 3. Lancer un service (exemple : auth)
cd services/auth
mvn spring-boot:run
```

Le service `auth` expose sa documentation Swagger sur `http://localhost:8081/swagger-ui.html`
une fois lancé.

## Licence

Ce projet est distribué sous licence [Business Source License 1.1 (BUSL-1.1)](./LICENSE).

- Usage commercial interdit sans autorisation préalable
- Bascule automatique en Apache 2.0 au 1er janvier 2029
- Contact pour usage commercial : stephaneloiseau44@gmail.com

## État d'avancement

Voir la section correspondante dans [`CONTEXT.md`](./CONTEXT.md).