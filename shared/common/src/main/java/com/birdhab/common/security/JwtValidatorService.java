package com.birdhab.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

/**
 * Validation des jetons JWT émis par le service {@code auth} (jjwt), pour un
 * service qui n'émet jamais de jeton lui-même : il se contente de vérifier la
 * signature (secret partagé avec auth) et d'en extraire l'identité de
 * l'appelant, faisant ainsi office d'{@code owner_id}.
 *
 * <p>N'est pas enregistrée automatiquement comme {@code @Component} (voir
 * {@link JwtProperties}) : chaque service consommateur la déclare
 * explicitement en bean.</p>
 */
public class JwtValidatorService implements JwtValidator {

    private static final String CLAIM_TYPE = "type";
    private static final String CLAIM_ROLES = "roles";
    private static final String TYPE_ACCESS = "access";

    private final SecretKey key;

    public JwtValidatorService(JwtProperties properties) {
        this.key = Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    @Override
    public UUID extractUserId(Claims claims) {
        return UUID.fromString(claims.getSubject());
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<String> extractRoles(Claims claims) {
        return (List<String>) claims.get(CLAIM_ROLES, List.class);
    }

    @Override
    public boolean isAccessToken(Claims claims) {
        return TYPE_ACCESS.equals(claims.get(CLAIM_TYPE, String.class));
    }
}
