package com.birdhab.payment.domain.repository;

import com.birdhab.payment.domain.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Accès aux données pour {@link Payment}.
 */
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByOwnerId(UUID ownerId);

    Optional<Payment> findByIdAndOwnerId(UUID id, UUID ownerId);
}
