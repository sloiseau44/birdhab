package com.birdhab.document.domain.service;

import com.birdhab.document.domain.entity.Document;
import com.birdhab.document.domain.exception.DocumentNotFoundException;
import com.birdhab.document.domain.exception.FileTooLargeException;
import com.birdhab.document.domain.exception.UnsupportedFileTypeException;
import com.birdhab.document.domain.model.DocumentContent;
import com.birdhab.document.domain.repository.DocumentRepository;
import com.birdhab.document.domain.storage.FileStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    private static final String FILE_NAME = "carte-identite.pdf";
    private static final String CONTENT_TYPE = "application/pdf";
    private static final long SIZE_BYTES = 1024;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private FileStorage fileStorage;

    private DocumentService documentService;

    @BeforeEach
    void setUp() {
        documentService = new DocumentService(documentRepository, fileStorage);
    }

    private InputStream content() {
        return new ByteArrayInputStream(new byte[]{1, 2, 3});
    }

    private Document documentWithId(UUID id, UUID ownerId, UUID tenantId) {
        Document document = new Document(ownerId, tenantId, FILE_NAME, CONTENT_TYPE, SIZE_BYTES, UUID.randomUUID().toString());
        ReflectionTestUtils.setField(document, "id", id);
        return document;
    }

    // --- upload ---

    @Test
    void upload_nominal_uploadsToStorageAndSavesDocument() {
        UUID ownerId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Document result = documentService.upload(ownerId, tenantId, FILE_NAME, CONTENT_TYPE, SIZE_BYTES, content());

        assertThat(result.getOwnerId()).isEqualTo(ownerId);
        assertThat(result.getTenantId()).isEqualTo(tenantId);
        assertThat(result.getFileName()).isEqualTo(FILE_NAME);
        assertThat(result.getContentType()).isEqualTo(CONTENT_TYPE);
        assertThat(result.getSizeBytes()).isEqualTo(SIZE_BYTES);
        assertThat(result.getStorageKey()).isNotBlank();
        verify(fileStorage).upload(eq(result.getStorageKey()), any(InputStream.class), eq(SIZE_BYTES), eq(CONTENT_TYPE));
        verify(documentRepository).save(any(Document.class));
    }

    @Test
    void upload_unsupportedContentType_throwsUnsupportedFileTypeAndDoesNotUploadOrSave() {
        assertThatThrownBy(() -> documentService.upload(
                UUID.randomUUID(), UUID.randomUUID(), "archive.zip", "application/zip", SIZE_BYTES, content()))
                .isInstanceOf(UnsupportedFileTypeException.class);

        verify(fileStorage, never()).upload(anyString(), any(), anyLong(), anyString());
        verify(documentRepository, never()).save(any());
    }

    @Test
    void upload_fileTooLarge_throwsFileTooLargeAndDoesNotUploadOrSave() {
        long tooLarge = 11L * 1024 * 1024;

        assertThatThrownBy(() -> documentService.upload(
                UUID.randomUUID(), UUID.randomUUID(), FILE_NAME, CONTENT_TYPE, tooLarge, content()))
                .isInstanceOf(FileTooLargeException.class);

        verify(fileStorage, never()).upload(anyString(), any(), anyLong(), anyString());
        verify(documentRepository, never()).save(any());
    }

    // --- listForOwner ---

    @Test
    void listForOwner_withoutTenantFilter_returnsAllOwnerDocuments() {
        UUID ownerId = UUID.randomUUID();
        List<Document> documents = List.of(
                documentWithId(UUID.randomUUID(), ownerId, UUID.randomUUID()),
                documentWithId(UUID.randomUUID(), ownerId, UUID.randomUUID()));
        when(documentRepository.findByOwnerId(ownerId)).thenReturn(documents);

        List<Document> result = documentService.listForOwner(ownerId, null);

        assertThat(result).hasSize(2);
    }

    @Test
    void listForOwner_withTenantFilter_returnsOnlyThatTenantDocuments() {
        UUID ownerId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        List<Document> documents = List.of(documentWithId(UUID.randomUUID(), ownerId, tenantId));
        when(documentRepository.findByOwnerIdAndTenantId(ownerId, tenantId)).thenReturn(documents);

        List<Document> result = documentService.listForOwner(ownerId, tenantId);

        assertThat(result).hasSize(1);
    }

    // --- getForOwner ---

    @Test
    void getForOwner_found_returnsDocument() {
        UUID ownerId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        Document document = documentWithId(documentId, ownerId, UUID.randomUUID());
        when(documentRepository.findByIdAndOwnerId(documentId, ownerId)).thenReturn(Optional.of(document));

        Document result = documentService.getForOwner(documentId, ownerId);

        assertThat(result).isEqualTo(document);
    }

    @Test
    void getForOwner_notFound_throwsDocumentNotFound() {
        UUID ownerId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        when(documentRepository.findByIdAndOwnerId(documentId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> documentService.getForOwner(documentId, ownerId))
                .isInstanceOf(DocumentNotFoundException.class);
    }

    // --- downloadContent ---

    @Test
    void downloadContent_found_returnsDocumentAndStream() {
        UUID ownerId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        Document document = documentWithId(documentId, ownerId, UUID.randomUUID());
        InputStream stream = content();
        when(documentRepository.findByIdAndOwnerId(documentId, ownerId)).thenReturn(Optional.of(document));
        when(fileStorage.download(document.getStorageKey())).thenReturn(stream);

        DocumentContent result = documentService.downloadContent(documentId, ownerId);

        assertThat(result.document()).isEqualTo(document);
        assertThat(result.content()).isEqualTo(stream);
    }

    @Test
    void downloadContent_notFound_throwsDocumentNotFound() {
        UUID ownerId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        when(documentRepository.findByIdAndOwnerId(documentId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> documentService.downloadContent(documentId, ownerId))
                .isInstanceOf(DocumentNotFoundException.class);

        verify(fileStorage, never()).download(any());
    }

    // --- delete ---

    @Test
    void delete_nominal_deletesFromStorageAndRepository() {
        UUID ownerId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        Document document = documentWithId(documentId, ownerId, UUID.randomUUID());
        when(documentRepository.findByIdAndOwnerId(documentId, ownerId)).thenReturn(Optional.of(document));

        documentService.delete(documentId, ownerId);

        verify(fileStorage).delete(document.getStorageKey());
        verify(documentRepository).delete(document);
    }

    @Test
    void delete_notFound_throwsDocumentNotFoundAndDoesNotDeleteAnything() {
        UUID ownerId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        when(documentRepository.findByIdAndOwnerId(documentId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> documentService.delete(documentId, ownerId))
                .isInstanceOf(DocumentNotFoundException.class);

        verify(fileStorage, never()).delete(any());
        verify(documentRepository, never()).delete(any());
    }
}
