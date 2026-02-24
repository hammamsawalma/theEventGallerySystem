"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePreview } from "@/components/ui/image-preview";

export default function ManufacturingPage() {
    const [kits, setKits] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [buildQuantities, setBuildQuantities] = useState<{ [key: string]: number }>({});
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

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {kits.filter(k => k.name.toLowerCase().includes(searchQuery.toLowerCase())).map(kit => {
                    const maxBuilds = calculateMaxBuilds(kit.bomItems);

                    return (
                        <Card key={kit.id} className="flex flex-col overflow-hidden">
                            <CardHeader className="bg-muted pb-4 border-b relative">
                                <div className="absolute inset-0 z-0">
                                    {kit.imageUrl ? <ImagePreview src={kit.imageUrl} className="object-cover w-full h-full opacity-30" alt={kit.name} /> : <div className="text-xs w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/30">N/A</div>}
                                </div>
                                <CardTitle className="flex justify-between items-center text-lg relative z-10 bg-background/80 p-2 rounded backdrop-blur-sm shadow-sm -mt-2 -mx-2">
                                    <span>{kit.name}</span>
                                    <span className="text-sm font-normal text-muted-foreground">Stock: {kit.currentStock}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="py-4 flex-1">
                                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">BOM Shortages/Status:</h4>
                                <div className="flex flex-col gap-2">
                                    {kit.bomItems?.map((bom: any) => {
                                        const hasEnoughForOne = bom.rawItem?.currentStock >= bom.quantity;
                                        return (
                                            <div key={bom.id} className="flex justify-between items-center text-sm bg-muted/40 p-2 rounded border">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-background flex-shrink-0 border overflow-hidden relative">
                                                        {bom.rawItem?.imageUrl ? <ImagePreview src={bom.rawItem.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={bom.rawItem?.name || ''} /> : <div className="text-[8px] w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/30">N/A</div>}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{bom.quantity}x {bom.rawItem?.name || ''}</span>
                                                        {bom.rawItem?.category && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase font-bold w-max mt-1">{bom.rawItem.category.name}</span>}
                                                    </div>
                                                </div>
                                                <span className={hasEnoughForOne ? "text-green-600 font-medium text-xs bg-green-500/10 px-2 py-1 rounded text-right whitespace-nowrap" : "text-red-600 font-bold text-xs bg-red-500/10 px-2 py-1 rounded text-right whitespace-nowrap"}>
                                                    {bom.rawItem?.currentStock.toFixed(1)} avail
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-4 border-t pt-4 bg-muted/30">
                                <div className="w-full text-center">
                                    <p className="text-xs text-muted-foreground">Maximum possible to build right now:</p>
                                    <p className="text-2xl font-bold text-primary">{maxBuilds}</p>
                                </div>

                                <div className="flex w-full gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Qty"
                                        min="1"
                                        max={maxBuilds}
                                        value={buildQuantities[kit.id] || ''}
                                        onChange={e => setBuildQuantities({ ...buildQuantities, [kit.id]: parseInt(e.target.value, 10) })}
                                        className="w-24 border-primary/20"
                                        disabled={maxBuilds === 0}
                                    />
                                    <Button
                                        className="flex-1"
                                        onClick={() => handleBuild(kit.id)}
                                        disabled={loading || maxBuilds === 0 || !buildQuantities[kit.id]}
                                    >
                                        Build Units
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
