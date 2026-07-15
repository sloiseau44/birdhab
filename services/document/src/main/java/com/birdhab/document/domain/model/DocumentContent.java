package com.birdhab.document.domain.model;

import com.birdhab.document.domain.entity.Document;

import java.io.InputStream;

/**
 * Métadonnées d'un document accompagnées du flux de son contenu binaire,
 * renvoyées ensemble par {@code DocumentService.downloadContent} pour éviter
 * un aller-retour de stockage supplémentaire côté controller.
 */
public record DocumentContent(Document document, InputStream content) {
}
