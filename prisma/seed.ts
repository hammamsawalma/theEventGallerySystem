import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting real data migration from Excel...");

    // Clear existing to avoid conflicts during testing
    await prisma.systemLog.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.expenseCategory.deleteMany();
    await prisma.customization.deleteMany();
    await prisma.saleLineItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.purchaseLineItem.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.kitBOM.deleteMany();
    await prisma.kit.deleteMany();
    await prisma.rawItem.deleteMany();
    await prisma.category.deleteMany();

    const filePath = path.join(process.cwd(), '../Copy of TheEventGallerySystem.xlsx');
    let workbook;
    try {
        workbook = XLSX.readFile(filePath);
    } catch (err) {
        console.error("Could not find or read the Excel file.");
        return;
    }

    // Helper arrays for lookups
    const categoryMap = new Map<string, string>(); // name -> id

    // 1. Process ItemsInventory (Raw Items)
    if (workbook.SheetNames.includes("ItemsInventory")) {
        console.log("Processing Raw Items...");
        const sheet = workbook.Sheets["ItemsInventory"];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        // Skip row 0 (headers)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows

            const id = String(row[0]);
            const catName = row[1] ? String(row[1]) : 'Uncategorized';
            const name = String(row[2]);
            const imageUrl = row[3] ? String(row[3]) : null;
            const availableQ = parseFloat(row[5]) || 0;
            const unitPrice = parseFloat(row[6]) || 0;

            // Ensure category exists
            if (!categoryMap.has(catName)) {
                const cat = await prisma.category.create({ data: { name: catName } });
                categoryMap.set(catName, cat.id);
            }

            await prisma.rawItem.create({
                data: {
                    id: id,
                    name: name,
                    imageUrl: imageUrl,
                    isBulk: false,
                    currentStock: availableQ,
                    movingAverageCost: unitPrice,
                    categoryId: categoryMap.get(catName)!
                }
            });
        }
    }

    // 2. Process KitsInventory (Kits)
    if (workbook.SheetNames.includes("KitsInventory")) {
        console.log("Processing Kits...");
        const sheet = workbook.Sheets["KitsInventory"];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0 || !row[0]) continue;

            const id = String(row[0]);
            const name = String(row[1]); // In Kits sheet, 'Category' column holds the Kit Name
            const imageUrl = row[2] ? String(row[2]) : null;
            const availableQ = parseInt(row[4]) || 0; // Current assembled stock
            const salePrice = parseFloat(row[8]) || 0; // Sale Price

            await prisma.kit.create({
                data: {
                    id: id,
                    name: name,
                    imageUrl: imageUrl,
                    baseSalePrice: salePrice,
                    currentStock: availableQ
                }
            });
        }
    }

    // 3. Process Manufacturing (BOMs)
    if (workbook.SheetNames.includes("Manufacturing")) {
        console.log("Processing Manufacturing BOMs...");
        const sheet = workbook.Sheets["Manufacturing"];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        let currentKitName: string | null = null;
        let currentKitId: string | null = null;
        const allKits = await prisma.kit.findMany();

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            // If the row has only one item in position 0, it's a Kit Header (like 'DISCO')
            if (row[0] && !row[1] && !row[2]) {
                currentKitName = String(row[0]).trim();
                const kit = allKits.find(k => k.name.toLowerCase() === currentKitName?.toLowerCase());
                currentKitId = kit ? kit.id : null;
                continue;
            }

            // If it's the header row ('Id', 'Name', 'Used Unit', etc.), skip it
            if (row[0] === 'Id' || row[1] === 'Name') continue;

            // Extract BOM components if we are inside a kit context
            if (currentKitId && row[0] && row[2]) { // Id and Used Unit must exist
                const rawItemId = String(row[0]);
                const quantity = parseFloat(row[2]) || 0;

                // Verify raw item exists
                const exists = await prisma.rawItem.findUnique({ where: { id: rawItemId } });
                if (exists && quantity > 0) {
                    await prisma.kitBOM.create({
                        data: {
                            kitId: currentKitId,
                            rawItemId: rawItemId,
                            quantity: quantity
                        }
                    });
                }
            }
        }
    }

    console.log("Data migration from actual Excel completed successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
