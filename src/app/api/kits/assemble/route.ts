import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const { kitId, quantityToBuild } = await request.json();

        if (!kitId || !quantityToBuild || quantityToBuild <= 0) {
            return NextResponse.json({ error: "Invalid kit or quantity" }, { status: 400 });
        }

        const kit = await prisma.kit.findUnique({
            where: { id: kitId },
            include: { bomItems: { include: { rawItem: true } } }
        });

        if (!kit) {
            return NextResponse.json({ error: "Kit not found" }, { status: 404 });
        }

        // Wrap the assembly process in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Verify enough raw stock exists
            for (const bom of kit.bomItems) {
                const requiredAmount = bom.quantity * quantityToBuild;
                if (bom.rawItem.currentStock < requiredAmount) {
                    throw new Error(`Insufficient stock for ${bom.rawItem.name}. Need ${requiredAmount}, have ${bom.rawItem.currentStock}`);
                }
            }

            // 2. Deduct raw items
            for (const bom of kit.bomItems) {
                const requiredAmount = bom.quantity * quantityToBuild;
                await tx.rawItem.update({
                    where: { id: bom.rawItem.id },
                    data: { currentStock: { decrement: requiredAmount } }
                });
            }

            // 3. Increment Kit stock
            const updatedKit = await tx.kit.update({
                where: { id: kitId },
                data: { currentStock: { increment: quantityToBuild } },
                include: { bomItems: true }
            });

            // 4. Log the action (Optional: create a separate SystemLog table entry if desired)
            await tx.systemLog.create({
                data: {
                    userId: "SYSTEM_OR_USER_ID", // TODO: Get from auth session in real app
                    action: "ASSEMBLE_KIT",
                    details: `Assembled ${quantityToBuild} of Kit: ${kit.name}`,
                }
            });

            return updatedKit;
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Assembly error:", error);
        return NextResponse.json({ error: error.message || "Failed to assemble kit" }, { status: 400 });
    }
}
