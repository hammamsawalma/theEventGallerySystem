import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';

const sqlite = new Database('./prisma/dev.db', { readonly: true });
const prisma = new PrismaClient();

const tables = [
    { name: 'User', booleans: [], dates: [] },
    { name: 'Customer', booleans: [], dates: [] },
    { name: 'Category', booleans: [], dates: [] },
    { name: 'ExpenseCategory', booleans: [], dates: [] },
    { name: 'RawItem', booleans: ['isBulk'], dates: [] },
    { name: 'Kit', booleans: [], dates: [] },
    { name: 'RentalItem', booleans: [], dates: [] },
    { name: 'KitBOM', booleans: [], dates: [] },
    { name: 'Purchase', booleans: [], dates: ['date'] },
    { name: 'PurchaseLineItem', booleans: [], dates: [] },
    { name: 'Sale', booleans: [], dates: ['date'] },
    { name: 'SaleLineItem', booleans: ['isCustomized', 'isReturned'], dates: ['rentalStartDate', 'rentalEndDate', 'returnedAt'] },
    { name: 'Customization', booleans: [], dates: [] },
    { name: 'Expense', booleans: [], dates: ['date'] },
    { name: 'SystemLog', booleans: [], dates: ['date'] },
];

async function main() {
    console.log('Starting data migration from SQLite to PostgreSQL...');

    for (const table of tables) {
        console.log(`Migrating table: ${table.name}...`);
        try {
            const rows = sqlite.prepare(`SELECT * FROM "${table.name}"`).all();

            const data = rows.map((row: any) => {
                const obj = { ...row };

                for (const col of table.booleans) {
                    if (obj[col] !== null && obj[col] !== undefined) {
                        obj[col] = obj[col] === 1 || obj[col] === 'true' || obj[col] === true;
                    }
                }

                for (const col of table.dates) {
                    if (obj[col] !== null && obj[col] !== undefined) {
                        obj[col] = new Date(obj[col]);
                    }
                }

                return obj;
            });

            if (data.length > 0) {
                const modelName = table.name.charAt(0).toLowerCase() + table.name.slice(1);
                // @ts-ignore
                await prisma[modelName].createMany({
                    data,
                    skipDuplicates: true,
                });
                console.log(`✅ Inserted ${data.length} records into ${table.name}`);
            } else {
                console.log(`⚠️ No records found in ${table.name}`);
            }
        } catch (e: any) {
            // If table doesn't exist or other error
            console.error(`❌ Error migrating ${table.name}:`, e.message);
        }
    }

    console.log('Migration completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        sqlite.close();
    });
