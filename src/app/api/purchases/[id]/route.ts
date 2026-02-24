import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { status } = await request.json();
        const purchaseId = (await context.params).id;

        // First, get the current purchase
        const currentPurchase = await prisma.purchase.findUnique({
            where: { id: purchaseId },
            include: { items: true }
        });

        if (!currentPurchase) {
            return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
        }

        // Only allow updating from PENDING to COMPLETED for now to prevent complicated reversions
        if (currentPurchase.status === "COMPLETED") {
            return NextResponse.json({ error: "Cannot modify a completed purchase" }, { status: 400 });
        }

        if (status === "COMPLETED") {
            const result = await prisma.$transaction(async (tx) => {
                const updatedPurchase = await tx.purchase.update({
                    where: { id: purchaseId },
                    data: { status: "COMPLETED" },
                    include: { items: true }
                });

                // Add to stock and recalc MAC
                for (const item of updatedPurchase.items) {
                    const rawItem = await tx.rawItem.findUnique({ where: { id: item.rawItemId } });
                    if (!rawItem) continue;

                    const oldTotalValue = rawItem.currentStock * rawItem.movingAverageCost;
                    const newAddedValue = item.quantity * item.unitPrice;
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

                return updatedPurchase;
            });

            return NextResponse.json(result);
        }

        // Generic update if not changing to completed
        const updatedPurchase = await prisma.purchase.update({
            where: { id: purchaseId },
            data: { status }
        });

        return NextResponse.json(updatedPurchase);
    } catch (error) {
        console.error("Failed to update purchase:", error);
        return NextResponse.json({ error: "Failed to update purchase" }, { status: 500 });
    }
}
