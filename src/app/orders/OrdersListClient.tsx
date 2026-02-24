"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ImagePreview } from "@/components/ui/image-preview";
import { Trash2, Edit2, Loader2, Download } from "lucide-react";
import { generateInvoicePDF } from "@/lib/pdfGenerator";

export function OrdersListClient({ initialSales, rawItemsMap, kitsMap }: { initialSales: any[], rawItemsMap: any, kitsMap: any }) {
    const [sales, setSales] = useState(initialSales);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

    const handleDelete = async (saleId: string) => {
        if (!confirm("Are you sure you want to delete this order? All inventory stock will be restored automatically.")) return;

        setDeletingId(saleId);
        try {
            const res = await fetch(`/api/sales/${saleId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setSales(prev => prev.filter(s => s.id !== saleId));
                alert("Order deleted and inventory restored.");
            } else {
                const err = await res.json();
                alert(err.error || "Failed to delete order");
            }
        } catch (e) {
            console.error(e);
            alert("Delete failed");
        } finally {
            setDeletingId(null);
        }
    };

    const handleEdit = (sale: any) => {
        // Because editing an order is complex (changing qty means recalculating stock differences),
        // the safest POS approach is to delete the order (restoring stock) and pre-fill the POS cart 
        // with the old items so the user can checkout again.

        // Save the old order to local storage so the POS page can pick it up
        localStorage.setItem("editOrderDraft", JSON.stringify(sale));
        localStorage.setItem("editOrderId", sale.id);

        router.push("/sales?edit=true");
    };

    return (
        <div className="flex flex-col gap-6 h-full p-2">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Orders History</h1>
                <p className="text-muted-foreground mt-2">View and manage all past sales transactions and custom order details.</p>
            </div>

            <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                    <CardTitle>All Completed Sales</CardTitle>
                    <CardDescription>Review itemized order histories and gross totals.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background shadow-sm border-b z-10">
                            <TableRow>
                                <TableHead className="w-[100px]">Order ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Line Items & Customizations</TableHead>
                                <TableHead className="text-right">Gross Total</TableHead>
                                <TableHead className="text-center w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sales.map((sale) => (
                                <TableRow key={sale.id} className="align-top">
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        #{sale.id.split('-')[0]}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {new Date(sale.date).toLocaleDateString()} <br />
                                        <span className="text-xs text-muted-foreground">{new Date(sale.date).toLocaleTimeString()}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-semibold">{sale.customer?.name}</div>
                                        <div className="text-xs text-muted-foreground">{sale.customer?.phone}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-3 py-1">
                                            {sale.items.map((lineItem: any) => {
                                                const itemDef = lineItem.itemType === 'KIT' ? kitsMap[lineItem.itemId] : lineItem.itemType === 'RAW_ITEM' ? rawItemsMap[lineItem.itemId] : null;

                                                return (
                                                    <div key={lineItem.id} className="text-sm bg-muted/50 p-2 rounded-md border text-foreground/90 flex gap-3">
                                                        <div className="w-10 h-10 rounded bg-muted flex-shrink-0 border overflow-hidden relative">
                                                            {itemDef?.imageUrl ? <ImagePreview src={itemDef.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={itemDef?.name || 'Item'} /> : <div className="text-[10px] w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/30">N/A</div>}
                                                        </div>
                                                        <div className="flex-1 flex flex-col justify-center">
                                                            <div className="flex justify-between font-medium mb-1 items-start">
                                                                <div className="flex flex-col">
                                                                    <span>
                                                                        {lineItem.quantity}x {itemDef?.name || lineItem.description || 'Custom Fee'}
                                                                        {lineItem.itemType === 'KIT' && <span className="ml-2 text-[9px] bg-secondary px-1.5 py-0.5 rounded-full uppercase font-bold text-secondary-foreground">KIT</span>}
                                                                        {lineItem.itemType === 'RAW_ITEM' && <span className="ml-2 text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase font-bold">{itemDef?.category?.name || 'RAW'}</span>}
                                                                        {lineItem.itemType === 'CUSTOM' && <span className="ml-2 text-[9px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full uppercase font-bold text-center">FEE</span>}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground">{lineItem.itemType !== 'CUSTOM' ? lineItem.itemId : 'Custom Row'}</span>
                                                                </div>
                                                                <span>${(lineItem.unitPrice * lineItem.quantity).toFixed(2)}</span>
                                                            </div>

                                                            {lineItem.customizations.length > 0 && (
                                                                <div className="pl-3 border-l-2 border-primary/20 text-xs mt-1 space-y-2">
                                                                    {lineItem.customizations.map((custom: any) => {
                                                                        const customDef = rawItemsMap[custom.rawItemId];
                                                                        return (
                                                                            <div key={custom.id} className="flex justify-between text-muted-foreground items-center">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-5 h-5 rounded bg-muted flex-shrink-0 border overflow-hidden relative">
                                                                                        {customDef?.imageUrl ? <ImagePreview src={customDef.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={customDef.name} /> : <div className="text-[8px] w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/30">N/A</div>}
                                                                                    </div>
                                                                                    <span>+ {custom.quantityAdded}x {customDef?.name || 'Unknown Customization'}</span>
                                                                                </div>
                                                                                <span>+${(custom.extraPrice * custom.quantityAdded).toFixed(2)}</span>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-lg">
                                        ${sale.totalAmount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => generateInvoicePDF(sale, kitsMap, rawItemsMap)} title="Download Invoice PDF">
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(sale)} title="Edit Order">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(sale.id)} disabled={deletingId === sale.id} title="Delete Order">
                                                {deletingId === sale.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {sales.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                                        No orders have been recorded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
