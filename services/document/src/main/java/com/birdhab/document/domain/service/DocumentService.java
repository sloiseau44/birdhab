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

import java.io.InputStream;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Logique métier de gestion des documents d'identité : upload (métadonnées +
 * stockage MinIO), consultation, téléchargement et suppression, toujours
 * scopés au propriétaire authentifié.
 */
@Service
@Transactional
public class DocumentService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf", "image/jpeg", "image/png");
    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024;

    private final DocumentRepository documentRepository;
    private final FileStorage fileStorage;

    public DocumentService(DocumentRepository documentRepository, FileStorage fileStorage) {
        this.documentRepository = documentRepository;
        this.fileStorage = fileStorage;
    }

    /**
     * @throws UnsupportedFileTypeException si {@code contentType} n'est pas PDF/JPEG/PNG
     * @throws FileTooLargeException si {@code sizeBytes} dépasse 10 Mo
     */
    public Document upload(UUID ownerId, UUID tenantId, String fileName, String contentType,
                            long sizeBytes, InputStream content) {
        validateContentType(contentType);
        validateSize(sizeBytes);

        String storageKey = UUID.randomUUID().toString();
        fileStorage.upload(storageKey, content, sizeBytes, contentType);

        Document document = new Document(ownerId, tenantId, fileName, contentType, sizeBytes, storageKey);
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

    private void validateContentType(String contentType) {
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new UnsupportedFileTypeException(contentType);
        }
    }

    private void validateSize(long sizeBytes) {
        if (sizeBytes > MAX_SIZE_BYTES) {
            throw new FileTooLargeException();
        }
    }
}
