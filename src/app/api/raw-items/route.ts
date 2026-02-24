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
        const { name, imageUrl, isBulk, categoryId } = body;

        const rawItem = await prisma.rawItem.create({
            data: {
                name,
                imageUrl,
                isBulk,
                categoryId,
            }
        });

        return NextResponse.json(rawItem);
    } catch (error) {
        console.error("Failed to create raw item:", error);
        return NextResponse.json({ error: "Failed to create raw item" }, { status: 500 });
    }
}
