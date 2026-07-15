package com.birdhab.document.api.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Métadonnées d'un document renvoyées par l'API (jamais son contenu binaire,
 * voir {@code GET /documents/{id}/content}).
 */
public record DocumentResponse(
        UUID id,
        UUID ownerId,
        UUID tenantId,
        String fileName,
        String contentType,
        long sizeBytes,
        Instant createdAt
) {
}
