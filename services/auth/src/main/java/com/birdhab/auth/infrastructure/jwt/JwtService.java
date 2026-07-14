package com.birdhab.auth.infrastructure.jwt;

import com.birdhab.auth.domain.entity.Role;
import com.birdhab.auth.domain.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Génération et validation des jetons JWT (access et refresh) via jjwt.
 *
 * <p>Le claim {@code type} distingue un access token d'un refresh token afin
 * d'éviter qu'un access token soit utilisé à la place d'un refresh token
 * (et inversement).</p>
 */
@Service
public class JwtService {

    private static final String CLAIM_TYPE = "type";
    private static final String CLAIM_ROLES = "roles";
    private static final String CLAIM_EMAIL = "email";
    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";

    private final JwtProperties properties;
    private final SecretKey key;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(User user) {
        return buildToken(user, TYPE_ACCESS, properties.getAccessTokenExpirationMs());
    }

    public String generateRefreshToken(User user) {
        return buildToken(user, TYPE_REFRESH, properties.getRefreshTokenExpirationMs());
    }

    private String buildToken(User user, String type, long expirationMs) {
        Date now = new Date();
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .map(Enum::name)
                .collect(Collectors.toList());

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim(CLAIM_EMAIL, user.getEmail())
                .claim(CLAIM_ROLES, roles)
                .claim(CLAIM_TYPE, type)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    /**
     * Parse et valide la signature/expiration du jeton.
     *
     * @throws JwtException si le jeton est invalide, malformé ou expiré
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

    public boolean isRefreshToken(Claims claims) {
        return TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class));
    }

    public long getAccessTokenExpirationSeconds() {
        return properties.getAccessTokenExpirationMs() / 1000;
    }

    public long getRefreshTokenExpirationMs() {
        return properties.getRefreshTokenExpirationMs();
    }
}
