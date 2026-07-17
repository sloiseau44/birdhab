# syntax=docker/dockerfile:1
# Dockerfile Render pour le service property. Render ne supporte pas les --build-arg
# dans son render.yaml (contrairement à docker-compose.yml à la racine, qui utilise
# le Dockerfile générique docker/service.Dockerfile) : ce fichier est donc la même
# recette avec le module figé, un par service.
#
# Contexte de build attendu : la racine du repo (pas services/property), pour que
# Maven puisse résoudre le module partagé shared/common dans le même reactor.

FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY pom.xml .
COPY shared/common shared/common
COPY services services

RUN --mount=type=cache,target=/root/.m2     mvn --batch-mode --quiet -pl services/property -am package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /workspace/services/property/target/*.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
