import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.join(process.cwd(), '../Copy of TheEventGallerySystem.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets["ItemsInventory"];
const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

console.log("Items Headers:", rows[0]);
console.log("Items Row 1:", rows[1]);
