package com.birdhab.payment.domain.entity;

/**
 * Statut d'une échéance, dérivé de {@code paidDate}/{@code dueDate} (non persisté).
 */
public enum PaymentStatus {
    PENDING,
    PAID,
    LATE
}
