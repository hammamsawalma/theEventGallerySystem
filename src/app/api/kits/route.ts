import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const kits = await prisma.kit.findMany({
            include: {
                bomItems: {
                    include: {
                        rawItem: {
                            include: { category: true }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        const mappedKits = kits.map(kit => {
            const cost = kit.bomItems.reduce((sum, bom) => sum + (bom.quantity * (bom.rawItem?.movingAverageCost || 0)), 0);
            const calculatedRetail = Math.ceil(Math.ceil(cost * 2) / 5) * 5;
            return {
                ...kit,
                calculatedCost: cost,
                baseSalePrice: calculatedRetail > 0 ? calculatedRetail : kit.baseSalePrice // fallback if 0
            };
        });

        return NextResponse.json(mappedKits);
    } catch (error) {
        console.error("Failed to fetch kits:", error);
        return NextResponse.json({ error: "Failed to fetch kits" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, imageUrl, baseSalePrice, bomItems } = body;
        // bomItems should be array of { rawItemId, quantity }

        const kit = await prisma.kit.create({
            data: {
                name,
                imageUrl,
                baseSalePrice,
                bomItems: {
                    create: bomItems.map((item: any) => ({
                        rawItemId: item.rawItemId,
                        quantity: item.quantity,
                    }))
                }
            },
            include: { bomItems: true }
        });

        return NextResponse.json(kit);
    } catch (error) {
        console.error("Failed to create kit:", error);
        return NextResponse.json({ error: "Failed to create kit" }, { status: 500 });
    }
}
