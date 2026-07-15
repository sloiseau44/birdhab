package com.birdhab.document.api;

import com.birdhab.document.api.dto.DocumentResponse;
import com.birdhab.document.domain.entity.Document;
import com.birdhab.document.domain.model.DocumentContent;
import com.birdhab.document.domain.service.DocumentService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;

/**
 * Endpoints de gestion des documents, conformes à {@code docs/api/document.yml}.
 */
@RestController
@RequestMapping("/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse upload(@RequestParam("tenantId") UUID tenantId,
                                    @RequestParam("file") MultipartFile file,
                                    Authentication authentication) {
        try (var content = file.getInputStream()) {
            Document document = documentService.upload(
                    currentOwnerId(authentication), tenantId, file.getOriginalFilename(),
                    file.getContentType(), content);
            return toResponse(document);
        } catch (IOException e) {
            throw new UncheckedIOException("Échec de la lecture du fichier envoyé", e);
        }
    }

    @GetMapping
    public List<DocumentResponse> list(@RequestParam(value = "tenantId", required = false) UUID tenantId,
                                        Authentication authentication) {
        return documentService.listForOwner(currentOwnerId(authentication), tenantId).stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public DocumentResponse get(@PathVariable("id") UUID id, Authentication authentication) {
        Document document = documentService.getForOwner(id, currentOwnerId(authentication));
        return toResponse(document);
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<InputStreamResource> downloadContent(@PathVariable("id") UUID id,
                                                                 Authentication authentication) {
        DocumentContent documentContent = documentService.downloadContent(id, currentOwnerId(authentication));
        Document document = documentContent.document();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.getContentType()))
                .contentLength(document.getSizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(document.getFileName())
                        .build().toString())
                .body(new InputStreamResource(documentContent.content()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("id") UUID id, Authentication authentication) {
        documentService.delete(id, currentOwnerId(authentication));
    }

    private UUID currentOwnerId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    private DocumentResponse toResponse(Document document) {
        return new DocumentResponse(
                document.getId(),
                document.getOwnerId(),
                document.getTenantId(),
                document.getFileName(),
                document.getContentType(),
                document.getSizeBytes(),
                document.getCreatedAt());
    }
}
