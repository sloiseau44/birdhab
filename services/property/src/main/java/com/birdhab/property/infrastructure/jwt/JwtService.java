package com.birdhab.property.infrastructure.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

/**
 * Validation des jetons JWT émis par le service auth (jjwt).
 *
 * <p>property ne génère jamais de jeton : il se contente de vérifier la
 * signature (secret partagé avec auth) et d'en extraire l'identité de
 * l'appelant, faisant ainsi office d'{@code owner_id}.</p>
 */
@Service
public class JwtService {

    private static final String CLAIM_TYPE = "type";
    private static final String CLAIM_ROLES = "roles";
    private static final String TYPE_ACCESS = "access";

    private final SecretKey key;

    public JwtService(JwtProperties properties) {
        this.key = Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Parse et valide la signature/expiration du jeton.
     *
     * @throws io.jsonwebtoken.JwtException si le jeton est invalide, malformé ou expiré
     */
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID extractUserId(Claims claims) {
        return UUID.fromString(claims.getSubject());
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(Claims claims) {
        return (List<String>) claims.get(CLAIM_ROLES, List.class);
    }

    public boolean isAccessToken(Claims claims) {
        return TYPE_ACCESS.equals(claims.get(CLAIM_TYPE, String.class));
    }
}
