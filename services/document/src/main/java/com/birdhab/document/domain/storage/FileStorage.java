package com.birdhab.document.domain.storage;

import java.io.InputStream;

/**
 * Port de stockage de fichiers, implémenté par {@code infrastructure.storage.MinioFileStorage}.
 *
 * <p>Isole la couche métier du SDK MinIO : {@code DocumentService} ne connaît
 * que ce contrat, ce qui permet de le tester sans dépendance à une instance
 * MinIO réelle.</p>
 */
public interface FileStorage {

    /**
     * @throws FileStorageException en cas d'échec de l'upload
     */
    void upload(String key, InputStream content, long size, String contentType);

    /**
     * @throws FileStorageException en cas d'échec de la lecture
     */
    InputStream download(String key);

    /**
     * @throws FileStorageException en cas d'échec de la suppression
     */
    void delete(String key);
}
