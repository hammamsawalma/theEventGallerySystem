import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const { kitId, quantity } = await request.json();

        if (!kitId || !quantity || quantity <= 0) {
            return NextResponse.json({ error: "Invalid kit or quantity" }, { status: 400 });
        }

        // Retrieve kit and check its stock
        const kit = await prisma.kit.findUnique({
            where: { id: kitId },
            include: { bomItems: true }
        });

        if (!kit) {
            return NextResponse.json({ error: "Kit not found" }, { status: 404 });
        }

        if (kit.currentStock < quantity) {
            return NextResponse.json({ error: `Insufficient assembled stock. Cannot disassemble ${quantity}.` }, { status: 400 });
        }

        // Execute disassembly in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Decrement Kit Stock
            await tx.kit.update({
                where: { id: kitId },
                data: { currentStock: kit.currentStock - quantity }
            });

            // 2. Increment Raw Item Stocks mathematically based on BOM
            for (const bom of kit.bomItems) {
                const recoveredAmount = bom.quantity * quantity;

                // Fetch current raw item stock inside transaction to ensure atomicity
                const currentRaw = await tx.rawItem.findUnique({ where: { id: bom.rawItemId } });
                if (currentRaw) {
                    await tx.rawItem.update({
                        where: { id: bom.rawItemId },
                        data: { currentStock: currentRaw.currentStock + recoveredAmount }
                    });
                }
            }

            // 3. Log the action (if SystemLog expects these parameters in your schema)
            await tx.systemLog.create({
                data: {
                    userId: "system", // Generic since no auth yet
                    action: "DISASSEMBLED_KIT",
                    details: `Disassembled ${quantity} x Kit (${kit.name}) back into raw stock.`
                }
            });

            return true;
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Disassembly failed:", error);
        return NextResponse.json({ error: error.message || "Failed to disassemble kit" }, { status: 500 });
    }
}
