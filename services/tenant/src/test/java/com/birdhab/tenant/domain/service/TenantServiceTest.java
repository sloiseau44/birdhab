package com.birdhab.tenant.domain.service;

import com.birdhab.tenant.domain.entity.Address;
import com.birdhab.tenant.domain.entity.Tenant;
import com.birdhab.tenant.domain.exception.TenantNotFoundException;
import com.birdhab.tenant.domain.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

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
class TenantServiceTest {

    private static final String FIRST_NAME = "Julie";
    private static final String LAST_NAME = "Martin";
    private static final String EMAIL = "julie.martin@example.com";
    private static final String PHONE = "0612345678";
    private static final Address ADDRESS = new Address("12 rue des Oliviers", "06000", "Nice");

    @Mock
    private TenantRepository tenantRepository;

    private TenantService tenantService;

    @BeforeEach
    void setUp() {
        tenantService = new TenantService(tenantRepository);
    }

    private Tenant tenantWithId(UUID id, UUID ownerId) {
        Tenant tenant = new Tenant(ownerId, FIRST_NAME, LAST_NAME, EMAIL, PHONE, ADDRESS);
        ReflectionTestUtils.setField(tenant, "id", id);
        return tenant;
    }

    // --- create ---

    @Test
    void create_nominal_savesTenantForOwner() {
        UUID ownerId = UUID.randomUUID();
        when(tenantRepository.save(any(Tenant.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Tenant result = tenantService.create(ownerId, FIRST_NAME, LAST_NAME, EMAIL, PHONE, ADDRESS);

        assertThat(result.getOwnerId()).isEqualTo(ownerId);
        assertThat(result.getFirstName()).isEqualTo(FIRST_NAME);
        assertThat(result.getLastName()).isEqualTo(LAST_NAME);
        assertThat(result.getEmail()).isEqualTo(EMAIL);
        assertThat(result.getPhone()).isEqualTo(PHONE);
        assertThat(result.getAddress()).isEqualTo(ADDRESS);
        verify(tenantRepository).save(any(Tenant.class));
    }

    @Test
    void create_withoutOptionalFields_savesTenant() {
        UUID ownerId = UUID.randomUUID();
        when(tenantRepository.save(any(Tenant.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Tenant result = tenantService.create(ownerId, FIRST_NAME, LAST_NAME, EMAIL, null, null);

        assertThat(result.getPhone()).isNull();
        assertThat(result.getAddress()).isNull();
    }

    // --- listForOwner ---

    @Test
    void listForOwner_returnsOnlyOwnerTenants() {
        UUID ownerId = UUID.randomUUID();
        List<Tenant> tenants = List.of(
                tenantWithId(UUID.randomUUID(), ownerId),
                tenantWithId(UUID.randomUUID(), ownerId));
        when(tenantRepository.findByOwnerId(ownerId)).thenReturn(tenants);

        List<Tenant> result = tenantService.listForOwner(ownerId);

        assertThat(result).hasSize(2);
    }

    // --- getForOwner ---

    @Test
    void getForOwner_found_returnsTenant() {
        UUID ownerId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        Tenant tenant = tenantWithId(tenantId, ownerId);
        when(tenantRepository.findByIdAndOwnerId(tenantId, ownerId)).thenReturn(Optional.of(tenant));

        Tenant result = tenantService.getForOwner(tenantId, ownerId);

        assertThat(result).isEqualTo(tenant);
    }

    @Test
    void getForOwner_notFound_throwsTenantNotFound() {
        UUID ownerId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        when(tenantRepository.findByIdAndOwnerId(tenantId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tenantService.getForOwner(tenantId, ownerId))
                .isInstanceOf(TenantNotFoundException.class);
    }

    // --- update ---

    @Test
    void update_nominal_updatesFieldsAndSaves() {
        UUID ownerId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        Tenant tenant = tenantWithId(tenantId, ownerId);
        Address newAddress = new Address("8 avenue de la Mer", "13001", "Marseille");

        when(tenantRepository.findByIdAndOwnerId(tenantId, ownerId)).thenReturn(Optional.of(tenant));
        when(tenantRepository.save(tenant)).thenReturn(tenant);

        Tenant result = tenantService.update(
                tenantId, ownerId, "Paul", "Durand", "paul.durand@example.com", "0698765432", newAddress);

        assertThat(result.getFirstName()).isEqualTo("Paul");
        assertThat(result.getLastName()).isEqualTo("Durand");
        assertThat(result.getEmail()).isEqualTo("paul.durand@example.com");
        assertThat(result.getPhone()).isEqualTo("0698765432");
        assertThat(result.getAddress()).isEqualTo(newAddress);
        verify(tenantRepository).save(tenant);
    }

    @Test
    void update_notFound_throwsTenantNotFoundAndDoesNotSave() {
        UUID ownerId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        when(tenantRepository.findByIdAndOwnerId(tenantId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tenantService.update(
                tenantId, ownerId, FIRST_NAME, LAST_NAME, EMAIL, PHONE, ADDRESS))
                .isInstanceOf(TenantNotFoundException.class);

        verify(tenantRepository, never()).save(any());
    }

    // --- delete ---

    @Test
    void delete_nominal_deletesTenant() {
        UUID ownerId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        Tenant tenant = tenantWithId(tenantId, ownerId);
        when(tenantRepository.findByIdAndOwnerId(tenantId, ownerId)).thenReturn(Optional.of(tenant));

        tenantService.delete(tenantId, ownerId);

        verify(tenantRepository).delete(tenant);
    }

    @Test
    void delete_notFound_throwsTenantNotFoundAndDoesNotDelete() {
        UUID ownerId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        when(tenantRepository.findByIdAndOwnerId(tenantId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tenantService.delete(tenantId, ownerId))
                .isInstanceOf(TenantNotFoundException.class);

        verify(tenantRepository, never()).delete(any());
    }
}
