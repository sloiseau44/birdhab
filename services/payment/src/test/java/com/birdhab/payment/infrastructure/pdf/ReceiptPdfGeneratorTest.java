package com.birdhab.payment.infrastructure.pdf;

import com.birdhab.payment.domain.entity.Payment;
import com.birdhab.payment.domain.model.Address;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ReceiptPdfGeneratorTest {

    private final ReceiptPdfGenerator generator = new ReceiptPdfGenerator();

    @Test
    void generate_paidPayment_producesReadablePdfWithKeyInformation() throws Exception {
        Payment payment = new Payment(UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.of(2026, 9, 1), BigDecimal.valueOf(850), LocalDate.of(2026, 9, 3), BigDecimal.valueOf(850));
        Address ownerAddress = new Address("1 rue de la Paix", "75001", "Paris");
        Address propertyAddress = new Address("12 rue des Oliviers", "06000", "Nice");

        byte[] pdf = generator.generate(payment, "Jean Dupont", ownerAddress, "Julie Martin", propertyAddress);

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");

        String text;
        try (PDDocument document = Loader.loadPDF(pdf)) {
            text = new PDFTextStripper().getText(document);
        }

        assertThat(text)
                .contains("Quittance de loyer")
                .contains("Jean Dupont")
                .contains("Julie Martin")
                .contains("850")
                .contains("Nice");
    }
}
