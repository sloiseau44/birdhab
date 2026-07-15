package com.birdhab.payment.domain.service;

import com.birdhab.payment.domain.entity.Payment;
import com.birdhab.payment.domain.entity.PaymentStatus;
import com.birdhab.payment.domain.exception.InvalidPaymentException;
import com.birdhab.payment.domain.exception.PaymentNotFoundException;
import com.birdhab.payment.domain.exception.PaymentNotPaidException;
import com.birdhab.payment.domain.repository.PaymentRepository;
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
class PaymentServiceTest {

    private static final BigDecimal AMOUNT = BigDecimal.valueOf(850);
    private static final BigDecimal PAID_AMOUNT = BigDecimal.valueOf(850);

    @Mock
    private PaymentRepository paymentRepository;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(paymentRepository);
    }

    private Payment paymentWithId(UUID id, UUID ownerId, LocalDate dueDate, LocalDate paidDate) {
        Payment payment = new Payment(ownerId, UUID.randomUUID(), dueDate, AMOUNT,
                paidDate, paidDate != null ? PAID_AMOUNT : null);
        ReflectionTestUtils.setField(payment, "id", id);
        return payment;
    }

    // --- create ---

    @Test
    void create_nominal_savesPaymentForOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID leaseId = UUID.randomUUID();
        LocalDate dueDate = LocalDate.now().plusDays(10);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Payment result = paymentService.create(ownerId, leaseId, dueDate, AMOUNT, null, null);

        assertThat(result.getOwnerId()).isEqualTo(ownerId);
        assertThat(result.getLeaseId()).isEqualTo(leaseId);
        assertThat(result.getDueDate()).isEqualTo(dueDate);
        assertThat(result.getAmount()).isEqualTo(AMOUNT);
        assertThat(result.isPaid()).isFalse();
        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    void create_withPaidFields_savesPaidPayment() {
        UUID ownerId = UUID.randomUUID();
        LocalDate dueDate = LocalDate.now().minusDays(5);
        LocalDate paidDate = LocalDate.now().minusDays(3);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Payment result = paymentService.create(ownerId, UUID.randomUUID(), dueDate, AMOUNT, paidDate, PAID_AMOUNT);

        assertThat(result.isPaid()).isTrue();
        assertThat(result.getStatus()).isEqualTo(PaymentStatus.PAID);
    }

    @Test
    void create_paidDateWithoutPaidAmount_throwsInvalidPaymentAndDoesNotSave() {
        assertThatThrownBy(() -> paymentService.create(UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.now(), AMOUNT, LocalDate.now(), null))
                .isInstanceOf(InvalidPaymentException.class);

        verify(paymentRepository, never()).save(any());
    }

    @Test
    void create_paidAmountWithoutPaidDate_throwsInvalidPaymentAndDoesNotSave() {
        assertThatThrownBy(() -> paymentService.create(UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.now(), AMOUNT, null, PAID_AMOUNT))
                .isInstanceOf(InvalidPaymentException.class);

        verify(paymentRepository, never()).save(any());
    }

    // --- listForOwner ---

    @Test
    void listForOwner_returnsOnlyOwnerPayments() {
        UUID ownerId = UUID.randomUUID();
        List<Payment> payments = List.of(
                paymentWithId(UUID.randomUUID(), ownerId, LocalDate.now(), null),
                paymentWithId(UUID.randomUUID(), ownerId, LocalDate.now(), null));
        when(paymentRepository.findByOwnerId(ownerId)).thenReturn(payments);

        List<Payment> result = paymentService.listForOwner(ownerId);

        assertThat(result).hasSize(2);
    }

    // --- getForOwner ---

    @Test
    void getForOwner_found_returnsPayment() {
        UUID ownerId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        Payment payment = paymentWithId(paymentId, ownerId, LocalDate.now(), null);
        when(paymentRepository.findByIdAndOwnerId(paymentId, ownerId)).thenReturn(Optional.of(payment));

        Payment result = paymentService.getForOwner(paymentId, ownerId);

        assertThat(result).isEqualTo(payment);
    }

    @Test
    void getForOwner_notFound_throwsPaymentNotFound() {
        UUID ownerId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        when(paymentRepository.findByIdAndOwnerId(paymentId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.getForOwner(paymentId, ownerId))
                .isInstanceOf(PaymentNotFoundException.class);
    }

    // --- getPaidForOwner ---

    @Test
    void getPaidForOwner_paid_returnsPayment() {
        UUID ownerId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        Payment payment = paymentWithId(paymentId, ownerId, LocalDate.now().minusDays(5), LocalDate.now().minusDays(3));
        when(paymentRepository.findByIdAndOwnerId(paymentId, ownerId)).thenReturn(Optional.of(payment));

        Payment result = paymentService.getPaidForOwner(paymentId, ownerId);

        assertThat(result).isEqualTo(payment);
    }

    @Test
    void getPaidForOwner_notPaid_throwsPaymentNotPaid() {
        UUID ownerId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        Payment payment = paymentWithId(paymentId, ownerId, LocalDate.now().plusDays(5), null);
        when(paymentRepository.findByIdAndOwnerId(paymentId, ownerId)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.getPaidForOwner(paymentId, ownerId))
                .isInstanceOf(PaymentNotPaidException.class);
    }

    @Test
    void getPaidForOwner_notFound_throwsPaymentNotFound() {
        UUID ownerId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        when(paymentRepository.findByIdAndOwnerId(paymentId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.getPaidForOwner(paymentId, ownerId))
                .isInstanceOf(PaymentNotFoundException.class);
    }

    // --- update ---

    @Test
    void update_nominal_updatesFieldsAndSaves() {
        UUID ownerId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        Payment payment = paymentWithId(paymentId, ownerId, LocalDate.now(), null);
        UUID newLeaseId = UUID.randomUUID();
        LocalDate newDueDate = LocalDate.now().plusMonths(1);
        BigDecimal newAmount = BigDecimal.valueOf(900);
        LocalDate newPaidDate = LocalDate.now();
        BigDecimal newPaidAmount = BigDecimal.valueOf(900);

        when(paymentRepository.findByIdAndOwnerId(paymentId, ownerId)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(payment)).thenReturn(payment);

        Payment result = paymentService.update(paymentId, ownerId, newLeaseId, newDueDate, newAmount,
                newPaidDate, newPaidAmount);

        assertThat(result.getLeaseId()).isEqualTo(newLeaseId);
        assertThat(result.getDueDate()).isEqualTo(newDueDate);
        assertThat(result.getAmount()).isEqualTo(newAmount);
        assertThat(result.getPaidDate()).isEqualTo(newPaidDate);
        assertThat(result.getPaidAmount()).isEqualTo(newPaidAmount);
        verify(paymentRepository).save(payment);
    }

    @Test
    void update_inconsistentPaidFields_throwsInvalidPaymentAndDoesNotSave() {
        UUID ownerId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();

        assertThatThrownBy(() -> paymentService.update(paymentId, ownerId, UUID.randomUUID(),
                LocalDate.now(), AMOUNT, LocalDate.now(), null))
                .isInstanceOf(InvalidPaymentException.class);

        verify(paymentRepository, never()).findByIdAndOwnerId(any(), any());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void update_notFound_throwsPaymentNotFoundAndDoesNotSave() {
        UUID ownerId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        when(paymentRepository.findByIdAndOwnerId(paymentId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.update(paymentId, ownerId, UUID.randomUUID(),
                LocalDate.now(), AMOUNT, null, null))
                .isInstanceOf(PaymentNotFoundException.class);

        verify(paymentRepository, never()).save(any());
    }

    // --- delete ---

    @Test
    void delete_nominal_deletesPayment() {
        UUID ownerId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        Payment payment = paymentWithId(paymentId, ownerId, LocalDate.now(), null);
        when(paymentRepository.findByIdAndOwnerId(paymentId, ownerId)).thenReturn(Optional.of(payment));

        paymentService.delete(paymentId, ownerId);

        verify(paymentRepository).delete(payment);
    }

    @Test
    void delete_notFound_throwsPaymentNotFoundAndDoesNotDelete() {
        UUID ownerId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        when(paymentRepository.findByIdAndOwnerId(paymentId, ownerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.delete(paymentId, ownerId))
                .isInstanceOf(PaymentNotFoundException.class);

        verify(paymentRepository, never()).delete(any());
    }

    // --- status dérivé ---

    @Test
    void getStatus_paid_returnsPaid() {
        Payment payment = new Payment(UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.now().minusDays(10), AMOUNT, LocalDate.now().minusDays(8), PAID_AMOUNT);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PAID);
    }

    @Test
    void getStatus_unpaidPastDueDate_returnsLate() {
        Payment payment = new Payment(UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.now().minusDays(1), AMOUNT, null, null);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.LATE);
    }

    @Test
    void getStatus_unpaidFutureDueDate_returnsPending() {
        Payment payment = new Payment(UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.now().plusDays(10), AMOUNT, null, null);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PENDING);
    }
}
