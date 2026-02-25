import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const purchases = await prisma.purchase.findMany({
            include: {
                items: {
                    include: { rawItem: true }
                }
            },
            orderBy: { date: 'desc' }
        });
        return NextResponse.json(purchases);
    } catch (error) {
        console.error("Failed to fetch purchases:", error);
        return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { status, landedCost, items, supplier, notes } = body;
        // items should be array of { rawItemId, quantity, unitPrice }

        // Start a transaction so purchase and items are created together
        const result = await prisma.$transaction(async (tx) => {
            const purchase = await tx.purchase.create({
                data: {
                    status: status || "PENDING",
                    landedCost: landedCost || 0,
                    supplier: supplier || null,
                    notes: notes || null,
                    items: {
                        create: items.map((item: any) => ({
                            rawItemId: item.rawItemId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                        }))
                    }
                },
                include: { items: true }
            });

            // If created as COMPLETED instantly, process stock and MAC updates
            if (purchase.status === "COMPLETED") {
                const totalPurchasedUnits = purchase.items.reduce((sum, item) => sum + item.quantity, 0);
                const landedCostPerUnit = totalPurchasedUnits > 0 ? (purchase.landedCost / totalPurchasedUnits) : 0;

                for (const item of purchase.items) {
                    const rawItem = await tx.rawItem.findUnique({ where: { id: item.rawItemId } });
                    if (!rawItem) continue;

                    // Calculate new Moving Average Cost (MAC)
                    const oldTotalValue = rawItem.currentStock * rawItem.movingAverageCost;
                    const newAddedValue = item.quantity * (item.unitPrice + landedCostPerUnit);
                    const totalNewStock = rawItem.currentStock + item.quantity;

                    let newMAC = rawItem.movingAverageCost;
                    if (totalNewStock > 0) {
                        newMAC = (oldTotalValue + newAddedValue) / totalNewStock;
                    }

                    await tx.rawItem.update({
                        where: { id: rawItem.id },
                        data: {
                            currentStock: totalNewStock,
                            movingAverageCost: newMAC
                        }
                    });
                }
            }

            return purchase;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to create purchase:", error);
        return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 });
    }
}
