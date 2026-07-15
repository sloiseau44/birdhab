package com.birdhab.payment.api;

import com.birdhab.payment.api.dto.AddressDto;
import com.birdhab.payment.api.dto.PaymentRequest;
import com.birdhab.payment.api.dto.PaymentResponse;
import com.birdhab.payment.api.dto.ReceiptRequest;
import com.birdhab.payment.domain.entity.Payment;
import com.birdhab.payment.domain.model.Address;
import com.birdhab.payment.domain.service.PaymentService;
import com.birdhab.payment.infrastructure.pdf.ReceiptPdfGenerator;
import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;

/**
 * Endpoints de suivi des paiements, conformes à {@code docs/api/payment.yml}.
 */
@RestController
@RequestMapping("/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final ReceiptPdfGenerator receiptPdfGenerator;

    public PaymentController(PaymentService paymentService, ReceiptPdfGenerator receiptPdfGenerator) {
        this.paymentService = paymentService;
        this.receiptPdfGenerator = receiptPdfGenerator;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse create(@Valid @RequestBody PaymentRequest request, Authentication authentication) {
        Payment payment = paymentService.create(
                currentOwnerId(authentication), request.leaseId(), request.dueDate(), request.amount(),
                request.paidDate(), request.paidAmount());
        return toResponse(payment);
    }

    @GetMapping
    public List<PaymentResponse> list(Authentication authentication) {
        return paymentService.listForOwner(currentOwnerId(authentication)).stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public PaymentResponse get(@PathVariable("id") UUID id, Authentication authentication) {
        Payment payment = paymentService.getForOwner(id, currentOwnerId(authentication));
        return toResponse(payment);
    }

    @PutMapping("/{id}")
    public PaymentResponse update(@PathVariable("id") UUID id, @Valid @RequestBody PaymentRequest request,
                                   Authentication authentication) {
        Payment payment = paymentService.update(
                id, currentOwnerId(authentication), request.leaseId(), request.dueDate(), request.amount(),
                request.paidDate(), request.paidAmount());
        return toResponse(payment);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("id") UUID id, Authentication authentication) {
        paymentService.delete(id, currentOwnerId(authentication));
    }

    @PostMapping("/{id}/receipt")
    public ResponseEntity<ByteArrayResource> generateReceipt(@PathVariable("id") UUID id,
                                                               @Valid @RequestBody ReceiptRequest request,
                                                               Authentication authentication) {
        Payment payment = paymentService.getPaidForOwner(id, currentOwnerId(authentication));
        byte[] pdf = generatePdf(payment, request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("quittance-%s.pdf".formatted(payment.getDueDate()))
                        .build().toString())
                .body(new ByteArrayResource(pdf));
    }

    private byte[] generatePdf(Payment payment, ReceiptRequest request) {
        try {
            return receiptPdfGenerator.generate(payment, request.ownerFullName(), toAddress(request.ownerAddress()),
                    request.tenantFullName(), toAddress(request.propertyAddress()));
        } catch (IOException e) {
            throw new UncheckedIOException("Échec de la génération de la quittance PDF", e);
        }
    }

    private Address toAddress(AddressDto dto) {
        return new Address(dto.street(), dto.postalCode(), dto.city());
    }

    private UUID currentOwnerId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    private PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getOwnerId(),
                payment.getLeaseId(),
                payment.getDueDate(),
                payment.getAmount(),
                payment.getPaidDate(),
                payment.getPaidAmount(),
                payment.getStatus(),
                payment.getCreatedAt(),
                payment.getUpdatedAt());
    }
}
