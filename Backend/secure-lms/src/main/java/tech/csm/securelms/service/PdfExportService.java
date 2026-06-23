package tech.csm.securelms.service;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Builds styled, paginated PDF reports using iText 7.
 *
 * Design tokens — all matching the app's CSS variables:
 *   Primary indigo  #4F46E5  — header bar, column header row background
 *   Indigo-800      #3730A3  — column header row (slightly darker for contrast)
 *   Indigo-50       #EEF2FF  — alternating row shading
 *   Slate-100       #F1F5F9  — footer bar background
 *   Indigo-200      #C7D2FE  — header subtext (generated-at line)
 *   Slate-500       #64748B  — muted footer text
 *   Slate-900       #0F172A  — body text
 *
 * Page layout:
 *   - A4 Landscape (842 × 595 pt) — accommodates wide tables
 *   - 36 pt side margins
 *   - 52 pt top margin (space for indigo header bar)
 *   - 30 pt bottom margin (space for footer bar)
 *
 * Two-pass rendering is used to show accurate "Page X of Y" footers.
 * Pass 1 builds the content. Pass 2 stamps page-number text after
 * the total page count is known.
 */
@Service
@Slf4j
public class PdfExportService {

    // ── Brand colours ──────────────────────────────────────────────────────
    private static final DeviceRgb INDIGO_600  = new DeviceRgb(0x4F, 0x46, 0xE5);
    private static final DeviceRgb INDIGO_800  = new DeviceRgb(0x37, 0x30, 0xA3);
    private static final DeviceRgb INDIGO_200  = new DeviceRgb(0xC7, 0xD2, 0xFE);
    private static final DeviceRgb INDIGO_50   = new DeviceRgb(0xEE, 0xF2, 0xFF);
    private static final DeviceRgb SLATE_100   = new DeviceRgb(0xF1, 0xF5, 0xF9);
    private static final DeviceRgb SLATE_500   = new DeviceRgb(0x64, 0x74, 0x8B);
    private static final DeviceRgb SLATE_900   = new DeviceRgb(0x0F, 0x17, 0x2A);
    private static final DeviceRgb WHITE       = new DeviceRgb(255, 255, 255);
    private static final DeviceRgb ROW_BORDER  = new DeviceRgb(0xE2, 0xE8, 0xF0); // --border

    // ── Layout constants ───────────────────────────────────────────────────
    private static final float HEADER_H    = 48f;
    private static final float FOOTER_H    = 22f;
    private static final float SIDE_MARGIN = 36f;
    private static final float TOP_MARGIN  = HEADER_H + 16f;
    private static final float BOT_MARGIN  = FOOTER_H + 12f;

    private static final DateTimeFormatter DISPLAY_FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm");

    // ──────────────────────────────────────────────────────────────────────
    //  Public API
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Builds a complete, styled PDF report.
     *
     * @param title   Report title — shown in the indigo header bar on every page
     * @param headers Column header labels (left-to-right order)
     * @param rows    Data rows — each {@code String[]} must match {@code headers.length};
     *                nulls and missing positions are rendered as "—"
     * @return Raw PDF bytes, ready to stream as {@code application/pdf}
     */
    public byte[] buildReport(String title, String[] headers, List<String[]> rows) {
        try {
            byte[] firstPass = buildFirstPass(title, headers, rows);
            return stampPageNumbers(firstPass);
        } catch (IOException e) {
            log.error("PDF generation failed for report '{}': {}", title, e.getMessage(), e);
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Pass 1 — build content (header bar, table, no footer numbers yet)
    // ──────────────────────────────────────────────────────────────────────

    private byte[] buildFirstPass(String title, String[] headers, List<String[]> rows)
            throws IOException {

        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        PdfWriter  writer  = new PdfWriter(baos);
        PdfDocument pdf    = new PdfDocument(writer);
        PageSize   page    = PageSize.A4.rotate();      // landscape

        PdfFont bold    = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);

        String generatedAt = "SecureLMS  ·  Generated: " +
                LocalDateTime.now().format(DISPLAY_FMT);

        // Register the header-bar event handler (fires on END_PAGE)
        pdf.addEventHandler(
                com.itextpdf.kernel.events.PdfDocumentEvent.END_PAGE,
                new HeaderBarHandler(title, generatedAt, bold, regular));

        Document doc = new Document(pdf, page);
        doc.setMargins(TOP_MARGIN, SIDE_MARGIN, BOT_MARGIN, SIDE_MARGIN);

        // ── Table ─────────────────────────────────────────────────────────
        float[] colWidths = buildColumnWidths(headers.length);
        Table table = new Table(UnitValue.createPercentArray(colWidths))
                .useAllAvailableWidth()
                .setMarginBottom(0);

        // Column header row
        for (String h : headers) {
            table.addHeaderCell(
                    headerCell(h, bold));
        }

        // Data rows
        if (rows.isEmpty()) {
            // Empty-state spanning all columns
            table.addCell(
                    new Cell(1, headers.length)
                            .add(new Paragraph("No records found.")
                                    .setFont(regular)
                                    .setFontSize(9f)
                                    .setFontColor(SLATE_500)
                                    .setTextAlignment(TextAlignment.CENTER))
                            .setBackgroundColor(INDIGO_50)
                            .setPaddingTop(14f)
                            .setPaddingBottom(14f)
                            .setBorder(Border.NO_BORDER));
        } else {
            for (int r = 0; r < rows.size(); r++) {
                String[] row = rows.get(r);
                boolean alt  = (r % 2 == 1);
                DeviceRgb bg = alt ? INDIGO_50 : WHITE;

                for (int c = 0; c < headers.length; c++) {
                    String val = (c < row.length && row[c] != null) ? row[c] : "—";
                    table.addCell(dataCell(val, regular, bg));
                }
            }
        }

        doc.add(table);
        doc.close();

        return baos.toByteArray();
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Pass 2 — stamp "Page X of Y" footer on each page
    // ──────────────────────────────────────────────────────────────────────

    private byte[] stampPageNumbers(byte[] input) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        PdfReader  reader   = new PdfReader(new ByteArrayInputStream(input));
        PdfWriter  writer2  = new PdfWriter(out);
        PdfDocument pdf     = new PdfDocument(reader, writer2);

        int total = pdf.getNumberOfPages();
        PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);

        for (int i = 1; i <= total; i++) {
            PdfPage   page   = pdf.getPage(i);
            PdfCanvas canvas = new PdfCanvas(page);
            float pageW = page.getPageSize().getWidth();

            // ── Footer bar background ──────────────────────────────────────
            canvas.saveState()
                  .setFillColor(SLATE_100)
                  .rectangle(0, 0, pageW, FOOTER_H)
                  .fill()
                  .restoreState();

            // ── "Page X of Y" centred in footer ───────────────────────────
            String text = "Page " + i + " of " + total;
            // Approximate text width for centering (Helvetica 7.5pt ≈ 4.2pt/char)
            float textW = text.length() * 4.2f;

            canvas.beginText()
                  .setFontAndSize(regular, 7.5f)
                  .setColor(SLATE_500, true)
                  .moveText((pageW - textW) / 2f, 7f)
                  .showText(text)
                  .endText();

            canvas.release();
        }

        pdf.close();
        return out.toByteArray();
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Cell builders
    // ──────────────────────────────────────────────────────────────────────

    private Cell headerCell(String text, PdfFont bold) {
        return new Cell()
                .add(new Paragraph(text)
                        .setFont(bold)
                        .setFontSize(8f)
                        .setFontColor(WHITE))
                .setBackgroundColor(INDIGO_800)
                .setPaddingTop(7f)
                .setPaddingBottom(7f)
                .setPaddingLeft(6f)
                .setPaddingRight(6f)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setBorder(Border.NO_BORDER)
                .setBorderRight(new SolidBorder(INDIGO_600, 0.5f));
    }

    private Cell dataCell(String text, PdfFont regular, DeviceRgb bg) {
        return new Cell()
                .add(new Paragraph(text)
                        .setFont(regular)
                        .setFontSize(8f)
                        .setFontColor(SLATE_900))
                .setBackgroundColor(bg)
                .setPaddingTop(5f)
                .setPaddingBottom(5f)
                .setPaddingLeft(6f)
                .setPaddingRight(6f)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setBorderBottom(new SolidBorder(ROW_BORDER, 0.4f))
                .setBorderTop(Border.NO_BORDER)
                .setBorderLeft(Border.NO_BORDER)
                .setBorderRight(Border.NO_BORDER);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Column width helper
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Distributes column widths proportionally.
     * All columns are equal by default. Override this for domain-specific
     * reports if needed (e.g. give the "details" column 2×).
     */
    private float[] buildColumnWidths(int count) {
        if (count <= 0) return new float[]{100f};
        float each = 100f / count;
        float[] w  = new float[count];
        for (int i = 0; i < count; i++) w[i] = each;
        return w;
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Per-page header bar event handler (runs during pass 1)
    // ──────────────────────────────────────────────────────────────────────

    private static final class HeaderBarHandler
            implements com.itextpdf.kernel.events.IEventHandler {

        private final String  title;
        private final String  subtitle;   // "SecureLMS · Generated: ..."
        private final PdfFont bold;
        private final PdfFont regular;

        HeaderBarHandler(String title, String subtitle,
                         PdfFont bold, PdfFont regular) {
            this.title    = title;
            this.subtitle = subtitle;
            this.bold     = bold;
            this.regular  = regular;
        }

        @Override
        public void handleEvent(com.itextpdf.kernel.events.Event event) {
            com.itextpdf.kernel.events.PdfDocumentEvent e =
                    (com.itextpdf.kernel.events.PdfDocumentEvent) event;
            PdfPage   page   = e.getPage();
            PdfCanvas canvas = new PdfCanvas(page);

            float pageW = page.getPageSize().getWidth();
            float pageH = page.getPageSize().getHeight();
            float barY  = pageH - HEADER_H;

            // ── Indigo header bar ──────────────────────────────────────────
            canvas.saveState()
                  .setFillColor(INDIGO_600)
                  .rectangle(0, barY, pageW, HEADER_H)
                  .fill()
                  .restoreState();

            // ── Report title (left) ────────────────────────────────────────
            try {
                canvas.beginText()
                      .setFontAndSize(bold, 15f)
                      .setColor(WHITE, true)
                      .moveText(SIDE_MARGIN, barY + 17f)
                      .showText(title)
                      .endText();
            } catch (Exception ignored) { /* font op failed — skip */ }

            // ── Generated-at (right) ──────────────────────────────────────
            try {
                float subW = subtitle.length() * 4.2f;  // approx width
                canvas.beginText()
                      .setFontAndSize(regular, 7.5f)
                      .setColor(INDIGO_200, true)
                      .moveText(pageW - SIDE_MARGIN - subW, barY + 17f)
                      .showText(subtitle)
                      .endText();
            } catch (Exception ignored) { /* skip */ }

            canvas.release();
        }
    }
}