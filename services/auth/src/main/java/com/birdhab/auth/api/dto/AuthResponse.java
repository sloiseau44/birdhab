package com.birdhab.auth.api.dto;

/**
 * Réponse renvoyée par {@code /auth/register}, {@code /auth/login} et
 * {@code /auth/refresh}.
 *
 * @param expiresIn durée de validité de l'accessToken, en secondes
 */
public record AuthResponse(String accessToken, String refreshToken, long expiresIn) {
}
