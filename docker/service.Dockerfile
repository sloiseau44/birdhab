# syntax=docker/dockerfile:1
# Dockerfile générique pour n'importe quel microservice Spring Boot du reactor Maven
# (auth, property, tenant, lease, payment, document, gateway). Le module à builder est
# passé via --build-arg MODULE=services/<nom> ; voir docker-compose.yml à la racine.
#
# Contexte de build attendu : la racine du repo (pas services/<nom>), pour que Maven
# puisse résoudre le module partagé shared/common dans le même reactor.

FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
ARG MODULE

COPY pom.xml .
COPY shared/common shared/common
COPY services services

# Cache du repo local Maven entre builds (BuildKit) : évite de retélécharger les
# dépendances à chaque service, la plupart sont partagées (Spring Boot, JUnit...).
RUN --mount=type=cache,target=/root/.m2 \
    mvn --batch-mode --quiet -pl ${MODULE} -am package -DskipTests

FROM eclipse-temurin:21-jre-alpine
ARG MODULE
WORKDIR /app
COPY --from=build /workspace/${MODULE}/target/*.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
