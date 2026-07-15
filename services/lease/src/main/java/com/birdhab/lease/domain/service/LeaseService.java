package com.birdhab.lease.domain.service;

import com.birdhab.lease.domain.entity.Lease;
import com.birdhab.lease.domain.exception.InvalidLeaseDatesException;
import com.birdhab.lease.domain.exception.LeaseNotFoundException;
import com.birdhab.lease.domain.repository.LeaseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Logique métier de la gestion des baux : création, consultation, modification
 * et suppression, toujours scopées au propriétaire authentifié.
 */
@Service
@Transactional
public class LeaseService {

    private final LeaseRepository leaseRepository;

    public LeaseService(LeaseRepository leaseRepository) {
        this.leaseRepository = leaseRepository;
    }

    public Lease create(UUID ownerId, UUID propertyId, UUID tenantId, LocalDate startDate, LocalDate endDate,
                         BigDecimal rentAmount, BigDecimal depositAmount, String irlReferenceQuarter) {
        validateDates(startDate, endDate);
        Lease lease = new Lease(ownerId, propertyId, tenantId, startDate, endDate,
                rentAmount, depositAmount, irlReferenceQuarter);
        return leaseRepository.save(lease);
    }

    @Transactional(readOnly = true)
    public List<Lease> listForOwner(UUID ownerId) {
        return leaseRepository.findByOwnerId(ownerId);
    }

    /**
     * @throws LeaseNotFoundException si le bail n'existe pas ou n'appartient pas à {@code ownerId}
     */
    @Transactional(readOnly = true)
    public Lease getForOwner(UUID id, UUID ownerId) {
        return leaseRepository.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(LeaseNotFoundException::new);
    }

    /**
     * @throws LeaseNotFoundException si le bail n'existe pas ou n'appartient pas à {@code ownerId}
     * @throws InvalidLeaseDatesException si {@code endDate} n'est pas postérieure à {@code startDate}
     */
    public Lease update(UUID id, UUID ownerId, UUID propertyId, UUID tenantId, LocalDate startDate, LocalDate endDate,
                         BigDecimal rentAmount, BigDecimal depositAmount, String irlReferenceQuarter) {
        validateDates(startDate, endDate);
        Lease lease = getForOwner(id, ownerId);
        lease.setPropertyId(propertyId);
        lease.setTenantId(tenantId);
        lease.setStartDate(startDate);
        lease.setEndDate(endDate);
        lease.setRentAmount(rentAmount);
        lease.setDepositAmount(depositAmount);
        lease.setIrlReferenceQuarter(irlReferenceQuarter);
        return leaseRepository.save(lease);
    }

    /**
     * @throws LeaseNotFoundException si le bail n'existe pas ou n'appartient pas à {@code ownerId}
     */
    public void delete(UUID id, UUID ownerId) {
        Lease lease = getForOwner(id, ownerId);
        leaseRepository.delete(lease);
    }

    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (endDate != null && !endDate.isAfter(startDate)) {
            throw new InvalidLeaseDatesException();
        }
    }
}
