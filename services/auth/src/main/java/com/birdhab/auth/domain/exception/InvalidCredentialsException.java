package com.birdhab.auth.domain.exception;

/**
 * Levée lorsque l'email ou le mot de passe fourni lors du login est incorrect.
 * Mappée en HTTP 401 par le {@code GlobalExceptionHandler}.
 */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException() {
        super("Email ou mot de passe incorrect");
    }
}
