package com.birdhab.auth.domain.exception;

/**
 * Levée lorsque l'utilisateur porté par un access token valide n'existe plus
 * (ex. suppression de compte après émission du token). Mappée en HTTP 401 par
 * le {@code GlobalExceptionHandler}.
 */
public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException() {
        super("Utilisateur introuvable");
    }
}
