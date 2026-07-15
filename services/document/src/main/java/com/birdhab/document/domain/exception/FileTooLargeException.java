package com.birdhab.document.domain.exception;

/**
 * Levée lorsqu'un fichier uploadé dépasse la taille maximale autorisée (10 Mo).
 * Mappée en HTTP 400 par le {@code GlobalExceptionHandler}.
 */
public class FileTooLargeException extends RuntimeException {

    public FileTooLargeException() {
        super("Le fichier dépasse la taille maximale autorisée (10 Mo)");
    }
}
