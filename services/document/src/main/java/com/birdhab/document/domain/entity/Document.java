package com.birdhab.document.domain.entity;

import com.birdhab.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Métadonnées d'un document d'identité de locataire ; le contenu binaire est
 * stocké dans MinIO sous la clé {@code storageKey} (voir
 * {@code infrastructure.storage.MinioStorageService}), jamais en base.
 *
 * <p>{@code ownerId} et {@code tenantId} référencent des entités d'autres
 * microservices (auth, tenant) par simple convention applicative : aucune
 * relation JPA ni contrainte de clé étrangère SQL n'est établie vers ces
 * services, chaque microservice étant un contexte borné indépendant (voir
 * CLAUDE.md).</p>
 */
@Entity
@Table(name = "documents")
public class Document extends BaseEntity {

    @Column(name = "owner_id", nullable = false, updatable = false)
    private UUID ownerId;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "storage_key", nullable = false, updatable = false, length = 255)
    private String storageKey;

    protected Document() {
        // requis par JPA
    }

    public Document(UUID ownerId, UUID tenantId, String fileName, String contentType,
                     long sizeBytes, String storageKey) {
        this.ownerId = ownerId;
        this.tenantId = tenantId;
        this.fileName = fileName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.storageKey = storageKey;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public String getFileName() {
        return fileName;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public String getStorageKey() {
        return storageKey;
    }
}
