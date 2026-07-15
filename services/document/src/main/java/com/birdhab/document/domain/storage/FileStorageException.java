package com.birdhab.document.domain.storage;

/**
 * Enveloppe toute erreur technique de stockage (MinIO indisponible, objet
 * illisible...). Mappée en HTTP 500 par le {@code GlobalExceptionHandler}
 * (géré par le handler générique, ce cas ne relevant pas d'une erreur métier).
 */
public class FileStorageException extends RuntimeException {

    public FileStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
