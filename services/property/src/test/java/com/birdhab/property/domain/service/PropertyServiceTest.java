package com.birdhab.property.domain.service;

import com.birdhab.property.domain.entity.Address;
import com.birdhab.property.domain.entity.Property;
import com.birdhab.property.domain.entity.PropertyType;
import com.birdhab.property.domain.exception.PropertyNotFoundException;
import com.birdhab.property.domain.repository.PropertyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PropertyServiceTest {

    private static final Address ADDRESS = new Address("12 rue des Oliviers", "06000", "Nice");
    private static final BigDecimal SURFACE = BigDecimal.valueOf(45.5);
    private static final BigDecimal REFERENCE_RENT = BigDecimal.valueOf(850);

    @Mock
    private PropertyRepository propertyRepository;

    private PropertyService propertyService;

    @BeforeEach
    void setUp() {
        propertyService = new PropertyService(propertyRepository);
    }

    private Property propertyWithId(UUID id, UUID ownerId) {
        Property property = new Property(ownerId, ADDRESS, PropertyType.LOGEMENT, SURFACE, REFERENCE_RENT);
        ReflectionTestUtils.setField(property, "id", id);
        return property;
    }

    // --- create ---

    @Test
    void create_nominal_savesPropertyForOwner() {
        UUID ownerId = UUID.randomUUID();
        when(propertyRepository.save(any(Property.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Property result = propertyService.create(ownerId, ADDRESS, PropertyType.PARKING, SURFACE, REFERENCE_RENT);

        assertThat(result.getOwnerId()).isEqualTo(ownerId);
        assertThat(result.getType()).isEqualTo(PropertyType.PARKING);
        assertThat(result.getSurface()).isEqualTo(SURFACE);
        assertThat(result.getReferenceRent()).isEqualTo(REFERENCE_RENT);
        verify(propertyRepository).save(any(Property.class));
    }

    // --- listForOwner ---

    @Test
    void listForOwner_returnsOnlyOwnerProperties() {
        UUID ownerId = UUID.randomUUID();
        List<Property> properties = List.of(
                propertyWithId(UUID.randomUUID(), ownerId),
                propertyWithId(UUID.randomUUID(), ownerId));
        when(propertyRepository.findByOwnerId(ownerId)).thenReturn(properties);

        List<Property> result = propertyService.listForOwner(ownerId);

        assertThat(result).hasSize(2);
    }

    // --- getForOwner ---

    @Test
    void getForOwner_found_returnsProperty() {
        UUID ownerId = UUID.randomUUID();
        UUID propertyId = UUID.randomUUID();
        Property property = propertyWithId(propertyId, ownerId);
        when(propertyRepository.findByIdAndOwnerId(propertyId, ownerId)).thenReturn(Optional.of(property));

        Property result = propertyService.getForOwner(propertyId, ownerId);

        assertThat(result).isEqualTo(property);
    }

    @Test
    void getForOwner_notFound_throwsPropertyNotFound() {
        UUID ownerId = UUID.randomUUID();
        UUID propertyId = UUID.randomUUID();
        when(propertyRepository.findByIdAndOwnerId(propertyId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> propertyService.getForOwner(propertyId, ownerId))
                .isInstanceOf(PropertyNotFoundException.class);
    }

    // --- update ---

    @Test
    void update_nominal_updatesFieldsAndSaves() {
        UUID ownerId = UUID.randomUUID();
        UUID propertyId = UUID.randomUUID();
        Property property = propertyWithId(propertyId, ownerId);
        Address newAddress = new Address("8 avenue de la Mer", "13001", "Marseille");
        BigDecimal newSurface = BigDecimal.valueOf(60);
        BigDecimal newRent = BigDecimal.valueOf(1200);

        when(propertyRepository.findByIdAndOwnerId(propertyId, ownerId)).thenReturn(Optional.of(property));
        when(propertyRepository.save(property)).thenReturn(property);

        Property result = propertyService.update(propertyId, ownerId, newAddress, PropertyType.COMMERCE, newSurface, newRent);

        assertThat(result.getAddress()).isEqualTo(newAddress);
        assertThat(result.getType()).isEqualTo(PropertyType.COMMERCE);
        assertThat(result.getSurface()).isEqualTo(newSurface);
        assertThat(result.getReferenceRent()).isEqualTo(newRent);
        verify(propertyRepository).save(property);
    }

    @Test
    void update_notFound_throwsPropertyNotFoundAndDoesNotSave() {
        UUID ownerId = UUID.randomUUID();
        UUID propertyId = UUID.randomUUID();
        when(propertyRepository.findByIdAndOwnerId(propertyId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> propertyService.update(
                propertyId, ownerId, ADDRESS, PropertyType.LOGEMENT, SURFACE, REFERENCE_RENT))
                .isInstanceOf(PropertyNotFoundException.class);

        verify(propertyRepository, never()).save(any());
    }

    // --- delete ---

    @Test
    void delete_nominal_deletesProperty() {
        UUID ownerId = UUID.randomUUID();
        UUID propertyId = UUID.randomUUID();
        Property property = propertyWithId(propertyId, ownerId);
        when(propertyRepository.findByIdAndOwnerId(propertyId, ownerId)).thenReturn(Optional.of(property));

        propertyService.delete(propertyId, ownerId);

        verify(propertyRepository).delete(property);
    }

    @Test
    void delete_notFound_throwsPropertyNotFoundAndDoesNotDelete() {
        UUID ownerId = UUID.randomUUID();
        UUID propertyId = UUID.randomUUID();
        when(propertyRepository.findByIdAndOwnerId(propertyId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> propertyService.delete(propertyId, ownerId))
                .isInstanceOf(PropertyNotFoundException.class);

        verify(propertyRepository, never()).delete(any());
    }
}
