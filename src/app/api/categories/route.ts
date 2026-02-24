import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(categories);
    } catch (error) {
        console.error("Failed to fetch categories:", error);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: "Category name is required" }, { status: 400 });
        }

        const newCategory = await prisma.category.create({
            data: {
                name: name.trim()
            }
        });

        return NextResponse.json(newCategory);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "A category with this name already exists" }, { status: 400 });
        }
        console.error("Failed to create category:", error);
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }
}
