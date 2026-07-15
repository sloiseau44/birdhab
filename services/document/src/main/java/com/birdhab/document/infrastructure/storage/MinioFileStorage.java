package com.birdhab.document.infrastructure.storage;

import com.birdhab.document.domain.storage.FileStorage;
import com.birdhab.document.domain.storage.FileStorageException;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.io.InputStream;

/**
 * Implémentation MinIO du port {@link FileStorage}.
 *
 * <p>Crée le bucket configuré au démarrage s'il n'existe pas encore (idempotent).</p>
 */
@Component
public class MinioFileStorage implements FileStorage {

    private final MinioClient minioClient;
    private final String bucket;

    public MinioFileStorage(MinioClient minioClient, MinioProperties properties) {
        this.minioClient = minioClient;
        this.bucket = properties.getBucket();
    }

    @PostConstruct
    void ensureBucketExists() {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
        } catch (Exception e) {
            throw new FileStorageException("Impossible d'initialiser le bucket MinIO '%s'".formatted(bucket), e);
        }
    }

    @Override
    public void upload(String key, InputStream content, long size, String contentType) {
        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(key)
                    .stream(content, size, -1)
                    .contentType(contentType)
                    .build());
        } catch (Exception e) {
            throw new FileStorageException("Échec de l'upload du fichier '%s'".formatted(key), e);
        }
    }

    @Override
    public InputStream download(String key) {
        try {
            return minioClient.getObject(GetObjectArgs.builder()
                    .bucket(bucket)
                    .object(key)
                    .build());
        } catch (Exception e) {
            throw new FileStorageException("Échec de la lecture du fichier '%s'".formatted(key), e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucket)
                    .object(key)
                    .build());
        } catch (Exception e) {
            throw new FileStorageException("Échec de la suppression du fichier '%s'".formatted(key), e);
        }
    }
}
