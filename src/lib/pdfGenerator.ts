import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

export function generateInvoicePDF(sale: any, kitsMap: any, rawItemsMap: any) {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Formatting Helpers
        const formatCurrency = (amount: number) => `$${typeof amount === 'number' ? amount.toFixed(2) : '0.00'} `;

        // 1. Header & Branding
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("INVOICE", 14, 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Event Gallery System", 14, 28);

        // 2. Invoice Meta data (Right aligned)
        doc.setTextColor(0);
        const invoiceId = sale?.id ? sale.id.split('-')[0].toUpperCase() : "UNKNOWN";
        doc.text(`Invoice ID: #${invoiceId} `, pageWidth - 14, 20, { align: 'right' });
        doc.text(`Date: ${sale?.date ? new Date(sale.date).toLocaleDateString() : new Date().toLocaleDateString()} `, pageWidth - 14, 28, { align: 'right' });

        // 3. Customer Info
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Bill To:", 14, 45);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(sale?.customer?.name || "Unknown Customer", 14, 52);
        doc.text(sale?.customer?.phone || "No Phone Provided", 14, 58);

        // 4. Line Items Table
        const tableBody: any[][] = [];

        (sale?.items || []).forEach((item: any) => {
            let name = item.description || "Custom Fee";
            if (item.itemType === 'KIT') {
                name = kitsMap[item.itemId]?.name || "Unknown Kit";
            } else if (item.itemType === 'RAW_ITEM') {
                name = rawItemsMap[item.itemId]?.name || "Unknown Raw Item";
            }

            // Add Main Item Row
            tableBody.push([
                (item.quantity || 1).toString(),
                name,
                formatCurrency(item.unitPrice),
                formatCurrency((item.unitPrice || 0) * (item.quantity || 1))
            ]);

            // Add Customization Rows (if any)
            if (item.customizations && item.customizations.length > 0) {
                item.customizations.forEach((custom: any) => {
                    const customName = rawItemsMap[custom.rawItemId]?.name || "Customization";
                    tableBody.push([
                        (custom.quantityAdded || 1).toString(),
                        `   + ${customName} `,
                        formatCurrency(custom.extraPrice),
                        formatCurrency((custom.extraPrice || 0) * (custom.quantityAdded || 1))
                    ]);
                });
            }
        });

        autoTable(doc, {
            startY: 70,
            head: [['Qty', 'Description', 'Unit Price', 'Total']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: {
                0: { cellWidth: 20 },
                2: { halign: 'right', cellWidth: 40 },
                3: { halign: 'right', cellWidth: 40 }
            }
        });

        // 5. Totals Area
        let finalY = 70 + (tableBody.length * 10) + 10; // Fallback estimate if autoTable doesn't set lastAutoTable
        // @ts-ignore
        if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
            // @ts-ignore
            finalY = doc.lastAutoTable.finalY + 10;
        }

        doc.setFontSize(12);
        if (sale?.discountAmount > 0) {
            doc.setFont("helvetica", "normal");
            const subtotal = (sale.totalAmount || 0) + (sale.discountAmount || 0);
            doc.text(`Subtotal: ${formatCurrency(subtotal)} `, pageWidth - 14, finalY, { align: 'right' });
            doc.text(`Discount: -${formatCurrency(sale.discountAmount)} `, pageWidth - 14, finalY + 8, { align: 'right' });

            doc.setFont("helvetica", "bold");
            doc.text(`Total Due: ${formatCurrency(sale.totalAmount)} `, pageWidth - 14, finalY + 18, { align: 'right' });
        } else {
            doc.setFont("helvetica", "bold");
            doc.text(`Total Due: ${formatCurrency(sale?.totalAmount || 0)} `, pageWidth - 14, finalY, { align: 'right' });
        }

        // 6. Save PDF
        const safeName = (sale?.customer?.name || "Customer").replace(/[\s\/\\+]/g, '_');
        doc.save(`Invoice_${safeName}_${invoiceId}.pdf`);
    } catch (error) {
        console.error("PDF Generation Error:", error);
        throw new Error("Failed to generate PDF document.");
    }
}
