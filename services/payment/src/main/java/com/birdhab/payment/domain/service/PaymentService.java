package com.birdhab.payment.domain.service;

import com.birdhab.payment.domain.entity.Payment;
import com.birdhab.payment.domain.exception.InvalidPaymentException;
import com.birdhab.payment.domain.exception.PaymentNotFoundException;
import com.birdhab.payment.domain.exception.PaymentNotPaidException;
import com.birdhab.payment.domain.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Logique métier du suivi des paiements : création, consultation, modification
 * et suppression d'échéances, toujours scopées au propriétaire authentifié.
 */
@Service
@Transactional
public class PaymentService {

    private final PaymentRepository paymentRepository;

    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    public Payment create(UUID ownerId, UUID leaseId, LocalDate dueDate, BigDecimal amount,
                           LocalDate paidDate, BigDecimal paidAmount) {
        validatePaidFields(paidDate, paidAmount);
        Payment payment = new Payment(ownerId, leaseId, dueDate, amount, paidDate, paidAmount);
        return paymentRepository.save(payment);
    }

    @Transactional(readOnly = true)
    public List<Payment> listForOwner(UUID ownerId) {
        return paymentRepository.findByOwnerId(ownerId);
    }

    /**
     * @throws PaymentNotFoundException si l'échéance n'existe pas ou n'appartient pas à {@code ownerId}
     */
    @Transactional(readOnly = true)
    public Payment getForOwner(UUID id, UUID ownerId) {
        return paymentRepository.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(PaymentNotFoundException::new);
    }

    /**
     * @throws PaymentNotFoundException si l'échéance n'existe pas ou n'appartient pas à {@code ownerId}
     * @throws InvalidPaymentException si {@code paidDate}/{@code paidAmount} ne sont pas cohérents
     */
    public Payment update(UUID id, UUID ownerId, UUID leaseId, LocalDate dueDate, BigDecimal amount,
                           LocalDate paidDate, BigDecimal paidAmount) {
        validatePaidFields(paidDate, paidAmount);
        Payment payment = getForOwner(id, ownerId);
        payment.setLeaseId(leaseId);
        payment.setDueDate(dueDate);
        payment.setAmount(amount);
        payment.setPaidDate(paidDate);
        payment.setPaidAmount(paidAmount);
        return paymentRepository.save(payment);
    }

    /**
     * @throws PaymentNotFoundException si l'échéance n'existe pas ou n'appartient pas à {@code ownerId}
     * @throws PaymentNotPaidException si l'échéance n'est pas encore payée
     */
    @Transactional(readOnly = true)
    public Payment getPaidForOwner(UUID id, UUID ownerId) {
        Payment payment = getForOwner(id, ownerId);
        if (!payment.isPaid()) {
            throw new PaymentNotPaidException();
        }
        return payment;
    }

    /**
     * @throws PaymentNotFoundException si l'échéance n'existe pas ou n'appartient pas à {@code ownerId}
     */
    public void delete(UUID id, UUID ownerId) {
        Payment payment = getForOwner(id, ownerId);
        paymentRepository.delete(payment);
    }

    private void validatePaidFields(LocalDate paidDate, BigDecimal paidAmount) {
        if ((paidDate == null) != (paidAmount == null)) {
            throw new InvalidPaymentException();
        }
    }
}
