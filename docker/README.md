# Environnement local — Birdhab

Ce `docker-compose.yml` fournit les dépendances d'infrastructure nécessaires
au développement local (PostgreSQL + MinIO). Il ne contient volontairement
aucun service applicatif Birdhab : chaque microservice tourne en direct
depuis l'IDE ou via `mvn spring-boot:run` / Claude Code, pointé sur cette infra.

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

## Configuration côté Spring Boot

Dans `application-local.yml` (ou `.properties`) de chaque service :

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