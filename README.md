# Birdhab

Application de gestion locative tout-en-un pour propriétaires bailleurs particuliers (1 à 10 biens).

Pensée pour la France : bail type, quittances légales, révision IRL, encadrement des loyers.
Développée en architecture microservices avec Java 21 et Spring Boot 3, en open-core.

## Pourquoi ce projet

- Remplacer le suivi locatif sous Excel par un outil dédié, simple et complet
- Servir de vitrine technique (Java 21, Spring Boot 3, microservices, sécurité JWT)
- Rester 100% open-core : le code est public, aucune infrastructure SaaS à héberger

## Installation rapide (tout-en-un)

Pour essayer Birdhab sans installer Java/Node/Maven, une seule commande lance toute la
stack (infra + 6 microservices + Gateway + frontend) dans Docker :

```bash
cp .env.example .env   # puis changer les valeurs avant tout usage réel, voir le fichier
docker compose up -d --build
```

Application accessible sur `http://localhost:8888` (ou `$BIRDHAB_PORT` si défini dans
`.env`). Le tout premier lancement prend plusieurs minutes (build Maven de chaque
service) ; les suivants sont rapides grâce au cache. Pour arrêter :

```bash
docker compose down       # garde les données (Postgres, MinIO)
docker compose down -v    # repart de zéro
```

Cette commande est indépendante de `docker/docker-compose.yml`, qui ne fournit que
l'infra pour le développement au quotidien (voir « Démarrer en local » plus bas) — ne
pas lancer les deux en même temps, ils utilisent les mêmes noms de conteneurs.

## Déploiement gratuit sur le web (Render)

Pour une instance accessible en permanence (utile si des locataires doivent pouvoir se
connecter), sans rien installer sur ta machine, `render.yaml` décrit un déploiement
gratuit sur [Render](https://render.com). Comme le tier gratuit de Render supprime sa
base Postgres après 30 jours (+ 14 de grâce) et ne permet pas de disque persistant pour
MinIO, la base de données et le stockage de documents restent **externes à Render**,
sur deux autres services gratuits :

1. **Base de données** : crée un projet Postgres gratuit sur [Neon](https://neon.tech)
   (gratuit à vie, sans expiration). Note l'hôte, le nom de la base, l'utilisateur et le
   mot de passe depuis son tableau de bord.
2. **Stockage des documents** : crée un bucket sur [Cloudflare R2](https://developers.cloudflare.com/r2/)
   (10 Go gratuits à vie, compatible S3 — le code parle déjà ce protocole via le SDK
   MinIO, aucune modification de code nécessaire). Note l'endpoint S3
   (`https://<account-id>.r2.cloudflarestorage.com`), la clé d'accès et la clé secrète
   d'un jeton d'API R2.
   > Non testé de bout en bout par manque d'accès à un vrai compte Cloudflare — signale
   > tout souci de compatibilité si tu rencontres une erreur au premier upload.
3. **Déploiement** : sur Render, « New » → « Blueprint », pointer vers ce repo. Render
   détecte `render.yaml` et propose de créer les 8 services (6 microservices + Gateway +
   frontend), chacun sur le plan gratuit.
4. Pendant la création, Render demande une valeur pour chaque variable marquée
   `sync: false` dans `render.yaml` :
   - Sur `birdhab-auth`, `birdhab-property`, `birdhab-tenant`, `birdhab-lease`,
     `birdhab-payment`, `birdhab-document` : `SPRING_DATASOURCE_URL` (au format
     `jdbc:postgresql://<hôte-neon>/<base>?sslmode=require`), `SPRING_DATASOURCE_USERNAME`,
     `SPRING_DATASOURCE_PASSWORD` (depuis Neon) et `JWT_SECRET` (une valeur générée par
     toi, ex. `openssl rand -base64 32` — **la même valeur sur les 6 services**, sinon la
     validation des jetons échoue entre services).
   - Sur `birdhab-document` en plus : `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`,
     `MINIO_SECRET_KEY` (depuis Cloudflare R2).
5. Une fois ces 6 services déployés, Render affiche leur URL publique
   (`https://birdhab-auth.onrender.com`, etc.) dans le tableau de bord. Reporte-les dans
   les variables `AUTH_SERVICE_URL`, `PROPERTY_SERVICE_URL`... de `birdhab-gateway`
   (menu du service → Environment), puis fais de même pour `GATEWAY_URL` sur
   `birdhab-frontend` avec l'URL de `birdhab-gateway`.
6. Application accessible sur l'URL publique de `birdhab-frontend`.

Sur le tier gratuit, chaque service se met en veille après 15 minutes sans trafic
(réveil en ~1 minute à la requête suivante) — sans coût, mais avec ce délai occasionnel.

> Cette configuration a été vérifiée service par service contre la documentation
> officielle de Render (syntaxe `render.yaml`, limites du tier gratuit), mais pas
> déployée de bout en bout faute de compte Render/Neon/Cloudflare disponible pour le
> faire. Si une étape ne se passe pas comme décrit, partage l'erreur pour qu'on l'ajuste.

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
├── frontend/          # SPA React (appelle la Gateway), Dockerfile inclus (build + Nginx)
├── docker/            # docker-compose.yml (infra dev : Postgres, MinIO) + service.Dockerfile
├── docker-compose.yml # Bundle tout-en-un (infra + tous les services + frontend), voir plus bas
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

## Démarrer en local (développement)

Pour contribuer au code — chaque service tourne en direct (IDE ou ligne de commande),
pas dans Docker. Pour un simple essai de l'application, voir « Installation rapide »
ci-dessus.

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
