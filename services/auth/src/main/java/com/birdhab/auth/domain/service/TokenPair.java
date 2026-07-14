package com.birdhab.auth.domain.service;

/**
 * Couple de jetons émis à l'issue d'un register/login/refresh.
 *
 * @param accessToken       jeton JWT à courte durée de vie
 * @param refreshToken      jeton JWT à longue durée de vie
 * @param expiresInSeconds  durée de validité de l'access token, en secondes
 */
public record TokenPair(String accessToken, String refreshToken, long expiresInSeconds) {
}
