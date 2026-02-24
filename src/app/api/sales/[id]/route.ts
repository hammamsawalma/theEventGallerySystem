import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const saleId = (await params).id;

        if (!saleId) {
            return NextResponse.json({ error: "Missing sale ID" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Find the sale and all its line items and customizations
            const sale = await tx.sale.findUnique({
                where: { id: saleId },
                include: {
                    items: {
                        include: { customizations: true }
                    }
                }
            });

            if (!sale) {
                throw new Error("Sale not found");
            }

            // 2. Restore stock for each line item
            for (const item of sale.items) {
                if (item.itemType === 'RAW_ITEM' && item.itemId) {
                    // Restore raw item stock
                    await tx.rawItem.update({
                        where: { id: item.itemId },
                        data: { currentStock: { increment: item.quantity } }
                    });
                } else if (item.itemType === 'KIT' && item.itemId) {
                    // Restore kit stock
                    await tx.kit.update({
                        where: { id: item.itemId },
                        data: { currentStock: { increment: item.quantity } }
                    });

                    // Restore customization raw item stock
                    if (item.customizations && item.customizations.length > 0) {
                        for (const custom of item.customizations) {
                            await tx.rawItem.update({
                                where: { id: custom.rawItemId },
                                data: { currentStock: { increment: custom.quantityAdded } }
                            });
                        }
                    }
                }
            }

            // 3. Delete the sale (Cascade delete will handle SaleLineItems and Customizations)
            await tx.sale.delete({
                where: { id: saleId }
            });

            // 4. Log the action
            await tx.systemLog.create({
                data: {
                    userId: "SYSTEM_OR_USER", // TODO: Auth
                    action: "DELETE_SALE",
                    details: `Deleted sale ${saleId} and restored inventory stock.`,
                }
            });

            return { success: true, message: "Sale deleted and stock restored" };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Failed to delete sale:", error);
        return NextResponse.json({ error: error.message || "Failed to delete sale" }, { status: 500 });
    }
}
