package com.birdhab.payment.infrastructure.pdf;

import com.birdhab.payment.domain.entity.Payment;
import com.birdhab.payment.domain.model.Address;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Met en page la quittance PDF d'une échéance payée (Apache PDFBox, voir
 * décision technique dans CONTEXT.md).
 *
 * <p>Ne connaît que les données transmises par l'appelant ({@code ReceiptRequest}) :
 * payment n'appelle jamais les services auth/property pour les récupérer lui-même
 * (voir la question d'architecture tranchée dans CONTEXT.md).</p>
 */
@Component
public class ReceiptPdfGenerator {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter MONTH_FORMAT = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.FRENCH);
    private static final float MARGIN = 60;
    private static final float LEADING = 20;

    public byte[] generate(Payment payment, String ownerFullName, Address ownerAddress,
                            String tenantFullName, Address propertyAddress) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            var font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            var fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = page.getMediaBox().getHeight() - MARGIN;

                y = writeLine(content, fontBold, 16, MARGIN, y, "Quittance de loyer");
                y -= LEADING;

                y = writeLine(content, fontBold, 11, MARGIN, y, "Bailleur");
                y = writeLine(content, font, 11, MARGIN, y, ownerFullName);
                y = writeLine(content, font, 11, MARGIN, y, ownerAddress.format());
                y -= LEADING;

                y = writeLine(content, fontBold, 11, MARGIN, y, "Locataire");
                y = writeLine(content, font, 11, MARGIN, y, tenantFullName);
                y -= LEADING;

                y = writeLine(content, fontBold, 11, MARGIN, y, "Bien loué");
                y = writeLine(content, font, 11, MARGIN, y, propertyAddress.format());
                y -= LEADING;

                y = writeLine(content, font, 11, MARGIN, y,
                        "Le bailleur déclare avoir reçu de la part du locataire la somme de %.2f €"
                                .formatted(payment.getPaidAmount()));
                y = writeLine(content, font, 11, MARGIN, y,
                        "au titre du loyer et charges du mois de %s,".formatted(
                                payment.getDueDate().format(MONTH_FORMAT)));
                y = writeLine(content, font, 11, MARGIN, y,
                        "payé le %s.".formatted(payment.getPaidDate().format(DATE_FORMAT)));
                y -= LEADING;

                y = writeLine(content, font, 9, MARGIN, y,
                        "Cette quittance annule tous les reçus qui auraient pu être établis "
                                + "précédemment en cas de paiement partiel.");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        }
    }

    private float writeLine(PDPageContentStream content, PDType1Font font, float fontSize,
                             float x, float y, String text) throws IOException {
        content.beginText();
        content.setFont(font, fontSize);
        content.newLineAtOffset(x, y);
        content.showText(text);
        content.endText();
        return y - LEADING;
    }
}
