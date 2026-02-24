import { prisma } from "@/lib/prisma";
import { OrdersListClient } from "./OrdersListClient";

export default async function OrdersPage() {
    const _sales = await prisma.sale.findMany({
        orderBy: { date: 'desc' },
        include: {
            customer: true,
            items: {
                include: {
                    customizations: true
                }
            }
        }
    });

    const initialSales = _sales.map(s => ({
        ...s,
        date: s.date.toISOString()
    }));

    const rawItemsMap = new Map();
    const kitsMap = new Map();

    const [allRaw, allKits] = await Promise.all([
        prisma.rawItem.findMany({ include: { category: true } }),
        prisma.kit.findMany()
    ]);

    allRaw.forEach(r => rawItemsMap.set(r.id, r));
    allKits.forEach(k => kitsMap.set(k.id, k));

    return (
        <OrdersListClient
            initialSales={initialSales}
            rawItemsMap={Object.fromEntries(rawItemsMap)}
            kitsMap={Object.fromEntries(kitsMap)}
        />
    );
}
