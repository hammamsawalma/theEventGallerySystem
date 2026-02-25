"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, PackageCheck, AlertCircle } from "lucide-react";

export function PurchasesListClient({ initialPurchases }: { initialPurchases: any[] }) {
    const [purchases, setPurchases] = useState(initialPurchases);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [isCompleting, setIsCompleting] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const handleMarkCompleted = async (id: string) => {
        if (!confirm("Are you sure you want to mark this purchase as Received? This will inject the quantities into your physical stock and update your moving average cost.")) {
            return;
        }

        setIsCompleting(id);
        try {
            const res = await fetch(`/api/purchases/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "COMPLETED" })
            });

            if (res.ok) {
                // Instantly update UI without full refresh
                setPurchases(prev => prev.map(p => p.id === id ? { ...p, status: "COMPLETED" } : p));
                alert("Purchase Order Received & Stock Updated.");
            } else {
                const err = await res.text();
                console.error("Failed to mark completed:", err);
                alert("Failed to mark purchase as completed.");
            }
        } finally {
            setIsCompleting(null);
        }
    };

    return (
        <Card>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                    {purchases.map((purchase) => {
                        const isExpanded = expandedIds.has(purchase.id);
                        const itemTotal = purchase.items.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice), 0);
                        const grandTotal = itemTotal + purchase.landedCost;

                        return (
                            <Card key={purchase.id} className={`flex flex-col overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-primary/50 shadow-md' : 'hover:shadow-md'}`}>
                                <div className="p-4 bg-muted/30 border-b cursor-pointer flex justify-between items-start" onClick={() => toggleExpand(purchase.id)}>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-sm uppercase">{purchase.id.split('-')[0]}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${purchase.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800 flex items-center gap-1 w-max'}`}>
                                                {purchase.status === 'PENDING' && <AlertCircle className="w-3 h-3" />}
                                                {purchase.status}
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{format(new Date(purchase.date), "MMM d, yyyy")}</span>
                                        <div className="text-sm font-medium mt-1">
                                            {purchase.supplier ? purchase.supplier : <span className="text-muted-foreground italic text-xs">Unknown Supplier</span>}
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                                </div>

                                <CardContent className={`p-0 flex-col ${isExpanded ? 'flex' : 'hidden'}`}>
                                    <div className="p-4 bg-background">
                                        {purchase.notes && (
                                            <div className="bg-muted/30 rounded p-2 mb-3 border text-xs">
                                                <span className="font-bold text-[9px] uppercase text-muted-foreground block mb-0.5">Order Notes</span>
                                                {purchase.notes}
                                            </div>
                                        )}

                                        <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Line Items</h4>
                                        <div className="flex flex-col gap-2 mb-4">
                                            {purchase.items.map((line: any) => (
                                                <div key={line.id} className="flex justify-between items-center text-xs bg-muted/20 p-2 rounded border">
                                                    <span className="font-medium flex-1 truncate pr-2">{line.quantity}x {line.rawItem.name}</span>
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-mono text-[9px] text-muted-foreground">${line.unitPrice.toFixed(2)}/u</span>
                                                        <span className="font-mono font-semibold">${(line.quantity * line.unitPrice).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {purchase.items.length === 0 && (
                                                <span className="text-center text-muted-foreground py-2 text-xs">No items found.</span>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1 border-t pt-2 mt-2">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Material Cost:</span>
                                                <span className="font-mono">${itemTotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Landed Cost:</span>
                                                <span className="font-mono">${purchase.landedCost.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm font-bold mt-1">
                                                <span>Total Payout:</span>
                                                <span className="font-mono">${grandTotal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>

                                <div className="mt-auto p-3 border-t bg-muted/10">
                                    {purchase.status === 'PENDING' ? (
                                        <Button size="sm" className="w-full text-xs" onClick={(e) => { e.stopPropagation(); handleMarkCompleted(purchase.id); }} disabled={isCompleting === purchase.id}>
                                            <PackageCheck className="w-4 h-4 mr-1.5" />
                                            {isCompleting === purchase.id ? "Receiving..." : "Mark Received"}
                                        </Button>
                                    ) : (
                                        <div className="text-center py-1.5 px-3 rounded-md text-xs font-bold text-green-700 bg-green-50 border border-green-200">
                                            Stock Updated
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}

                    {purchases.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground">
                            No purchase history found.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
