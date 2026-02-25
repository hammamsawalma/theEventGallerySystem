import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rentals/availability?rentalItemId=xxx&startDate=xxx&endDate=xxx
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const rentalItemId = searchParams.get('rentalItemId');
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');

        if (!rentalItemId || !startDateStr || !endDateStr) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const requestedStart = new Date(startDateStr);
        const requestedEnd = new Date(endDateStr);

        // Sanity Check
        if (requestedEnd < requestedStart) {
            return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
        }

        // 1. Get the Rental Item total stock
        const rentalItem = await prisma.rentalItem.findUnique({
            where: { id: rentalItemId }
        });

        if (!rentalItem) {
            return NextResponse.json({ error: "Rental item not found" }, { status: 404 });
        }

        const totalStock = rentalItem.totalStock;

        // 2. Find ALL active (not returned) sales line items for this rental item
        // that OVERLAP with the requested date range.
        const overlappingBookings = await prisma.saleLineItem.findMany({
            where: {
                itemType: 'RENTAL',
                rentalItemId: rentalItemId,
                isReturned: false,
                // Overlap condition:
                // (ExistingStart <= RequestedEnd) AND (ExistingEnd >= RequestedStart)
                rentalStartDate: { lte: requestedEnd },
                rentalEndDate: { gte: requestedStart }
            },
            select: {
                rentalStartDate: true,
                rentalEndDate: true,
                quantity: true
            }
        });

        // 3. Mathematical Overlap Logic (Day-by-Day Peak Usage)
        // To find the maximum concurrent usage during the requested period,
        // we map out the usage for every single day in the requested range.

        let maxConcurrentUsage = 0;

        // Normalize dates to start of day for comparison
        const startDay = new Date(requestedStart);
        startDay.setHours(0, 0, 0, 0);
        const endDay = new Date(requestedEnd);
        endDay.setHours(0, 0, 0, 0);

        for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
            let currentDayUsage = 0;
            const currentDayTime = d.getTime();

            for (const booking of overlappingBookings) {
                if (!booking.rentalStartDate || !booking.rentalEndDate) continue;

                const bStart = new Date(booking.rentalStartDate);
                bStart.setHours(0, 0, 0, 0);
                const bEnd = new Date(booking.rentalEndDate);
                bEnd.setHours(23, 59, 59, 999); // Full end day

                if (currentDayTime >= bStart.getTime() && currentDayTime <= bEnd.getTime()) {
                    currentDayUsage += booking.quantity;
                }
            }

            if (currentDayUsage > maxConcurrentUsage) {
                maxConcurrentUsage = currentDayUsage;
            }
        }

        const availableStock = totalStock - maxConcurrentUsage;

        return NextResponse.json({
            rentalItemId,
            totalStock,
            maxConcurrentUsage,
            availableStock: Math.max(0, availableStock),
            requestedStart,
            requestedEnd
        });

    } catch (error) {
        console.error("Failed to calculate rental availability:", error);
        return NextResponse.json({ error: "Failed to calculate availability" }, { status: 500 });
    }
}
