import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const rentals = await prisma.rentalItem.findMany({
            include: {
                category: true,
            },
            orderBy: { name: "asc" }
        });
        return NextResponse.json(rentals);
    } catch (error) {
        console.error("Failed to fetch rentals:", error);
        return NextResponse.json({ error: "Failed to fetch rentals" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // Basic validation
        if (!data.name || !data.categoryId || typeof data.dailyPrice !== 'number' || typeof data.totalStock !== 'number') {
            return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
        }

        const rental = await prisma.rentalItem.create({
            data: {
                name: data.name,
                categoryId: data.categoryId,
                dailyPrice: data.dailyPrice,
                totalStock: data.totalStock,
                imageUrl: data.imageUrl || null,
            },
            include: {
                category: true
            }
        });

        // Log the creation
        await prisma.systemLog.create({
            data: {
                userId: 'SYSTEM',
                action: 'RENTAL_CREATED',
                details: `Created new rental item: ${rental.name} (Stock: ${rental.totalStock})`,
            }
        });

        return NextResponse.json(rental);
    } catch (error) {
        console.error("Failed to create rental:", error);
        return NextResponse.json({ error: "Failed to create rental" }, { status: 500 });
    }
}
