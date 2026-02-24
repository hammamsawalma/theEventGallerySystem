import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const sales = await prisma.sale.findMany({
            include: {
                customer: true,
                items: {
                    include: { customizations: true }
                }
            },
            orderBy: { date: 'desc' }
        });
        return NextResponse.json(sales);
    } catch (error) {
        console.error("Failed to fetch sales:", error);
        return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { customerName, customerPhone, items, discountAmount, totalAmount } = body;
        // items: array of { itemType: 'RAW_ITEM' | 'KIT', itemId: string, quantity: number, unitPrice: number, customizations?: { rawItemId: string, quantityAdded: number, extraPrice: number }[] }

        if (!customerName || !customerPhone || !items || items.length === 0) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Get or Create Customer
            let customer = await tx.customer.findUnique({ where: { phone: customerPhone } });
            if (!customer) {
                customer = await tx.customer.create({
                    data: { name: customerName, phone: customerPhone }
                });
            }

            // 2. Process each line item
            for (const item of items) {
                let unitCostAtSale = 0;

                if (item.itemType === 'RAW_ITEM') {
                    // Process individual raw item sale
                    const rawItem = await tx.rawItem.findUnique({ where: { id: item.itemId } });
                    if (!rawItem || rawItem.currentStock < item.quantity) {
                        throw new Error(`Insufficient stock for raw item: ${rawItem?.name || item.itemId}`);
                    }
                    unitCostAtSale = rawItem.movingAverageCost;

                    await tx.rawItem.update({
                        where: { id: rawItem.id },
                        data: { currentStock: { decrement: item.quantity } }
                    });

                } else if (item.itemType === 'KIT') {
                    // Process kit sale
                    const kit = await tx.kit.findUnique({
                        where: { id: item.itemId },
                        include: { bomItems: { include: { rawItem: true } } }
                    });

                    if (!kit || kit.currentStock < item.quantity) {
                        throw new Error(`Insufficient stock for kit: ${kit?.name || item.itemId}`);
                    }

                    // Calculate kit's base MAC cost based on its BOM components at this snapshot in time
                    let kitBaseCost = 0;
                    for (const bom of kit.bomItems) {
                        kitBaseCost += (bom.rawItem.movingAverageCost * bom.quantity);
                    }
                    unitCostAtSale = kitBaseCost;

                    await tx.kit.update({
                        where: { id: kit.id },
                        data: { currentStock: { decrement: item.quantity } }
                    });

                    // Handle Customizations (Extra Raw Items added to this kit order)
                    if (item.customizations && item.customizations.length > 0) {
                        for (const custom of item.customizations) {
                            const extraRawItem = await tx.rawItem.findUnique({ where: { id: custom.rawItemId } });
                            if (!extraRawItem || extraRawItem.currentStock < custom.quantityAdded) {
                                throw new Error(`Insufficient stock for customization item: ${extraRawItem?.name || custom.rawItemId}`);
                            }

                            // Add custom MAC to the unit cost for this specific sale
                            unitCostAtSale += (extraRawItem.movingAverageCost * custom.quantityAdded);

                            // Deduct the extra raw item from stock
                            await tx.rawItem.update({
                                where: { id: extraRawItem.id },
                                data: { currentStock: { decrement: custom.quantityAdded } }
                            });
                        }
                    }
                }

                // Add calculated unitCostAtSale back to the item object for the record
                item.unitCostAtSale = unitCostAtSale;
            }

            // 3. Create the Sale record
            const sale = await tx.sale.create({
                data: {
                    customerId: customer.id,
                    discountAmount: discountAmount || 0,
                    totalAmount: totalAmount,
                    items: {
                        create: items.map((item: any) => ({
                            itemType: item.itemType,
                            itemId: item.itemId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            unitCostAtSale: item.unitCostAtSale,
                            description: item.description || null,
                            isCustomized: item.customizations && item.customizations.length > 0,
                            customizations: item.customizations ? {
                                create: item.customizations.map((custom: any) => ({
                                    rawItemId: custom.rawItemId,
                                    quantityAdded: custom.quantityAdded,
                                    extraPrice: custom.extraPrice
                                }))
                            } : undefined
                        }))
                    }
                },
                include: { items: { include: { customizations: true } }, customer: true }
            });

            // 4. Log it
            await tx.systemLog.create({
                data: {
                    userId: "SYSTEM_OR_USER_ID", // TODO: Auth
                    action: "NEW_SALE",
                    details: `Processed sale ${sale.id} for ${customer.name}`,
                }
            });

            return sale;
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Sales error:", error);
        return NextResponse.json({ error: error.message || "Failed to process sale" }, { status: 400 });
    }
}
