package com.birdhab.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Authentifie les requêtes portant un en-tête {@code Authorization: Bearer <access token>}
 * émis par le service auth, via le port {@link JwtValidator} implémenté par
 * chaque service (voir {@link JwtValidatorService} ou le {@code JwtService}
 * propre à {@code auth}).
 *
 * <p>Partagé entre tous les services (voir CLAUDE.md, décision « duplication
 * JWT extraite vers shared/common ») : component-scanné automatiquement grâce
 * à {@code @SpringBootApplication(scanBasePackages = "com.birdhab")} sur
 * chaque service.</p>
 *
 * <p>En cas de jeton absent, invalide ou expiré, la requête poursuit sans
 * authentification : c'est à {@code SecurityFilterChain} de décider si
 * l'endpoint requiert une authentification (401 renvoyé par
 * {@link JwtAuthenticationEntryPoint} le cas échéant).</p>
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtValidator jwtValidator;

    public JwtAuthenticationFilter(JwtValidator jwtValidator) {
        this.jwtValidator = jwtValidator;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());
            try {
                Claims claims = jwtValidator.parseClaims(token);
                if (jwtValidator.isAccessToken(claims)) {
                    List<GrantedAuthority> authorities = jwtValidator.extractRoles(claims).stream()
                            .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                            .map(GrantedAuthority.class::cast)
                            .toList();

                    var authentication = new UsernamePasswordAuthenticationToken(
                            jwtValidator.extractUserId(claims).toString(), null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (JwtException | IllegalArgumentException e) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
