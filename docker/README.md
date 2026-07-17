# Environnement local — Birdhab

Ce `docker-compose.yml` fournit les dépendances d'infrastructure nécessaires
au développement local (PostgreSQL + MinIO). Il ne contient volontairement
aucun service applicatif Birdhab : chaque microservice tourne en direct
depuis l'IDE ou via `mvn spring-boot:run` / Claude Code, pointé sur cette infra.

> Pour lancer l'application complète (tous les services + frontend) en une seule
> commande, sans installer Java/Node, voir `docker-compose.yml` à la racine du repo
> et la section « Installation rapide » du `README.md` racine — ne pas mélanger les
> deux, mêmes noms de conteneurs.

## Lancer l'environnement

```bash
cd docker
docker compose up -d
```

## Arrêter l'environnement

```bash
docker compose down
```

Pour repartir de zéro (⚠️ supprime les données) :

```bash
docker compose down -v
```

## Accès

| Service | URL / Host | Identifiants |
|---|---|---|
| PostgreSQL | `localhost:5432`, base `birdhab` | user: `birdhab` / password: `birdhab` |
| MinIO API (S3) | `http://localhost:9000` | user: `birdhab` / password: `birdhab123` |
| MinIO Console | `http://localhost:9001` | user: `birdhab` / password: `birdhab123` |

Ces identifiants sont pour le développement local uniquement — ne jamais les
réutiliser en environnement de production ou de recette.

Le bucket MinIO `birdhab-documents` (utilisé par le service `document`) est créé
automatiquement au démarrage de ce service s'il n'existe pas encore — aucune
action manuelle nécessaire dans la console MinIO.

## Configuration côté Spring Boot

Chaque service pointe déjà vers cette infra par défaut dans son propre
`application.yml` (pas de profil `local` séparé) :

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/birdhab
    username: birdhab
    password: birdhab
  flyway:
    enabled: true
    locations: classpath:db/migration

minio:
  endpoint: http://localhost:9000
  access-key: birdhab
  secret-key: birdhab123
```

Ces valeurs sont surchargeables via variables d'environnement (`JWT_SECRET`,
`MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`...) sans jamais
modifier le fichier — voir `application.yml` de chaque service pour la
liste exacte des variables disponibles.