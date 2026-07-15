package com.birdhab.lease.domain.service;

import com.birdhab.lease.domain.entity.Lease;
import com.birdhab.lease.domain.entity.LeaseStatus;
import com.birdhab.lease.domain.exception.InvalidLeaseDatesException;
import com.birdhab.lease.domain.exception.LeaseNotFoundException;
import com.birdhab.lease.domain.repository.LeaseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
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
class LeaseServiceTest {

    private static final LocalDate START_DATE = LocalDate.of(2026, 9, 1);
    private static final LocalDate END_DATE = LocalDate.of(2029, 8, 31);
    private static final BigDecimal RENT_AMOUNT = BigDecimal.valueOf(850);
    private static final BigDecimal DEPOSIT_AMOUNT = BigDecimal.valueOf(850);
    private static final String IRL_QUARTER = "2026-T1";

    @Mock
    private LeaseRepository leaseRepository;

    private LeaseService leaseService;

    @BeforeEach
    void setUp() {
        leaseService = new LeaseService(leaseRepository);
    }

    private Lease leaseWithId(UUID id, UUID ownerId, UUID propertyId, UUID tenantId) {
        Lease lease = new Lease(ownerId, propertyId, tenantId, START_DATE, END_DATE,
                RENT_AMOUNT, DEPOSIT_AMOUNT, IRL_QUARTER);
        ReflectionTestUtils.setField(lease, "id", id);
        return lease;
    }

    // --- create ---

    @Test
    void create_nominal_savesLeaseForOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID propertyId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        when(leaseRepository.save(any(Lease.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Lease result = leaseService.create(ownerId, propertyId, tenantId, START_DATE, END_DATE,
                RENT_AMOUNT, DEPOSIT_AMOUNT, IRL_QUARTER);

        assertThat(result.getOwnerId()).isEqualTo(ownerId);
        assertThat(result.getPropertyId()).isEqualTo(propertyId);
        assertThat(result.getTenantId()).isEqualTo(tenantId);
        assertThat(result.getRentAmount()).isEqualTo(RENT_AMOUNT);
        assertThat(result.getDepositAmount()).isEqualTo(DEPOSIT_AMOUNT);
        assertThat(result.getIrlReferenceQuarter()).isEqualTo(IRL_QUARTER);
        verify(leaseRepository).save(any(Lease.class));
    }

    @Test
    void create_withoutEndDate_savesLeaseWithNullEndDate() {
        UUID ownerId = UUID.randomUUID();
        when(leaseRepository.save(any(Lease.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Lease result = leaseService.create(ownerId, UUID.randomUUID(), UUID.randomUUID(), START_DATE, null,
                RENT_AMOUNT, DEPOSIT_AMOUNT, null);

        assertThat(result.getEndDate()).isNull();
        assertThat(result.getStatus()).isEqualTo(LeaseStatus.ACTIVE);
    }

    @Test
    void create_endDateNotAfterStartDate_throwsInvalidLeaseDatesAndDoesNotSave() {
        UUID ownerId = UUID.randomUUID();

        assertThatThrownBy(() -> leaseService.create(ownerId, UUID.randomUUID(), UUID.randomUUID(),
                START_DATE, START_DATE, RENT_AMOUNT, DEPOSIT_AMOUNT, IRL_QUARTER))
                .isInstanceOf(InvalidLeaseDatesException.class);

        verify(leaseRepository, never()).save(any());
    }

    // --- listForOwner ---

    @Test
    void listForOwner_returnsOnlyOwnerLeases() {
        UUID ownerId = UUID.randomUUID();
        List<Lease> leases = List.of(
                leaseWithId(UUID.randomUUID(), ownerId, UUID.randomUUID(), UUID.randomUUID()),
                leaseWithId(UUID.randomUUID(), ownerId, UUID.randomUUID(), UUID.randomUUID()));
        when(leaseRepository.findByOwnerId(ownerId)).thenReturn(leases);

        List<Lease> result = leaseService.listForOwner(ownerId);

        assertThat(result).hasSize(2);
    }

    // --- getForOwner ---

    @Test
    void getForOwner_found_returnsLease() {
        UUID ownerId = UUID.randomUUID();
        UUID leaseId = UUID.randomUUID();
        Lease lease = leaseWithId(leaseId, ownerId, UUID.randomUUID(), UUID.randomUUID());
        when(leaseRepository.findByIdAndOwnerId(leaseId, ownerId)).thenReturn(Optional.of(lease));

        Lease result = leaseService.getForOwner(leaseId, ownerId);

        assertThat(result).isEqualTo(lease);
    }

    @Test
    void getForOwner_notFound_throwsLeaseNotFound() {
        UUID ownerId = UUID.randomUUID();
        UUID leaseId = UUID.randomUUID();
        when(leaseRepository.findByIdAndOwnerId(leaseId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> leaseService.getForOwner(leaseId, ownerId))
                .isInstanceOf(LeaseNotFoundException.class);
    }

    // --- update ---

    @Test
    void update_nominal_updatesFieldsAndSaves() {
        UUID ownerId = UUID.randomUUID();
        UUID leaseId = UUID.randomUUID();
        Lease lease = leaseWithId(leaseId, ownerId, UUID.randomUUID(), UUID.randomUUID());
        UUID newPropertyId = UUID.randomUUID();
        UUID newTenantId = UUID.randomUUID();
        LocalDate newStartDate = LocalDate.of(2027, 1, 1);
        LocalDate newEndDate = LocalDate.of(2030, 1, 1);
        BigDecimal newRent = BigDecimal.valueOf(1200);
        BigDecimal newDeposit = BigDecimal.valueOf(1200);

        when(leaseRepository.findByIdAndOwnerId(leaseId, ownerId)).thenReturn(Optional.of(lease));
        when(leaseRepository.save(lease)).thenReturn(lease);

        Lease result = leaseService.update(leaseId, ownerId, newPropertyId, newTenantId,
                newStartDate, newEndDate, newRent, newDeposit, "2027-T2");

        assertThat(result.getPropertyId()).isEqualTo(newPropertyId);
        assertThat(result.getTenantId()).isEqualTo(newTenantId);
        assertThat(result.getStartDate()).isEqualTo(newStartDate);
        assertThat(result.getEndDate()).isEqualTo(newEndDate);
        assertThat(result.getRentAmount()).isEqualTo(newRent);
        assertThat(result.getDepositAmount()).isEqualTo(newDeposit);
        assertThat(result.getIrlReferenceQuarter()).isEqualTo("2027-T2");
        verify(leaseRepository).save(lease);
    }

    @Test
    void update_endDateNotAfterStartDate_throwsInvalidLeaseDatesAndDoesNotSave() {
        UUID ownerId = UUID.randomUUID();
        UUID leaseId = UUID.randomUUID();

        assertThatThrownBy(() -> leaseService.update(leaseId, ownerId, UUID.randomUUID(), UUID.randomUUID(),
                START_DATE, START_DATE.minusDays(1), RENT_AMOUNT, DEPOSIT_AMOUNT, IRL_QUARTER))
                .isInstanceOf(InvalidLeaseDatesException.class);

        verify(leaseRepository, never()).findByIdAndOwnerId(any(), any());
        verify(leaseRepository, never()).save(any());
    }

    @Test
    void update_notFound_throwsLeaseNotFoundAndDoesNotSave() {
        UUID ownerId = UUID.randomUUID();
        UUID leaseId = UUID.randomUUID();
        when(leaseRepository.findByIdAndOwnerId(leaseId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> leaseService.update(leaseId, ownerId, UUID.randomUUID(), UUID.randomUUID(),
                START_DATE, END_DATE, RENT_AMOUNT, DEPOSIT_AMOUNT, IRL_QUARTER))
                .isInstanceOf(LeaseNotFoundException.class);

        verify(leaseRepository, never()).save(any());
    }

    // --- delete ---

    @Test
    void delete_nominal_deletesLease() {
        UUID ownerId = UUID.randomUUID();
        UUID leaseId = UUID.randomUUID();
        Lease lease = leaseWithId(leaseId, ownerId, UUID.randomUUID(), UUID.randomUUID());
        when(leaseRepository.findByIdAndOwnerId(leaseId, ownerId)).thenReturn(Optional.of(lease));

        leaseService.delete(leaseId, ownerId);

        verify(leaseRepository).delete(lease);
    }

    @Test
    void delete_notFound_throwsLeaseNotFoundAndDoesNotDelete() {
        UUID ownerId = UUID.randomUUID();
        UUID leaseId = UUID.randomUUID();
        when(leaseRepository.findByIdAndOwnerId(leaseId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> leaseService.delete(leaseId, ownerId))
                .isInstanceOf(LeaseNotFoundException.class);

        verify(leaseRepository, never()).delete(any());
    }

    // --- status dérivé ---

    @Test
    void getStatus_futureEndDate_returnsActive() {
        Lease lease = new Lease(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.now().minusYears(1), LocalDate.now().plusYears(1),
                RENT_AMOUNT, DEPOSIT_AMOUNT, IRL_QUARTER);

        assertThat(lease.getStatus()).isEqualTo(LeaseStatus.ACTIVE);
    }

    @Test
    void getStatus_pastEndDate_returnsTerminated() {
        Lease lease = new Lease(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.now().minusYears(3), LocalDate.now().minusYears(1),
                RENT_AMOUNT, DEPOSIT_AMOUNT, IRL_QUARTER);

        assertThat(lease.getStatus()).isEqualTo(LeaseStatus.TERMINATED);
    }

    @Test
    void getStatus_noEndDate_returnsActive() {
        Lease lease = new Lease(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.now().minusYears(1), null,
                RENT_AMOUNT, DEPOSIT_AMOUNT, IRL_QUARTER);

        assertThat(lease.getStatus()).isEqualTo(LeaseStatus.ACTIVE);
    }
}
