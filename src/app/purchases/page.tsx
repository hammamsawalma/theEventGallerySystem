import { prisma } from "@/lib/prisma";
import { PurchasesListClient } from "./PurchasesListClient";

export default async function PurchasesPage() {
    const _purchases = await prisma.purchase.findMany({
        orderBy: { date: 'desc' },
        include: {
            items: {
                include: {
                    rawItem: { include: { category: true } }
                }
            }
        }
    });

    // Serialize dates for Client Component
    const initialPurchases = _purchases.map(p => ({
        ...p,
        date: p.date.toISOString(),
        items: p.items.map(i => ({
            ...i,
            rawItem: {
                ...i.rawItem,
                name: i.rawItem.name,
                category: i.rawItem.category
            }
        }))
    }));

    return (
        <div className="flex flex-col gap-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Purchase History</h1>
                <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
                    View and manage all incoming physical inventory purchases. Expand an order to see its line items.
                </p>
            </div>

            <PurchasesListClient initialPurchases={initialPurchases} />
        </div>
    );
}
