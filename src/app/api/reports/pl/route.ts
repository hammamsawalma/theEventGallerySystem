import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        const dateFilter: any = {};
        if (startDateParam) dateFilter.gte = new Date(startDateParam);
        if (endDateParam) dateFilter.lte = new Date(endDateParam);

        const saleFilter = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};
        const expenseFilter = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};
        const purchaseFilter = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

        // 1. Total Sales & COGS
        const sales = await prisma.sale.findMany({
            where: saleFilter,
            include: { items: true }
        });

        let totalSales = 0;
        let costOfGoodsSold = 0;

        for (const sale of sales) {
            totalSales += sale.totalAmount;
            for (const item of sale.items) {
                costOfGoodsSold += (item.unitCostAtSale * item.quantity);
            }
        }

        const grossProfit = totalSales - costOfGoodsSold;

        // 2. Expenses
        const expensesAgg = await prisma.expense.aggregate({
            where: expenseFilter,
            _sum: { amount: true }
        });
        const totalExpenses = expensesAgg._sum.amount || 0;

        // 3. Net Profit
        const netProfit = grossProfit - totalExpenses;

        // 4. Total Purchases (for reference)
        const purchases = await prisma.purchase.findMany({
            where: { ...purchaseFilter, status: 'COMPLETED' },
            include: { items: true }
        });

        let totalPurchases = 0;
        for (const purchase of purchases) {
            totalPurchases += purchase.landedCost;
            for (const item of purchase.items) {
                totalPurchases += (item.quantity * item.unitPrice);
            }
        }

        return NextResponse.json({
            totalSales,
            costOfGoodsSold,
            grossProfit,
            totalExpenses,
            netProfit,
            totalPurchases // informative, usually not part of Net Profit calc directly in this system since we use COGS
        });
    } catch (error) {
        console.error("Failed to generate P&L:", error);
        return NextResponse.json({ error: "Failed to generate P&L report" }, { status: 500 });
    }
}
