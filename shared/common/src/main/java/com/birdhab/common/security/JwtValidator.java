package com.birdhab.common.security;

import io.jsonwebtoken.Claims;

import java.util.List;
import java.util.UUID;

/**
 * Port de validation des jetons JWT, implémenté soit par {@link JwtValidatorService}
 * (services qui ne font que valider des jetons émis par auth), soit directement
 * par le {@code JwtService} du service {@code auth} (qui génère aussi des jetons).
 *
 * <p>Isole {@link JwtAuthenticationFilter} de l'implémentation concrète : le
 * filtre est partagé entre tous les services sans connaître jjwt ni le secret
 * partagé.</p>
 */
public interface JwtValidator {

    /**
     * Parse et valide la signature/expiration du jeton.
     *
     * @throws io.jsonwebtoken.JwtException si le jeton est invalide, malformé ou expiré
     */
    Claims parseClaims(String token);

    boolean isAccessToken(Claims claims);

    UUID extractUserId(Claims claims);

    List<String> extractRoles(Claims claims);
}
