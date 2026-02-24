import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, imageUrl, categoryId, currentStock, movingAverageCost, adjustmentReason } = body;

        // Fetch original to see if stock changed
        const originalItem = await prisma.rawItem.findUnique({ where: { id } });
        if (!originalItem) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 });
        }

        // Perform the update
        const updatedItem = await prisma.rawItem.update({
            where: { id },
            data: {
                name,
                imageUrl,
                categoryId,
                currentStock: parseFloat(currentStock),
                movingAverageCost: parseFloat(movingAverageCost),
            }
        });

        // If stock changed manually, log it!
        if (originalItem.currentStock !== updatedItem.currentStock) {
            const difference = updatedItem.currentStock - originalItem.currentStock;
            await prisma.systemLog.create({
                data: {
                    userId: "SYSTEM_OR_ADMIN", // Depending on auth setup, ideally tracked from session
                    action: "INVENTORY_ADJUSTMENT",
                    details: `Manually adjusted stock for ${name} (${id}). Change: ${difference > 0 ? '+' : ''}${difference}. Reason: ${adjustmentReason || 'No reason provided.'}`
                }
            });
        }

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error("Failed to update raw item:", error);
        return NextResponse.json({ error: "Failed to update raw item" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        // Validation: Verify item isn't strictly bound to existing Purchases or Kits preventing hard-delete
        const usageCheck = await prisma.rawItem.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { bomItems: true, purchaseLineItems: true }
                }
            }
        });

        if (!usageCheck) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 });
        }

        if (usageCheck._count.bomItems > 0 || usageCheck._count.purchaseLineItems > 0) {
            return NextResponse.json(
                { error: "Cannot delete this item because it is used in Kits or historical Purchases. Please adjust stock to 0 instead." },
                { status: 400 }
            );
        }

        await prisma.rawItem.delete({
            where: { id }
        });

        await prisma.systemLog.create({
            data: {
                userId: "SYSTEM_OR_ADMIN",
                action: "ITEM_DELETED",
                details: `Deleted raw item: ${usageCheck.name} (${id})`
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete raw item:", error);
        return NextResponse.json({ error: "Failed to delete raw item" }, { status: 500 });
    }
}
