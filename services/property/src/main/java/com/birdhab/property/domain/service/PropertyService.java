package com.birdhab.property.domain.service;

import com.birdhab.property.domain.entity.Address;
import com.birdhab.property.domain.entity.Property;
import com.birdhab.property.domain.entity.PropertyType;
import com.birdhab.property.domain.exception.PropertyNotFoundException;
import com.birdhab.property.domain.repository.PropertyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Logique métier de la gestion des biens : création, consultation, modification
 * et suppression, toujours scopées au propriétaire authentifié.
 */
@Service
@Transactional
public class PropertyService {

    private final PropertyRepository propertyRepository;

    public PropertyService(PropertyRepository propertyRepository) {
        this.propertyRepository = propertyRepository;
    }

    public Property create(UUID ownerId, Address address, PropertyType type,
                            BigDecimal surface, BigDecimal referenceRent) {
        Property property = new Property(ownerId, address, type, surface, referenceRent);
        return propertyRepository.save(property);
    }

    @Transactional(readOnly = true)
    public List<Property> listForOwner(UUID ownerId) {
        return propertyRepository.findByOwnerId(ownerId);
    }

    /**
     * @throws PropertyNotFoundException si le bien n'existe pas ou n'appartient pas à {@code ownerId}
     */
    @Transactional(readOnly = true)
    public Property getForOwner(UUID id, UUID ownerId) {
        return propertyRepository.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(PropertyNotFoundException::new);
    }

    /**
     * @throws PropertyNotFoundException si le bien n'existe pas ou n'appartient pas à {@code ownerId}
     */
    public Property update(UUID id, UUID ownerId, Address address, PropertyType type,
                           BigDecimal surface, BigDecimal referenceRent) {
        Property property = getForOwner(id, ownerId);
        property.setAddress(address);
        property.setType(type);
        property.setSurface(surface);
        property.setReferenceRent(referenceRent);
        return propertyRepository.save(property);
    }

    /**
     * @throws PropertyNotFoundException si le bien n'existe pas ou n'appartient pas à {@code ownerId}
     */
    public void delete(UUID id, UUID ownerId) {
        Property property = getForOwner(id, ownerId);
        propertyRepository.delete(property);
    }
}
