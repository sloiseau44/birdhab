package com.birdhab.lease.domain.entity;

import com.birdhab.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Bail reliant un bien à un locataire, pour un propriétaire.
 *
 * <p>{@code ownerId}, {@code propertyId} et {@code tenantId} référencent des
 * entités d'autres microservices (auth, property, tenant) par simple
 * convention applicative : aucune relation JPA ni contrainte de clé étrangère
 * SQL n'est établie vers ces services, chaque microservice étant un contexte
 * borné indépendant (voir CLAUDE.md).</p>
 *
 * <p>Le statut du bail ({@link #getStatus()}) n'est pas persisté : il est
 * dérivé de {@code endDate} à la lecture, aucun endpoint ne le modifiant
 * directement en v1 (résiliation anticipée hors périmètre, voir CONTEXT.md).</p>
 */
@Entity
@Table(name = "leases")
public class Lease extends BaseEntity {

    @Column(name = "owner_id", nullable = false, updatable = false)
    private UUID ownerId;

    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "rent_amount", nullable = false)
    private BigDecimal rentAmount;

    @Column(name = "deposit_amount", nullable = false)
    private BigDecimal depositAmount;

    @Column(name = "irl_reference_quarter", length = 7)
    private String irlReferenceQuarter;

    protected Lease() {
        // requis par JPA
    }

    public Lease(UUID ownerId, UUID propertyId, UUID tenantId, LocalDate startDate, LocalDate endDate,
                 BigDecimal rentAmount, BigDecimal depositAmount, String irlReferenceQuarter) {
        this.ownerId = ownerId;
        this.propertyId = propertyId;
        this.tenantId = tenantId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.rentAmount = rentAmount;
        this.depositAmount = depositAmount;
        this.irlReferenceQuarter = irlReferenceQuarter;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public UUID getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(UUID propertyId) {
        this.propertyId = propertyId;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public BigDecimal getRentAmount() {
        return rentAmount;
    }

    public void setRentAmount(BigDecimal rentAmount) {
        this.rentAmount = rentAmount;
    }

    public BigDecimal getDepositAmount() {
        return depositAmount;
    }

    public void setDepositAmount(BigDecimal depositAmount) {
        this.depositAmount = depositAmount;
    }

    public String getIrlReferenceQuarter() {
        return irlReferenceQuarter;
    }

    public void setIrlReferenceQuarter(String irlReferenceQuarter) {
        this.irlReferenceQuarter = irlReferenceQuarter;
    }

    public LeaseStatus getStatus() {
        return (endDate != null && endDate.isBefore(LocalDate.now())) ? LeaseStatus.TERMINATED : LeaseStatus.ACTIVE;
    }
}
