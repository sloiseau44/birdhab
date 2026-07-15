package com.birdhab.lease.api;

import com.birdhab.lease.api.dto.LeaseRequest;
import com.birdhab.lease.api.dto.LeaseResponse;
import com.birdhab.lease.domain.entity.Lease;
import com.birdhab.lease.domain.service.LeaseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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

import java.util.List;
import java.util.UUID;

/**
 * Endpoints de gestion des baux, conformes à {@code docs/api/lease.yml}.
 */
@RestController
@RequestMapping("/leases")
public class LeaseController {

    private final LeaseService leaseService;

    public LeaseController(LeaseService leaseService) {
        this.leaseService = leaseService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LeaseResponse create(@Valid @RequestBody LeaseRequest request, Authentication authentication) {
        Lease lease = leaseService.create(
                currentOwnerId(authentication), request.propertyId(), request.tenantId(),
                request.startDate(), request.endDate(), request.rentAmount(), request.depositAmount(),
                request.irlReferenceQuarter());
        return toResponse(lease);
    }

    @GetMapping
    public List<LeaseResponse> list(Authentication authentication) {
        return leaseService.listForOwner(currentOwnerId(authentication)).stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public LeaseResponse get(@PathVariable("id") UUID id, Authentication authentication) {
        Lease lease = leaseService.getForOwner(id, currentOwnerId(authentication));
        return toResponse(lease);
    }

    @PutMapping("/{id}")
    public LeaseResponse update(@PathVariable("id") UUID id, @Valid @RequestBody LeaseRequest request,
                                 Authentication authentication) {
        Lease lease = leaseService.update(
                id, currentOwnerId(authentication), request.propertyId(), request.tenantId(),
                request.startDate(), request.endDate(), request.rentAmount(), request.depositAmount(),
                request.irlReferenceQuarter());
        return toResponse(lease);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("id") UUID id, Authentication authentication) {
        leaseService.delete(id, currentOwnerId(authentication));
    }

    private UUID currentOwnerId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    private LeaseResponse toResponse(Lease lease) {
        return new LeaseResponse(
                lease.getId(),
                lease.getOwnerId(),
                lease.getPropertyId(),
                lease.getTenantId(),
                lease.getStartDate(),
                lease.getEndDate(),
                lease.getRentAmount(),
                lease.getDepositAmount(),
                lease.getIrlReferenceQuarter(),
                lease.getStatus(),
                lease.getCreatedAt(),
                lease.getUpdatedAt());
    }
}
