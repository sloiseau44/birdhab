package com.birdhab.document.domain.exception;

/**
 * Levée lorsqu'un fichier uploadé n'est pas d'un type accepté (PDF, JPEG, PNG).
 * Mappée en HTTP 400 par le {@code GlobalExceptionHandler}.
 */
public class UnsupportedFileTypeException extends RuntimeException {

    public UnsupportedFileTypeException(String contentType) {
        super("Type de fichier non supporté (%s)".formatted(contentType));
    }
}
