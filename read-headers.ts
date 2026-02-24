import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.join(process.cwd(), '../Copy of TheEventGallerySystem.xlsx');
const workbook = XLSX.readFile(filePath);
const itemsSheet = workbook.Sheets["ItemsInventory"];
const kitsSheet = workbook.Sheets["KitsInventory"];

console.log("Items Headers:", XLSX.utils.sheet_to_json<any[]>(itemsSheet, { header: 1 })[0]);
console.log("Kits Headers:", XLSX.utils.sheet_to_json<any[]>(kitsSheet, { header: 1 })[0]);
