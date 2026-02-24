import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { name, imageUrl, baseSalePrice, bomItems } = body;

        // delete existing bom items
        await prisma.kitBOM.deleteMany({
            where: { kitId: id }
        });

        // update kit and recreate bom items
        const updatedKit = await prisma.kit.update({
            where: { id: id },
            data: {
                name,
                imageUrl,
                baseSalePrice,
                bomItems: {
                    create: bomItems.map((item: any) => ({
                        rawItemId: item.rawItemId,
                        quantity: parseFloat(item.quantity)
                    }))
                }
            },
            include: {
                bomItems: {
                    include: { rawItem: { include: { category: true } } }
                }
            }
        });

        return NextResponse.json(updatedKit);
    } catch (error) {
        console.error("Error updating kit:", error);
        return NextResponse.json({ error: "Failed to update kit" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const kit = await prisma.kit.findUnique({
            where: { id: id },
            include: { bomItems: true }
        });

        if (!kit) {
            return NextResponse.json({ error: "Kit not found" }, { status: 404 });
        }

        // Disassemble logic: if currentStock > 0, return materials to raw stock
        if (kit.currentStock > 0) {
            for (const bom of kit.bomItems) {
                const materialsReturned = bom.quantity * kit.currentStock;
                await prisma.rawItem.update({
                    where: { id: bom.rawItemId },
                    data: {
                        currentStock: { increment: materialsReturned }
                    }
                });
            }
        }

        await prisma.kit.delete({
            where: { id: id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting kit:", error);
        return NextResponse.json({ error: "Failed to delete kit" }, { status: 500 });
    }
}
