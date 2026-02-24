import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const categories = await prisma.expenseCategory.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(categories);
    } catch (error) {
        console.error("Failed to fetch expense categories:", error);
        return NextResponse.json({ error: "Failed to fetch expense categories" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name } = await request.json();
        const category = await prisma.expenseCategory.create({
            data: { name }
        });
        return NextResponse.json(category);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }
}
