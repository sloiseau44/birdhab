package com.birdhab.property.api;

import com.birdhab.property.api.dto.AddressDto;
import com.birdhab.property.api.dto.PropertyRequest;
import com.birdhab.property.api.dto.PropertyResponse;
import com.birdhab.property.domain.entity.Address;
import com.birdhab.property.domain.entity.Property;
import com.birdhab.property.domain.service.PropertyService;
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
 * Endpoints de gestion des biens, conformes à {@code docs/api/property.yml}.
 */
@RestController
@RequestMapping("/properties")
public class PropertyController {

    private final PropertyService propertyService;

    public PropertyController(PropertyService propertyService) {
        this.propertyService = propertyService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PropertyResponse create(@Valid @RequestBody PropertyRequest request, Authentication authentication) {
        Property property = propertyService.create(
                currentOwnerId(authentication), toAddress(request.address()), request.type(),
                request.surface(), request.referenceRent());
        return toResponse(property);
    }

    @GetMapping
    public List<PropertyResponse> list(Authentication authentication) {
        return propertyService.listForOwner(currentOwnerId(authentication)).stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public PropertyResponse get(@PathVariable("id") UUID id, Authentication authentication) {
        Property property = propertyService.getForOwner(id, currentOwnerId(authentication));
        return toResponse(property);
    }

    @PutMapping("/{id}")
    public PropertyResponse update(@PathVariable("id") UUID id, @Valid @RequestBody PropertyRequest request,
                                    Authentication authentication) {
        Property property = propertyService.update(
                id, currentOwnerId(authentication), toAddress(request.address()), request.type(),
                request.surface(), request.referenceRent());
        return toResponse(property);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("id") UUID id, Authentication authentication) {
        propertyService.delete(id, currentOwnerId(authentication));
    }

    private UUID currentOwnerId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    private Address toAddress(AddressDto dto) {
        return new Address(dto.street(), dto.postalCode(), dto.city());
    }

    private AddressDto toAddressDto(Address address) {
        return new AddressDto(address.getStreet(), address.getPostalCode(), address.getCity());
    }

    private PropertyResponse toResponse(Property property) {
        return new PropertyResponse(
                property.getId(),
                property.getOwnerId(),
                toAddressDto(property.getAddress()),
                property.getType(),
                property.getSurface(),
                property.getReferenceRent(),
                property.getCreatedAt(),
                property.getUpdatedAt());
    }
}
