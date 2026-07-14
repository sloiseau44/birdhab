package com.birdhab.tenant.infrastructure.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

/**
 * Renvoie une erreur JSON (même forme que {@code ErrorResponse} de l'API)
 * lorsqu'une requête non authentifiée cible un endpoint protégé.
 *
 * <p>Ce composant intervient en amont du {@code DispatcherServlet} : il ne
 * peut donc pas dépendre du DTO {@code ErrorResponse} de la couche api sans
 * inverser le sens de dépendance entre couches ; la forme du corps est donc
 * reproduite localement.</p>
 */
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public JwtAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                          AuthenticationException authException) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        var body = new ErrorBody(
                Instant.now(),
                HttpStatus.UNAUTHORIZED.value(),
                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                "Authentification requise",
                request.getRequestURI());

        objectMapper.writeValue(response.getWriter(), body);
    }

    private record ErrorBody(Instant timestamp, int status, String error, String message, String path) {
    }
}
