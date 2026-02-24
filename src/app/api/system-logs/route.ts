import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limitParams = searchParams.get('limit');
        const limit = limitParams ? parseInt(limitParams, 10) : 50;

        const logs = await prisma.systemLog.findMany({
            orderBy: { date: "desc" },
            take: limit,
        });

        return NextResponse.json(logs);
    } catch (error) {
        console.error("Failed to fetch logs:", error);
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}
