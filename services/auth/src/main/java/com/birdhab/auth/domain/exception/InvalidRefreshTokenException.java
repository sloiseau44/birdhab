package com.birdhab.auth.domain.exception;

/**
 * Levée lorsqu'un refresh token est invalide, expiré, révoqué, ou n'appartient
 * pas à l'utilisateur authentifié. Mappée en HTTP 401 par le
 * {@code GlobalExceptionHandler}.
 */
public class InvalidRefreshTokenException extends RuntimeException {

    public InvalidRefreshTokenException() {
        super("Refresh token invalide, expiré ou révoqué");
    }
}
