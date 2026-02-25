import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const rawItems = await prisma.rawItem.findMany({
            include: { category: true },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(rawItems);
    } catch (error) {
        console.error("Failed to fetch raw items:", error);
        return NextResponse.json({ error: "Failed to fetch raw items" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, imageUrl, isBulk, categoryId, initialPurchase } = body;

        if (initialPurchase && initialPurchase.packs > 0 && initialPurchase.unitsPerPack > 0) {
            // Execution with Initial Purchase
            const result = await prisma.$transaction(async (tx) => {
                // 1. Create RawItem
                const item = await tx.rawItem.create({
                    data: {
                        name,
                        imageUrl,
                        isBulk,
                        categoryId,
                        currentStock: 0,
                        movingAverageCost: 0
                    }
                });

                const totalUnits = initialPurchase.packs * initialPurchase.unitsPerPack;
                const materialCost = initialPurchase.packs * initialPurchase.unitPricePerPack;
                const totalCost = materialCost + initialPurchase.landedCost;
                const costPerUnit = totalCost / totalUnits;

                // 2. Create COMPLETED Purchase matching exactly how /api/purchases works
                await tx.purchase.create({
                    data: {
                        status: "COMPLETED",
                        landedCost: initialPurchase.landedCost,
                        items: {
                            create: [{
                                rawItemId: item.id,
                                quantity: totalUnits,
                                unitPrice: materialCost / totalUnits // Exact physical unit price before landed cost calculation mapping
                            }]
                        }
                    }
                });

                // 3. Update Item stock & moving average cost
                const updatedItem = await tx.rawItem.update({
                    where: { id: item.id },
                    data: {
                        currentStock: totalUnits,
                        movingAverageCost: costPerUnit
                    }
                });

                // 4. Log Action
                await tx.systemLog.create({
                    data: {
                        action: 'PURCHASE_ORDER',
                        details: `Initialization Purchase for ${item.name} (${totalUnits} units)`,
                        userId: 'SYSTEM'
                    }
                });

                return updatedItem;
            });
            return NextResponse.json(result);
        } else {
            // Standard Creation
            const rawItem = await prisma.rawItem.create({
                data: {
                    name,
                    imageUrl,
                    isBulk,
                    categoryId,
                }
            });
            return NextResponse.json(rawItem);
        }
    } catch (error) {
        console.error("Failed to create raw item:", error);
        return NextResponse.json({ error: "Failed to create raw item" }, { status: 500 });
    }
}
