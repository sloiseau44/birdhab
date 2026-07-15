package com.birdhab.payment.api.dto;

import com.birdhab.payment.domain.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Représentation d'une échéance renvoyée par l'API.
 */
public record PaymentResponse(
        UUID id,
        UUID ownerId,
        UUID leaseId,
        LocalDate dueDate,
        BigDecimal amount,
        LocalDate paidDate,
        BigDecimal paidAmount,
        PaymentStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}
