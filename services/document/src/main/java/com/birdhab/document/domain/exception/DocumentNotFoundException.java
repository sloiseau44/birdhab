package com.birdhab.document.domain.exception;

/**
 * Levée lorsqu'un document est introuvable, ou existe mais n'appartient pas
 * au propriétaire authentifié (les deux cas sont indifférenciés côté API
 * pour ne pas révéler l'existence d'un document appartenant à un tiers).
 * Mappée en HTTP 404 par le {@code GlobalExceptionHandler}.
 */
public class DocumentNotFoundException extends RuntimeException {

    public DocumentNotFoundException() {
        super("Document introuvable");
    }
}
