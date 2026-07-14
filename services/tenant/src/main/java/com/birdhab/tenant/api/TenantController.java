package com.birdhab.tenant.api;

import com.birdhab.tenant.api.dto.AddressDto;
import com.birdhab.tenant.api.dto.TenantRequest;
import com.birdhab.tenant.api.dto.TenantResponse;
import com.birdhab.tenant.domain.entity.Address;
import com.birdhab.tenant.domain.entity.Tenant;
import com.birdhab.tenant.domain.service.TenantService;
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
 * Endpoints de gestion des locataires, conformes à {@code docs/api/tenant.yml}.
 */
@RestController
@RequestMapping("/tenants")
public class TenantController {

    private final TenantService tenantService;

    public TenantController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TenantResponse create(@Valid @RequestBody TenantRequest request, Authentication authentication) {
        Tenant tenant = tenantService.create(
                currentOwnerId(authentication), request.firstName(), request.lastName(), request.email(),
                request.phone(), toAddress(request.address()));
        return toResponse(tenant);
    }

    @GetMapping
    public List<TenantResponse> list(Authentication authentication) {
        return tenantService.listForOwner(currentOwnerId(authentication)).stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public TenantResponse get(@PathVariable("id") UUID id, Authentication authentication) {
        Tenant tenant = tenantService.getForOwner(id, currentOwnerId(authentication));
        return toResponse(tenant);
    }

    @PutMapping("/{id}")
    public TenantResponse update(@PathVariable("id") UUID id, @Valid @RequestBody TenantRequest request,
                                  Authentication authentication) {
        Tenant tenant = tenantService.update(
                id, currentOwnerId(authentication), request.firstName(), request.lastName(), request.email(),
                request.phone(), toAddress(request.address()));
        return toResponse(tenant);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("id") UUID id, Authentication authentication) {
        tenantService.delete(id, currentOwnerId(authentication));
    }

    private UUID currentOwnerId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    private Address toAddress(AddressDto dto) {
        return dto == null ? null : new Address(dto.street(), dto.postalCode(), dto.city());
    }

    private AddressDto toAddressDto(Address address) {
        return address == null ? null : new AddressDto(address.getStreet(), address.getPostalCode(), address.getCity());
    }

    private TenantResponse toResponse(Tenant tenant) {
        return new TenantResponse(
                tenant.getId(),
                tenant.getOwnerId(),
                tenant.getFirstName(),
                tenant.getLastName(),
                tenant.getEmail(),
                tenant.getPhone(),
                toAddressDto(tenant.getAddress()),
                tenant.getCreatedAt(),
                tenant.getUpdatedAt());
    }
}
