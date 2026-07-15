package com.birdhab.payment.domain.entity;

import com.birdhab.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Échéance de paiement de loyer rattachée à un bail, pour un propriétaire.
 *
 * <p>{@code ownerId} et {@code leaseId} référencent des entités d'autres
 * microservices (auth, lease) par simple convention applicative : aucune
 * relation JPA ni contrainte de clé étrangère SQL n'est établie vers ces
 * services, chaque microservice étant un contexte borné indépendant (voir
 * CLAUDE.md).</p>
 *
 * <p>Le statut ({@link #getStatus()}) n'est pas persisté : il est dérivé de
 * {@code paidDate}/{@code dueDate} à la lecture.</p>
 */
@Entity
@Table(name = "payments")
public class Payment extends BaseEntity {

    @Column(name = "owner_id", nullable = false, updatable = false)
    private UUID ownerId;

    @Column(name = "lease_id", nullable = false)
    private UUID leaseId;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "paid_amount")
    private BigDecimal paidAmount;

    protected Payment() {
        // requis par JPA
    }

    public Payment(UUID ownerId, UUID leaseId, LocalDate dueDate, BigDecimal amount,
                    LocalDate paidDate, BigDecimal paidAmount) {
        this.ownerId = ownerId;
        this.leaseId = leaseId;
        this.dueDate = dueDate;
        this.amount = amount;
        this.paidDate = paidDate;
        this.paidAmount = paidAmount;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public UUID getLeaseId() {
        return leaseId;
    }

    public void setLeaseId(UUID leaseId) {
        this.leaseId = leaseId;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public LocalDate getPaidDate() {
        return paidDate;
    }

    public void setPaidDate(LocalDate paidDate) {
        this.paidDate = paidDate;
    }

    public BigDecimal getPaidAmount() {
        return paidAmount;
    }

    public void setPaidAmount(BigDecimal paidAmount) {
        this.paidAmount = paidAmount;
    }

    public boolean isPaid() {
        return paidDate != null;
    }

    public PaymentStatus getStatus() {
        if (isPaid()) {
            return PaymentStatus.PAID;
        }
        return dueDate.isBefore(LocalDate.now()) ? PaymentStatus.LATE : PaymentStatus.PENDING;
    }
}
