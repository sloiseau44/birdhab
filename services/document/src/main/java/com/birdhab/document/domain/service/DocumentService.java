package com.birdhab.document.domain.service;

import com.birdhab.document.domain.entity.Document;
import com.birdhab.document.domain.exception.DocumentNotFoundException;
import com.birdhab.document.domain.exception.FileTooLargeException;
import com.birdhab.document.domain.exception.UnsupportedFileTypeException;
import com.birdhab.document.domain.model.DocumentContent;
import com.birdhab.document.domain.repository.DocumentRepository;
import com.birdhab.document.domain.storage.FileStorage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;

/**
 * Logique métier de gestion des documents d'identité : upload (métadonnées +
 * stockage MinIO), consultation, téléchargement et suppression, toujours
 * scopés au propriétaire authentifié.
 */
@Service
@Transactional
public class DocumentService {

    private static final byte[] PDF_MAGIC = {0x25, 0x50, 0x44, 0x46}; // %PDF
    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC =
            {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};

    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024;

    private final DocumentRepository documentRepository;
    private final FileStorage fileStorage;

    public DocumentService(DocumentRepository documentRepository, FileStorage fileStorage) {
        this.documentRepository = documentRepository;
        this.fileStorage = fileStorage;
    }

    /**
     * Le type de fichier réellement stocké est déterminé en lisant les
     * premiers octets du contenu (signature PDF/JPEG/PNG), jamais à partir
     * du seul {@code Content-Type} déclaré par l'appelant (facilement
     * falsifiable) : {@code declaredContentType} ne sert qu'au message
     * d'erreur si le fichier est rejeté.
     *
     * @throws UnsupportedFileTypeException si le contenu ne correspond à aucune signature PDF/JPEG/PNG
     * @throws FileTooLargeException si le fichier dépasse 10 Mo
     */
    public Document upload(UUID ownerId, UUID tenantId, String fileName, String declaredContentType,
                            InputStream content) {
        byte[] bytes = readAllBytes(content);
        validateSize(bytes.length);

        String detectedContentType = detectContentType(bytes);
        if (detectedContentType == null) {
            throw new UnsupportedFileTypeException(declaredContentType);
        }

        String storageKey = UUID.randomUUID().toString();
        fileStorage.upload(storageKey, new ByteArrayInputStream(bytes), bytes.length, detectedContentType);

        Document document = new Document(ownerId, tenantId, fileName, detectedContentType, bytes.length, storageKey);
        return documentRepository.save(document);
    }

    @Transactional(readOnly = true)
    public List<Document> listForOwner(UUID ownerId, UUID tenantId) {
        if (tenantId != null) {
            return documentRepository.findByOwnerIdAndTenantId(ownerId, tenantId);
        }
        return documentRepository.findByOwnerId(ownerId);
    }

    /**
     * @throws DocumentNotFoundException si le document n'existe pas ou n'appartient pas à {@code ownerId}
     */
    @Transactional(readOnly = true)
    public Document getForOwner(UUID id, UUID ownerId) {
        return documentRepository.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(DocumentNotFoundException::new);
    }

    /**
     * @throws DocumentNotFoundException si le document n'existe pas ou n'appartient pas à {@code ownerId}
     */
    @Transactional(readOnly = true)
    public DocumentContent downloadContent(UUID id, UUID ownerId) {
        Document document = getForOwner(id, ownerId);
        InputStream content = fileStorage.download(document.getStorageKey());
        return new DocumentContent(document, content);
    }

    /**
     * @throws DocumentNotFoundException si le document n'existe pas ou n'appartient pas à {@code ownerId}
     */
    public void delete(UUID id, UUID ownerId) {
        Document document = getForOwner(id, ownerId);
        fileStorage.delete(document.getStorageKey());
        documentRepository.delete(document);
    }

    private void validateSize(long sizeBytes) {
        if (sizeBytes > MAX_SIZE_BYTES) {
            throw new FileTooLargeException();
        }
    }

    private String detectContentType(byte[] bytes) {
        if (startsWith(bytes, PDF_MAGIC)) {
            return "application/pdf";
        }
        if (startsWith(bytes, JPEG_MAGIC)) {
            return "image/jpeg";
        }
        if (startsWith(bytes, PNG_MAGIC)) {
            return "image/png";
        }
        return null;
    }

    private boolean startsWith(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }

    private byte[] readAllBytes(InputStream content) {
        try {
            return content.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
