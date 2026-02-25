"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePreview } from "@/components/ui/image-preview";

export default function ManufacturingPage() {
    const [kits, setKits] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [disassembling, setDisassembling] = useState(false);
    const [buildQuantities, setBuildQuantities] = useState<{ [key: string]: number }>({});
    const [disassembleQuantities, setDisassembleQuantities] = useState<{ [key: string]: number }>({});
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchKits();
    }, []);

    const fetchKits = () => {
        fetch("/api/kits").then(res => res.json()).then(setKits);
    };

    const calculateMaxBuilds = (bomItems: any[]) => {
        if (!bomItems || bomItems.length === 0) return 0;

        let maxBuilds = Infinity;
        for (const bom of bomItems) {
            if (!bom.rawItem) continue;
            const possibleWithThisItem = Math.floor(bom.rawItem.currentStock / bom.quantity);
            if (possibleWithThisItem < maxBuilds) {
                maxBuilds = possibleWithThisItem;
            }
        }

        return maxBuilds === Infinity ? 0 : maxBuilds;
    };

    const handleBuild = async (kitId: string) => {
        const qty = buildQuantities[kitId];
        if (!qty || qty <= 0) return;

        setLoading(true);
        try {
            const res = await fetch("/api/kits/assemble", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kitId, quantityToBuild: qty }),
            });

            if (!res.ok) {
                const err = await res.json();
                alert("Error building kit: " + (err.error || "Unknown"));
            } else {
                alert("Successfully assembled " + qty + " kits!");
                setBuildQuantities({ ...buildQuantities, [kitId]: 0 });
                fetchKits(); // Refresh stock
            }
        } catch (e) {
            console.error(e);
            alert("Failed to connect to assembly service.");
        }
        setLoading(false);
    };

    const handleDisassemble = async (kitId: string) => {
        const qty = disassembleQuantities[kitId];
        if (!qty || qty <= 0) return;

        if (!confirm(`Are you sure you want to disassemble ${qty} units? This will deduct from the kit stock and permanently return the parts to Raw Materials.`)) return;

        setDisassembling(true);
        try {
            const res = await fetch("/api/kits/disassemble", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kitId, quantity: qty }),
            });

            if (!res.ok) {
                const err = await res.json();
                alert("Error disassembling kit: " + (err.error || "Unknown"));
            } else {
                alert("Successfully disassembled " + qty + " kits! Parts restored to inventory.");
                setDisassembleQuantities({ ...disassembleQuantities, [kitId]: 0 });
                fetchKits(); // Refresh stock
            }
        } catch (e) {
            console.error(e);
            alert("Failed to connect to disassembly service.");
        }
        setDisassembling(false);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Smart Assembly Workflow</h1>
                    <p className="text-muted-foreground mt-2">Deduct raw materials automatically based on the Kit BOMs and your desired build quantity.</p>
                </div>
                <div className="w-full md:w-72">
                    <Input placeholder="Search kits by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
                {kits.filter(k => k.name.toLowerCase().includes(searchQuery.toLowerCase())).map(kit => {
                    const maxBuilds = calculateMaxBuilds(kit.bomItems);

                    return (
                        <Card key={kit.id} className="flex flex-col overflow-hidden max-h-[500px]">
                            <CardHeader className="p-0 border-b relative h-20 shrink-0">
                                <div className="absolute inset-0 z-0">
                                    {kit.imageUrl ? <ImagePreview src={kit.imageUrl} className="object-cover w-full h-full opacity-40 hover:opacity-75 transition-opacity" alt={kit.name} /> : <div className="text-xs w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/30">N/A</div>}
                                </div>
                                <div className="absolute bottom-1 left-2 right-2 flex justify-between items-end z-10 p-1">
                                    <h3 className="text-sm font-bold bg-background/90 backdrop-blur rounded px-1.5 py-0.5 shadow-sm leading-tight max-w-[70%] truncate">{kit.name}</h3>
                                    <span className="text-[10px] font-black bg-background/90 text-primary backdrop-blur rounded px-1.5 py-0.5 shadow-sm border">Stock: {kit.currentStock}</span>
                                </div>
                            </CardHeader>

                            <CardContent className="p-3 flex-1 flex flex-col overflow-hidden">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 shrink-0">BOM Status</h4>
                                <div className="flex flex-col gap-1 overflow-y-auto pr-1 min-h-[60px]">
                                    {kit.bomItems?.map((bom: any) => {
                                        const hasEnoughForOne = bom.rawItem?.currentStock >= bom.quantity;
                                        return (
                                            <div key={bom.id} className="flex justify-between items-center bg-muted/30 p-1.5 rounded border border-border/50">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="w-5 h-5 rounded bg-background flex-shrink-0 border overflow-hidden relative">
                                                        {bom.rawItem?.imageUrl ? <ImagePreview src={bom.rawItem.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={bom.rawItem?.name || ''} /> : <div className="text-[6px] font-bold w-full h-full flex items-center justify-center text-muted-foreground/50 bg-secondary/30">IMG</div>}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-semibold text-[10px] truncate">{bom.quantity}x {bom.rawItem?.name || ''}</span>
                                                    </div>
                                                </div>
                                                <span className={hasEnoughForOne ? "text-green-600 font-bold text-[9px] bg-green-500/10 px-1 py-0.5 rounded text-right shrink-0" : "text-red-500 font-bold text-[9px] bg-red-500/10 px-1 py-0.5 rounded text-right shrink-0"}>
                                                    {bom.rawItem?.currentStock.toFixed(1)} avl
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-2 border-t pt-2 bg-muted/10 p-3 shrink-0">
                                <div className="w-full flex justify-between items-center text-xs pb-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Max Build capacity</span>
                                    <span className="text-sm font-black text-primary">{maxBuilds}</span>
                                </div>

                                <div className="flex flex-col gap-2 w-full">
                                    <div className="flex items-center gap-2 p-1.5 bg-primary/5 rounded border border-primary/20">
                                        <div className="flex flex-col justify-center px-1 w-14 shrink-0">
                                            <span className="text-[8px] uppercase font-black text-primary leading-none text-center">Build</span>
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="Qty"
                                            min="1"
                                            max={maxBuilds}
                                            value={buildQuantities[kit.id] || ''}
                                            onChange={e => setBuildQuantities({ ...buildQuantities, [kit.id]: parseInt(e.target.value, 10) })}
                                            className="h-7 text-xs border-primary/20 w-16 px-1.5 text-center shrink-0 min-w-[3rem]"
                                            disabled={maxBuilds === 0}
                                        />
                                        <Button
                                            size="sm"
                                            className="h-7 flex-1 min-w-0 text-xs font-bold px-2 whitespace-nowrap overflow-hidden text-ellipsis"
                                            onClick={() => handleBuild(kit.id)}
                                            disabled={loading || maxBuilds === 0 || !buildQuantities[kit.id]}
                                        >
                                            DO IT
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-2 p-1.5 bg-amber-500/5 rounded border border-amber-500/20">
                                        <div className="flex flex-col justify-center px-1 w-14 shrink-0">
                                            <span className="text-[8px] uppercase font-black text-amber-600 leading-none text-center">Break</span>
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="Qty"
                                            min="1"
                                            max={kit.currentStock}
                                            value={disassembleQuantities[kit.id] || ''}
                                            onChange={e => setDisassembleQuantities({ ...disassembleQuantities, [kit.id]: parseInt(e.target.value, 10) })}
                                            className="h-7 text-xs border-amber-500/20 focus-visible:ring-amber-500 w-16 px-1.5 text-center shrink-0 min-w-[3rem]"
                                            disabled={kit.currentStock === 0}
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 flex-1 min-w-0 text-xs font-bold px-2 text-amber-600 border-amber-500/30 hover:bg-amber-50 whitespace-nowrap overflow-hidden text-ellipsis"
                                            onClick={() => handleDisassemble(kit.id)}
                                            disabled={disassembling || kit.currentStock === 0 || !disassembleQuantities[kit.id]}
                                        >
                                            DOWN
                                        </Button>
                                    </div>
                                </div>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
