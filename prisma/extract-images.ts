import ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Image Extraction...");
    const filePath = path.join(process.cwd(), '../Copy of TheEventGallerySystem.xlsx');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // 1. Process ItemsInventory
    const itemsSheet = workbook.getWorksheet('ItemsInventory');
    if (itemsSheet) {
        console.log("Extracting images from ItemsInventory...");
        const images = itemsSheet.getImages();

        for (const image of images) {
            // exceljs stores coordinates in image.range (tl = top-left corner)
            // tl.col, tl.row are 0-indexed
            const rowIdx = image.range.tl.row;

            // Get the item ID from column A (which is col index 1 in 1-indexed methods, or 0 in tl)
            // exceljs rows are 1-indexed. rowIdx is 0-indexed. So actual row is rowIdx + 1
            const row = itemsSheet.getRow(rowIdx + 1);
            const itemIdCell = row.getCell(1).value;

            if (itemIdCell) {
                const itemId = String(itemIdCell);
                const media = workbook.getImage(Number(image.imageId));
                if (media) {
                    const ext = media.extension;
                    const filename = `item_${itemId}.${ext}`;
                    const outPath = path.join(uploadsDir, filename);

                    fs.writeFileSync(outPath, Buffer.from(media.buffer as ArrayBuffer));

                    // Update database
                    await prisma.rawItem.updateMany({
                        where: { id: itemId },
                        data: { imageUrl: `/uploads/${filename}` }
                    });
                    console.log(`Saved image for Item ${itemId} -> ${filename}`);
                }
            }
        }
    }

    // 2. Process KitsInventory
    const kitsSheet = workbook.getWorksheet('KitsInventory');
    if (kitsSheet) {
        console.log("Extracting images from KitsInventory...");
        const images = kitsSheet.getImages();

        for (const image of images) {
            const rowIdx = image.range.tl.row;
            const row = kitsSheet.getRow(rowIdx + 1);
            const kitIdCell = row.getCell(1).value;

            if (kitIdCell) {
                const kitId = String(kitIdCell);

                const media = workbook.getImage(Number(image.imageId));
                if (media) {
                    const ext = media.extension;
                    const filename = `kit_${kitId}.${ext}`;
                    const outPath = path.join(uploadsDir, filename);

                    fs.writeFileSync(outPath, Buffer.from(media.buffer as ArrayBuffer));

                    await prisma.kit.updateMany({
                        where: { id: kitId },
                        data: { imageUrl: `/uploads/${filename}` }
                    });
                    console.log(`Saved image for Kit ${kitId} -> ${filename}`);
                }
            }
        }
    }

    console.log("Image Extraction Complete!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
