"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";
import { ImagePreview } from "@/components/ui/image-preview";
import { ImageUploader } from "@/components/ui/image-uploader";

export default function KitsInventoryPage() {
    const [kits, setKits] = useState<any[]>([]);
    const [rawItems, setRawItems] = useState<any[]>([]);
    const [isCreateKitOpen, setIsCreateKitOpen] = useState(false);

    // Form state
    const [newKit, setNewKit] = useState({ name: "", imageUrl: "", baseSalePrice: 0 });
    const [bomItems, setBomItems] = useState<{ rawItemId: string, quantity: number }[]>([]);
    const [draftBomItem, setDraftBomItem] = useState({ rawItemId: "", quantity: 1 });
    const [comboOpen, setComboOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingKitId, setEditingKitId] = useState<string | null>(null);

    const fetchData = () => {
        fetch("/api/kits").then(res => res.json()).then(setKits);
    };

    useEffect(() => {
        fetchData();
        fetch("/api/raw-items").then(res => res.json()).then(setRawItems);
    }, []);

    const handleCreateKit = async () => {
        if (!newKit.name || bomItems.length === 0) {
            alert("Name and at least one BOM item are required.");
            return;
        }

        const url = isEditMode && editingKitId ? `/api/kits/${editingKitId}` : "/api/kits";
        const method = isEditMode ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...newKit,
                bomItems
            })
        });

        if (res.ok) {
            setIsCreateKitOpen(false);
            setNewKit({ name: "", imageUrl: "", baseSalePrice: 0 });
            setBomItems([]);
            setIsEditMode(false);
            setEditingKitId(null);
            fetchData();
        } else {
            alert("Failed to save kit");
        }
    };

    const handleEditClick = (kit: any) => {
        setIsEditMode(true);
        setEditingKitId(kit.id);
        setNewKit({ name: kit.name, imageUrl: kit.imageUrl || "", baseSalePrice: kit.baseSalePrice });
        setBomItems(kit.bomItems.map((b: any) => ({ rawItemId: b.rawItemId, quantity: b.quantity })));
        setIsCreateKitOpen(true);
    };

    const handleDeleteClick = async (kitId: string) => {
        if (!confirm("Are you sure? Any assembled units will automatically be disassembled and returned to raw stock.")) return;
        const res = await fetch(`/api/kits/${kitId}`, { method: 'DELETE' });
        if (res.ok) {
            fetchData();
        } else {
            alert("Failed to delete kit");
        }
    };

    const calculatedBomCost = bomItems.reduce((acc, current) => {
        const rawItem = rawItems.find(r => r.id === current.rawItemId);
        return acc + (current.quantity * (rawItem?.movingAverageCost || 0));
    }, 0);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Kits Inventory</h1>
                <Dialog open={isCreateKitOpen} onOpenChange={(val) => {
                    setIsCreateKitOpen(val);
                    if (!val) {
                        setIsEditMode(false);
                        setEditingKitId(null);
                        setNewKit({ name: "", imageUrl: "", baseSalePrice: 0 });
                        setBomItems([]);
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button>Create New Kit (BOM)</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{isEditMode ? "Edit Kit" : "Define New Kit Config (BOM)"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-6 py-6 border-b">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label>Kit Name</Label>
                                    <Input value={newKit.name} onChange={e => setNewKit(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. VIP Table Setup" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Image (Optional)</Label>
                                <ImageUploader value={newKit.imageUrl} onChange={url => setNewKit(prev => ({ ...prev, imageUrl: url }))} />
                            </div>

                            <div className="border rounded p-4 space-y-4">
                                <h4 className="font-semibold text-sm">Bill of Materials (BOM)</h4>
                                {bomItems.length === 0 && <span className="text-xs text-muted-foreground">No components added yet.</span>}
                                {bomItems.map((bi, idx) => {
                                    const itemDef = rawItems.find(r => r.id === bi.rawItemId);
                                    return (
                                        <div key={idx} className="flex gap-3 items-center text-sm bg-muted p-2 rounded border">
                                            <div className="w-8 h-8 rounded bg-background flex-shrink-0 border overflow-hidden relative">
                                                {itemDef?.imageUrl ? <ImagePreview src={itemDef.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={itemDef.name} /> : <div className="text-[8px] w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/30">N/A</div>}
                                            </div>
                                            <span className="flex-1 font-medium">{itemDef?.name || 'Unknown'}</span>
                                            <Input
                                                type="number"
                                                value={bi.quantity}
                                                onChange={e => {
                                                    const newQty = parseFloat(e.target.value) || 0;
                                                    setBomItems(prev => prev.map((p, i) => i === idx ? { ...p, quantity: newQty } : p));
                                                }}
                                                className="w-20 h-8 text-center text-xs font-medium"
                                                min={1}
                                            />
                                            <Button variant="ghost" size="sm" onClick={() => setBomItems(prev => prev.filter((_, i) => i !== idx))}>X</Button>
                                        </div>
                                    );
                                })}

                                <div className="flex gap-2 items-end pt-2 border-t mt-2">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-xs">Raw Material Search</Label>
                                        <Popover open={comboOpen} onOpenChange={setComboOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={comboOpen}
                                                    className="w-full justify-between h-9 px-3"
                                                >
                                                    {draftBomItem.rawItemId
                                                        ? <span className="truncate">{rawItems.find((item) => item.id === draftBomItem.rawItemId)?.name}</span>
                                                        : <span className="text-muted-foreground font-normal">Select material...</span>}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] md:w-[400px] p-0 shadow-lg border" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search by name or category..." className="h-9" />
                                                    <CommandList>
                                                        <CommandEmpty>No material found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {rawItems
                                                                .filter(item => !bomItems.some(b => b.rawItemId === item.id))
                                                                .map((item) => (
                                                                    <CommandItem
                                                                        key={item.id}
                                                                        value={`${item.name} ${item.category?.name || ''}`}
                                                                        onSelect={() => {
                                                                            setDraftBomItem(prev => ({ ...prev, rawItemId: item.id }));
                                                                            setComboOpen(false);
                                                                        }}
                                                                        className="flex items-center gap-3 w-full cursor-pointer py-2"
                                                                    >
                                                                        <div className="w-8 h-8 rounded bg-muted flex-shrink-0 border overflow-hidden relative">
                                                                            {item.imageUrl ? <ImagePreview src={item.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={item.name} /> : <div className="text-[8px] w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/30">N/A</div>}
                                                                        </div>
                                                                        <span className="flex-1 font-medium">{item.name}</span>
                                                                        {item.category && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase font-bold whitespace-nowrap">{item.category.name}</span>}
                                                                    </CommandItem>
                                                                ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <Label className="text-xs">Required Qty</Label>
                                        <Input type="number" value={draftBomItem.quantity} onChange={e => setDraftBomItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))} />
                                    </div>
                                    <Button
                                        variant="secondary"
                                        type="button"
                                        disabled={!draftBomItem.rawItemId || draftBomItem.quantity <= 0}
                                        onClick={() => {
                                            setBomItems(prev => {
                                                const existing = prev.find(p => p.rawItemId === draftBomItem.rawItemId);
                                                if (existing) {
                                                    return prev.map(p => p === existing ? { ...p, quantity: p.quantity + draftBomItem.quantity } : p);
                                                }
                                                return [...prev, draftBomItem];
                                            });
                                            setDraftBomItem({ rawItemId: "", quantity: 1 });
                                        }}
                                    >
                                        Add Component
                                    </Button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg">
                                <span className="font-semibold text-sm">Calculated BOM Cost:</span>
                                <span className="font-mono text-lg font-bold">${calculatedBomCost.toFixed(2)}</span>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateKit}>{isEditMode ? "Save Changes" : "Save Kit Definition"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Assembled Kits</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kit Config</TableHead>
                                <TableHead>Base Bill of Materials (BOM)</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Net Cost</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Formula Retail Price</TableHead>
                                <TableHead className="text-right">Current Stock</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {kits.map((kit) => (
                                <TableRow key={kit.id} className="align-middle">
                                    <TableCell>
                                        <div className="flex flex-col gap-2 min-w-[120px]">
                                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg bg-muted flex-shrink-0 border overflow-hidden shadow-sm">
                                                {kit.imageUrl ? <ImagePreview src={kit.imageUrl} className="w-full h-full object-cover transition-transform hover:scale-105" alt={kit.name} /> : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-secondary/30">N/A</div>}
                                            </div>
                                            <div className="flex flex-col mt-1">
                                                <span className="font-bold text-lg">{kit.name}</span>
                                                <span className="text-[9px] font-mono text-muted-foreground">{kit.id.split('-')[0]}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-2">
                                            {kit.bomItems?.map((bom: any) => {
                                                const unitCost = bom.rawItem?.movingAverageCost || 0;
                                                const rowCost = bom.quantity * unitCost;
                                                return (
                                                    <div key={bom.id} className="flex justify-between items-center text-sm bg-muted/40 p-2 rounded border gap-4">
                                                        <span className="font-medium whitespace-nowrap pr-8">
                                                            {bom.quantity}x {bom.rawItem?.name || 'Unknown'}
                                                        </span>
                                                        <div className="flex flex-col items-end text-xs whitespace-nowrap">
                                                            <span className="font-mono text-muted-foreground">${unitCost.toFixed(2)} ea</span>
                                                            <span className="font-mono font-semibold">${rowCost.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right align-middle">
                                        <span className="font-mono text-lg font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                            ${(kit.calculatedCost || 0).toFixed(2)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right align-middle">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="font-mono text-xl font-bold text-primary">
                                                ${kit.baseSalePrice.toFixed(2)}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">Auto-calc: CEIL(ROUNDUP(Cost*2), 5)</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right align-middle">
                                        <span className={`font-bold inline-block px-3 py-1.5 rounded-full text-xs ${kit.currentStock > 0 ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                            {kit.currentStock} assembled
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right align-middle">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEditClick(kit)}>Edit</Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(kit.id)}>Delete</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {kits.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                        No kits define yet. Create a BOM to begin.
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
