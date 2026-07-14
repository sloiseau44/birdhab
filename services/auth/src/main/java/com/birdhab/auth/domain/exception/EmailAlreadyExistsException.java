package com.birdhab.auth.domain.exception;

/**
 * Levée lors d'une tentative de création de compte avec un email déjà utilisé.
 * Mappée en HTTP 409 par le {@code GlobalExceptionHandler}.
 */
public class EmailAlreadyExistsException extends RuntimeException {

    public EmailAlreadyExistsException(String email) {
        super("Un compte existe déjà avec l'email : " + email);
    }
}
