package com.birdhab.auth.infrastructure.jwt;

import com.birdhab.auth.domain.entity.Role;
import com.birdhab.auth.domain.entity.RoleName;
import com.birdhab.auth.domain.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;
    private User user;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("test-secret-key-at-least-256-bits-long-for-hs256-signing");
        properties.setAccessTokenExpirationMs(900_000);
        properties.setRefreshTokenExpirationMs(2_592_000_000L);
        jwtService = new JwtService(properties);

        user = new User("proprietaire@example.com", "hash");
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        user.addRole(new Role(RoleName.OWNER));
    }

    @Test
    void generateAccessToken_producesTokenWithAccessTypeAndRoles() {
        String token = jwtService.generateAccessToken(user);

        Claims claims = jwtService.parseClaims(token);

        assertThat(jwtService.extractUserId(claims)).isEqualTo(user.getId());
        assertThat(jwtService.isAccessToken(claims)).isTrue();
        assertThat(jwtService.isRefreshToken(claims)).isFalse();
        assertThat(jwtService.extractRoles(claims)).containsExactly("OWNER");
    }

    @Test
    void generateRefreshToken_producesTokenWithRefreshType() {
        String token = jwtService.generateRefreshToken(user);

        Claims claims = jwtService.parseClaims(token);

        assertThat(jwtService.isRefreshToken(claims)).isTrue();
        assertThat(jwtService.isAccessToken(claims)).isFalse();
    }

    @Test
    void parseClaims_expiredToken_throws() {
        JwtProperties expiredProperties = new JwtProperties();
        expiredProperties.setSecret("test-secret-key-at-least-256-bits-long-for-hs256-signing");
        expiredProperties.setAccessTokenExpirationMs(-1);
        expiredProperties.setRefreshTokenExpirationMs(-1);
        JwtService expiredJwtService = new JwtService(expiredProperties);

        String token = expiredJwtService.generateAccessToken(user);

        assertThatThrownBy(() -> expiredJwtService.parseClaims(token))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void parseClaims_tamperedSignature_throws() {
        String token = jwtService.generateAccessToken(user);
        String tampered = token.substring(0, token.length() - 2) + "xx";

        assertThatThrownBy(() -> jwtService.parseClaims(tampered))
                .isInstanceOf(SignatureException.class);
    }

    @Test
    void getAccessTokenExpirationSeconds_convertsMillisToSeconds() {
        assertThat(jwtService.getAccessTokenExpirationSeconds()).isEqualTo(900);
    }
}
