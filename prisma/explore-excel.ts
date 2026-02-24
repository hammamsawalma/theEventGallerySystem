import * as XLSX from 'xlsx';

async function main() {
    const filePath = '../Copy of TheEventGallerySystem.xlsx';

    try {
        const workbook = XLSX.readFile(filePath);

        if (workbook.SheetNames.includes("Manufacturing")) {
            const sheet = workbook.Sheets["Manufacturing"];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            console.log("\n--- Manufacturing Headers ---");
            console.log(data[0]);
            console.log("Sample Row:");
            console.log(data[1]);

            // Let's print a few rows to see BOM structure
            console.log("Rows 2 to 5:");
            for (let i = 2; i <= 5; i++) {
                console.log(data[i]);
            }
        }
    } catch (err) {
        console.error("Error reading file:", err);
    }
}

main();
