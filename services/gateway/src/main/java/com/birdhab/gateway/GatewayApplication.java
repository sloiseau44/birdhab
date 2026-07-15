package com.birdhab.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Point d'entrée de la Gateway : routage HTTP pur par préfixe de chemin vers
 * chaque microservice (voir {@code application.yml}), sans logique métier,
 * sans base de données, sans validation JWT.
 *
 * <p>Chaque service continue de valider lui-même les jetons JWT qu'il reçoit
 * (defense in depth) : la Gateway ne centralise pas cette validation, pour ne
 * pas introduire de confiance implicite envers un en-tête interne dans un
 * contexte où les services restent également joignables directement (voir
 * la décision actée dans CONTEXT.md).</p>
 */
@SpringBootApplication
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
