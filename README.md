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
| Passerelle API | Spring Cloud Gateway |
| Documentation API | OpenAPI / Swagger |
| Conteneurisation | Docker |
| CI/CD | GitHub Actions |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |

## Architecture

Microservices indépendants, chacun avec son propre build Maven, son propre schéma de
données et son propre déploiement :

```
birdhab/
├── services/
│   ├── auth/          # Authentification, JWT, rôles, utilisateurs
│   ├── property/      # Biens immobiliers
│   ├── tenant/        # Locataires
│   ├── lease/         # Baux (bien + locataire, dates, loyer, dépôt, IRL)
│   ├── document/      # Documents d'identité des locataires (stockage MinIO)
│   ├── payment/       # Suivi des paiements, quittances PDF
│   └── gateway/       # Point d'entrée HTTP unique (routage pur, pas de logique métier)
├── shared/
│   └── common/        # Code technique partagé (JWT, entités de base — pas de logique métier)
├── frontend/          # SPA React (appelle la Gateway)
├── docker/            # Environnement local (Postgres, MinIO)
└── docs/api/          # Contrats OpenAPI
```

Le détail des décisions techniques et fonctionnelles est documenté dans
[`CONTEXT.md`](./CONTEXT.md) ; les conventions de développement (branches, tests,
architecture en couches...) dans [`CLAUDE.md`](./CLAUDE.md).

## Services

| Service | Port | Rôle | Swagger |
|---|---|---|---|
| `gateway` | 8080 | Point d'entrée unique (routage par préfixe de chemin) | — |
| `auth` | 8081 | Inscription, connexion, JWT, rôles | `/swagger-ui.html` |
| `property` | 8082 | CRUD des biens immobiliers | `/swagger-ui.html` |
| `tenant` | 8083 | CRUD des locataires | `/swagger-ui.html` |
| `lease` | 8084 | CRUD des baux | `/swagger-ui.html` |
| `payment` | 8085 | Suivi des paiements, quittance PDF | `/swagger-ui.html` |
| `document` | 8086 | Documents d'identité (upload/téléchargement) | `/swagger-ui.html` |

Chaque service (sauf `gateway`, qui ne fait que router) valide indépendamment les jetons
JWT émis par `auth` — pas d'appel réseau entre microservices, pas de confiance implicite
envers la Gateway (voir `CLAUDE.md` pour la justification).

## État d'avancement

MVP fonctionnellement complet, backend et frontend. Les 6 microservices ci-dessus et la
Gateway sont entièrement implémentés et testés. Le frontend (`frontend/`) couvre
l'authentification, le profil propriétaire, les 5 modules CRUD (biens, locataires, baux,
paiements avec génération de quittance PDF, documents) et le tableau de bord — chacun
vérifié de bout en bout dans un vrai navigateur, avec une suite de tests automatisés
(Vitest + Testing Library + MSW). Détail complet dans [`CONTEXT.md`](./CONTEXT.md).

## Démarrer en local

```bash
# 1. Lancer l'infrastructure (PostgreSQL + MinIO)
cd docker
docker compose up -d
cd ..

# 2. Builder le projet (tests unitaires uniquement, rapide, hors-ligne)
mvn clean install

# 3. Lancer un service (exemple : auth)
cd services/auth
mvn spring-boot:run
```

Une fois lancé, chaque service expose sa documentation Swagger sur son port
(voir tableau ci-dessus), par exemple `http://localhost:8081/swagger-ui.html` pour `auth`.

Pour appeler les services via un point d'entrée unique, lancer aussi `gateway`
(`cd services/gateway && mvn spring-boot:run`) et cibler `http://localhost:8080` :
chaque service reste joignable sur son port propre, `gateway` ne fait que router en plus.

### Tests

- `mvn test` : tests unitaires (JUnit 5 + Mockito), rapides, ne nécessitent aucune
  infrastructure.
- `mvn verify` : ajoute les tests d'intégration (`*IT.java`, ex. validation des
  migrations Flyway), qui nécessitent Postgres démarré (`docker compose up -d`,
  voir `docker/README.md`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Écoute sur `http://localhost:5173`, proxifie les appels API vers la Gateway
(`gateway` doit tourner sur le port 8080). Détails dans `frontend/README.md`.

## Licence

Ce projet est distribué sous licence [Business Source License 1.1 (BUSL-1.1)](./LICENSE).

- Usage commercial interdit sans autorisation préalable
- Bascule automatique en Apache 2.0 au 1er janvier 2029
- Contact pour usage commercial : stephaneloiseau44@gmail.com
