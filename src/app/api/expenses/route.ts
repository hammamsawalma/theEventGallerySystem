import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const expenses = await prisma.expense.findMany({
            include: { category: true },
            orderBy: { date: "desc" }
        });
        return NextResponse.json(expenses);
    } catch (error) {
        console.error("Failed to fetch expenses:", error);
        return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { categoryId, amount, description, date } = await request.json();

        if (!categoryId || !amount) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const expense = await prisma.expense.create({
            data: {
                categoryId,
                amount,
                description: description || "",
                date: date ? new Date(date) : undefined
            },
            include: { category: true }
        });

        return NextResponse.json(expense);
    } catch (error) {
        console.error("Failed to create expense:", error);
        return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
    }
}
