package com.birdhab.auth.domain.exception;

/**
 * Levée lors d'une tentative de connexion sur un compte désactivé.
 * Mappée en HTTP 403 par le {@code GlobalExceptionHandler}.
 */
public class AccountDisabledException extends RuntimeException {

    public AccountDisabledException() {
        super("Ce compte est désactivé");
    }
}
