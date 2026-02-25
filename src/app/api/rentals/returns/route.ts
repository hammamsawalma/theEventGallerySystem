import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { saleLineItemId, quantityReturnedStr, quantityDamagedStr } = data;

        if (!saleLineItemId) {
            return NextResponse.json({ error: "Missing saleLineItemId" }, { status: 400 });
        }

        const quantityReturned = parseInt(quantityReturnedStr, 10);
        const quantityDamaged = parseInt(quantityDamagedStr || '0', 10);

        if (isNaN(quantityReturned) || quantityReturned < 0 || isNaN(quantityDamaged) || quantityDamaged < 0) {
            return NextResponse.json({ error: "Invalid quantities" }, { status: 400 });
        }

        const lineItem = await prisma.saleLineItem.findUnique({
            where: { id: saleLineItemId },
            include: { rentalItem: true, sale: true }
        });

        if (!lineItem || lineItem.itemType !== 'RENTAL' || !lineItem.rentalItem) {
            return NextResponse.json({ error: "Invalid rental line item" }, { status: 404 });
        }

        if (lineItem.isReturned) {
            return NextResponse.json({ error: "Item string is already marked returned" }, { status: 400 });
        }

        const totalBeingProcessed = quantityReturned + quantityDamaged;

        if (totalBeingProcessed !== lineItem.quantity) {
            return NextResponse.json({ error: "Total processed must match the ordered quantity" }, { status: 400 });
        }

        // 1. Transaction to update the line item and potentially deduct stock for damages.
        await prisma.$transaction(async (tx) => {
            // Mark the line item as resolved
            await tx.saleLineItem.update({
                where: { id: saleLineItemId },
                data: {
                    isReturned: true,
                    returnedAt: new Date(),
                    damagedQuantity: quantityDamaged
                }
            });

            // If there was damage, permanently deduct from totalStock
            if (quantityDamaged > 0) {
                await tx.rentalItem.update({
                    where: { id: lineItem.rentalItem!.id },
                    data: {
                        totalStock: {
                            decrement: quantityDamaged
                        }
                    }
                });

                // Log the damage as an audit event
                await tx.systemLog.create({
                    data: {
                        userId: 'SYSTEM',
                        action: 'RENTAL_DAMAGE_WRITEOFF',
                        details: `${quantityDamaged} unit(s) of ${lineItem.rentalItem!.name} written off as damaged from Sale ${lineItem.saleId.split('-')[0]}`
                    }
                });
            }

            // Log the return
            await tx.systemLog.create({
                data: {
                    userId: 'SYSTEM',
                    action: 'RENTAL_RETURNED',
                    details: `Sale ${lineItem.saleId.split('-')[0]}: Returned ${quantityReturned} unit(s) of ${lineItem.rentalItem!.name} (${quantityDamaged} damaged).`
                }
            });
        });

        return NextResponse.json({ success: true, processedQuantity: totalBeingProcessed });
    } catch (error) {
        console.error("Failed to process return:", error);
        return NextResponse.json({ error: "Failed to process return" }, { status: 500 });
    }
}
