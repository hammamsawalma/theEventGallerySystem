"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";
import { ImagePreview } from "@/components/ui/image-preview";
import { ImageUploader } from "@/components/ui/image-uploader";
export default function RawItemsPage() {
    const [rawItems, setRawItems] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // Add Raw Material State
    const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
    const [newMaterial, setNewMaterial] = useState({ name: "", categoryId: "", imageUrl: "", isBulk: false });
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [addCategoryComboOpen, setAddCategoryComboOpen] = useState(false);

    // Manage/Edit Raw Material State
    const [isManageMaterialOpen, setIsManageMaterialOpen] = useState(false);
    const [manageComboOpen, setManageComboOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<{ id: string, name: string, categoryId: string, imageUrl: string, currentStock: number, movingAverageCost: number, adjustmentReason: string, originalStock: number } | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [manageCategoryComboOpen, setManageCategoryComboOpen] = useState(false);

    // New Purchase Order State
    const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
    const [newPurchase, setNewPurchase] = useState({ status: "COMPLETED", landedCost: 0 });
    const [purchaseItems, setPurchaseItems] = useState<{ rawItemId: string, packs: number, unitsPerPack: number, unitPricePerPack: number }[]>([]);

    // Draft item for the PO form
    const [draftPOItem, setDraftPOItem] = useState({ rawItemId: "", packs: 1, unitsPerPack: 1, unitPricePerPack: 0 });
    const [comboOpenPO, setComboOpenPO] = useState(false);

    const fetchData = () => {
        fetch("/api/raw-items").then(res => res.json()).then(setRawItems);
        fetch("/api/purchases").then(res => res.json()).then(setPurchases);
        // We need a categories endpoint or we can extract unique from rawItems/ Prisma. We don't have a dedicated /api/categories right now, 
        // so we'll fetch them inline if needed, or rely on a new endpoint. Wait, does `/api/categories` exist? Let's check. 
        // We'll create it if it fails, but for now fallback to extracting from rawItems.
    };

    useEffect(() => {
        fetchData();
        fetch("/api/categories").then(res => {
            if (res.ok) return res.json();
            return []; // Fallback empty
        }).then(setCategories).catch(() => setCategories([]));
    }, []);

    const handleAddMaterial = async () => {
        if (!newMaterial.name || !newMaterial.categoryId) {
            alert("Name and Category are required");
            return;
        }
        const res = await fetch("/api/raw-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newMaterial)
        });
        if (res.ok) {
            setIsAddMaterialOpen(false);
            setNewMaterial({ name: "", categoryId: "", imageUrl: "", isBulk: false });
            setIsCreatingCategory(false);
            setNewCategoryName("");
            fetchData();
        } else {
            alert("Failed to add material");
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            const res = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCategoryName })
            });

            if (res.ok) {
                const created = await res.json();
                setCategories(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
                setNewCategoryName("");
                setIsCreatingCategory(false);

                // Automatically select the new category for both forms if active
                if (isAddMaterialOpen) setNewMaterial(prev => ({ ...prev, categoryId: created.id }));
                if (editingMaterial) setEditingMaterial(prev => ({ ...prev!, categoryId: created.id }));
            } else {
                const err = await res.json();
                alert(err.error || "Failed to create category");
            }
        } catch (error) {
            alert("Failed to create category");
        }
    };

    const handleUpdateMaterial = async () => {
        if (!editingMaterial) return;
        if (editingMaterial.currentStock !== editingMaterial.originalStock && !editingMaterial.adjustmentReason.trim()) {
            alert("An adjustment reason is required because the stock level was changed.");
            return;
        }

        setIsUpdating(true);
        try {
            const res = await fetch(`/api/raw-items/${editingMaterial.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingMaterial)
            });

            if (res.ok) {
                setIsManageMaterialOpen(false);
                setEditingMaterial(null);
                fetchData();
                alert("Material updated and logged successfully.");
            } else {
                const err = await res.json();
                alert(err.error || "Failed to update material");
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteMaterial = async () => {
        if (!editingMaterial) return;
        if (!confirm(`Are you absolutely sure you want to delete ${editingMaterial.name}? This cannot be undone.`)) return;

        setIsUpdating(true);
        try {
            const res = await fetch(`/api/raw-items/${editingMaterial.id}`, { method: "DELETE" });
            if (res.ok) {
                setIsManageMaterialOpen(false);
                setEditingMaterial(null);
                fetchData();
                alert("Material deleted.");
            } else {
                const err = await res.json();
                alert(err.error || "Failed to delete material");
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleNewPurchase = async () => {
        if (purchaseItems.length === 0) {
            alert("Add at least one item to the purchase order");
            return;
        }
        const res = await fetch("/api/purchases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status: newPurchase.status,
                landedCost: newPurchase.landedCost,
                items: purchaseItems.map(p => ({
                    rawItemId: p.rawItemId,
                    // The backend API expects a total 'quantity' and a 'unitPrice' for the single unit logic
                    quantity: p.packs * p.unitsPerPack,
                    unitPrice: p.unitPricePerPack / p.unitsPerPack,
                }))
            })
        });
        if (res.ok) {
            setIsNewPurchaseOpen(false);
            setPurchaseItems([]);
            setNewPurchase({ status: "COMPLETED", landedCost: 0 });
            fetchData();
        } else {
            alert("Failed to create purchase order");
        }
    };


    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Raw Materials & Purchases</h1>
                <div className="flex gap-2">
                    <Dialog open={isNewPurchaseOpen} onOpenChange={setIsNewPurchaseOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">New Purchase Order</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Create Purchase Order</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select value={newPurchase.status} onValueChange={(val) => setNewPurchase(prev => ({ ...prev, status: val }))}>
                                            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PENDING">Pending</SelectItem>
                                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Landed Cost (Shipping, etc) $</Label>
                                        <Input type="number" value={newPurchase.landedCost} onChange={(e) => setNewPurchase(prev => ({ ...prev, landedCost: parseFloat(e.target.value) || 0 }))} />
                                    </div>
                                </div>

                                <div className="border rounded p-4 space-y-4">
                                    <h4 className="font-semibold text-sm">Purchase Items</h4>
                                    {purchaseItems.map((pi: any, idx) => {
                                        const itemDef = rawItems.find(r => r.id === pi.rawItemId);
                                        const totalUnits = pi.packs * pi.unitsPerPack;
                                        return (
                                            <div key={idx} className="flex gap-3 items-center text-sm bg-muted p-2 rounded border">
                                                <div className="w-8 h-8 rounded bg-background flex-shrink-0 border overflow-hidden relative">
                                                    {itemDef?.imageUrl ? <ImagePreview src={itemDef.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={itemDef.name} /> : <div className="text-[8px] w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/30">N/A</div>}
                                                </div>
                                                <span className="flex-1 font-medium">{itemDef?.name || 'Unknown'}</span>
                                                <span className="w-24 px-1 text-xs text-muted-foreground">{pi.packs} packs × {pi.unitsPerPack}</span>
                                                <span className="w-16 font-bold">{totalUnits} units</span>
                                                <span className="w-16 font-mono">${pi.unitPricePerPack.toFixed(2)}</span>
                                                <Button variant="ghost" size="sm" onClick={() => setPurchaseItems(prev => prev.filter((_, i) => i !== idx))}>X</Button>
                                            </div>
                                        );
                                    })}

                                    <div className="flex gap-2 items-end pt-2 border-t mt-2">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs">Raw Material Search</Label>
                                            <Popover open={comboOpenPO} onOpenChange={setComboOpenPO}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={comboOpenPO}
                                                        className="w-full justify-between h-9 px-3"
                                                    >
                                                        {draftPOItem.rawItemId
                                                            ? <span className="truncate">{rawItems.find((item) => item.id === draftPOItem.rawItemId)?.name}</span>
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
                                                                    .filter(item => !purchaseItems.some((b: any) => b.rawItemId === item.id))
                                                                    .map((item) => (
                                                                        <CommandItem
                                                                            key={item.id}
                                                                            value={`${item.name} ${item.category?.name || ''}`}
                                                                            onSelect={() => {
                                                                                setDraftPOItem(prev => ({ ...prev, rawItemId: item.id }));
                                                                                setComboOpenPO(false);
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
                                        <div className="w-16 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Packs</Label>
                                            <Input type="number" min={1} value={draftPOItem.packs} onChange={e => setDraftPOItem(prev => ({ ...prev, packs: parseInt(e.target.value) || 0 }))} />
                                        </div>
                                        <div className="w-16 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Units/Pk</Label>
                                            <Input type="number" min={1} value={draftPOItem.unitsPerPack} onChange={e => setDraftPOItem(prev => ({ ...prev, unitsPerPack: parseInt(e.target.value) || 0 }))} />
                                        </div>
                                        <div className="w-24 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">$/Pack</Label>
                                            <Input type="number" min={0} value={draftPOItem.unitPricePerPack} onChange={e => setDraftPOItem(prev => ({ ...prev, unitPricePerPack: parseFloat(e.target.value) || 0 }))} />
                                        </div>
                                        <Button
                                            variant="secondary"
                                            type="button"
                                            disabled={!draftPOItem.rawItemId || draftPOItem.packs <= 0 || draftPOItem.unitsPerPack <= 0}
                                            onClick={() => {
                                                setPurchaseItems((prev: any) => [...prev, draftPOItem]);
                                                setDraftPOItem({ rawItemId: "", packs: 1, unitsPerPack: 1, unitPricePerPack: 0 });
                                            }}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleNewPurchase}>Create PO</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
                        <DialogTrigger asChild>
                            <Button>Add Raw Material</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Raw Material</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Material Name</Label>
                                    <Input value={newMaterial.name} onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Golden Cutlery Set" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    {!isCreatingCategory ? (
                                        <Popover open={addCategoryComboOpen} onOpenChange={setAddCategoryComboOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" role="combobox" aria-expanded={addCategoryComboOpen} className="w-full justify-between font-normal">
                                                    {newMaterial.categoryId ? <span className="truncate">{categories.find(c => c.id === newMaterial.categoryId)?.name}</span> : <span className="text-muted-foreground">Select a category...</span>}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0 shadow-lg border" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search categories..." className="h-9" />
                                                    <CommandList>
                                                        <CommandEmpty>No categories found.</CommandEmpty>
                                                        <CommandGroup>
                                                            <CommandItem
                                                                onSelect={() => {
                                                                    setIsCreatingCategory(true);
                                                                    setAddCategoryComboOpen(false);
                                                                }}
                                                                className="text-primary font-medium cursor-pointer"
                                                            >
                                                                + Create New Category
                                                            </CommandItem>
                                                            {categories.map(cat => (
                                                                <CommandItem
                                                                    key={cat.id}
                                                                    value={cat.name}
                                                                    onSelect={() => {
                                                                        setNewMaterial(prev => ({ ...prev, categoryId: cat.id }));
                                                                        setAddCategoryComboOpen(false);
                                                                    }}
                                                                    className="cursor-pointer"
                                                                >
                                                                    {cat.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    ) : (
                                        <div className="flex gap-2 items-center">
                                            <Input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="New Category Name..." className="flex-1" />
                                            <Button variant="secondary" onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>Save</Button>
                                            <Button variant="ghost" onClick={() => { setIsCreatingCategory(false); setNewCategoryName(""); }}>Cancel</Button>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Image (Optional)</Label>
                                    <ImageUploader value={newMaterial.imageUrl} onChange={(url) => setNewMaterial(prev => ({ ...prev, imageUrl: url }))} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddMaterial}>Save Material</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isManageMaterialOpen} onOpenChange={setIsManageMaterialOpen}>
                        <DialogTrigger asChild>
                            <Button variant="secondary">Manage Inventory Item</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Edit or Delete Raw Item</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-4 py-4">
                                {!editingMaterial ? (
                                    <div className="space-y-2">
                                        <Label>Search for Material to Manage</Label>
                                        <Popover open={manageComboOpen} onOpenChange={setManageComboOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" role="combobox" aria-expanded={manageComboOpen} className="w-full justify-between">
                                                    <span className="text-muted-foreground font-normal">Select material to edit...</span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0 shadow-lg border" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search by name or category..." className="h-9" />
                                                    <CommandList>
                                                        <CommandEmpty>No material found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {rawItems.map((item) => (
                                                                <CommandItem
                                                                    key={item.id}
                                                                    value={`${item.name} ${item.category?.name || ''}`}
                                                                    onSelect={() => {
                                                                        setEditingMaterial({
                                                                            id: item.id,
                                                                            name: item.name,
                                                                            categoryId: item.categoryId,
                                                                            imageUrl: item.imageUrl || "",
                                                                            currentStock: item.currentStock,
                                                                            originalStock: item.currentStock,
                                                                            movingAverageCost: item.movingAverageCost,
                                                                            adjustmentReason: ""
                                                                        });
                                                                        setManageComboOpen(false);
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
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center bg-muted/50 p-2 rounded border">
                                            <span className="font-semibold">{editingMaterial.name}</span>
                                            <Button variant="ghost" size="sm" onClick={() => setEditingMaterial(null)}>Change Item</Button>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Material Name</Label>
                                            <Input value={editingMaterial.name} onChange={(e) => setEditingMaterial(prev => ({ ...prev!, name: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Category</Label>
                                            {!isCreatingCategory ? (
                                                <Popover open={manageCategoryComboOpen} onOpenChange={setManageCategoryComboOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" role="combobox" aria-expanded={manageCategoryComboOpen} className="w-full justify-between font-normal">
                                                            {editingMaterial.categoryId ? <span className="truncate">{categories.find(c => c.id === editingMaterial.categoryId)?.name}</span> : <span className="text-muted-foreground">Select a category...</span>}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[400px] p-0 shadow-lg border" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Search categories..." className="h-9" />
                                                            <CommandList>
                                                                <CommandEmpty>No categories found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    <CommandItem
                                                                        onSelect={() => {
                                                                            setIsCreatingCategory(true);
                                                                            setManageCategoryComboOpen(false);
                                                                        }}
                                                                        className="text-primary font-medium cursor-pointer"
                                                                    >
                                                                        + Create New Category
                                                                    </CommandItem>
                                                                    {categories.map(cat => (
                                                                        <CommandItem
                                                                            key={cat.id}
                                                                            value={cat.name}
                                                                            onSelect={() => {
                                                                                setEditingMaterial(prev => ({ ...prev!, categoryId: cat.id }));
                                                                                setManageCategoryComboOpen(false);
                                                                            }}
                                                                            className="cursor-pointer"
                                                                        >
                                                                            {cat.name}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            ) : (
                                                <div className="flex gap-2 items-center">
                                                    <Input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="New Category Name..." className="flex-1" />
                                                    <Button variant="secondary" onClick={handleCreateCategory} disabled={!newCategoryName.trim() || isUpdating}>Save</Button>
                                                    <Button variant="ghost" onClick={() => { setIsCreatingCategory(false); setNewCategoryName(""); }} disabled={isUpdating}>Cancel</Button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Stock (Units)</Label>
                                                <Input type="number" value={editingMaterial.currentStock} onChange={(e) => setEditingMaterial(prev => ({ ...prev!, currentStock: parseFloat(e.target.value) || 0 }))} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Avg Cost ($)</Label>
                                                <Input type="number" value={editingMaterial.movingAverageCost} onChange={(e) => setEditingMaterial(prev => ({ ...prev!, movingAverageCost: parseFloat(e.target.value) || 0 }))} />
                                            </div>
                                        </div>
                                        {/* Show warning/input if stock was drastically changed */}
                                        {editingMaterial.currentStock !== editingMaterial.originalStock && (
                                            <div className="space-y-2 bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-md">
                                                <Label className="text-yellow-600 dark:text-yellow-400 font-bold">Mandatory: Stock Adjustment Reason</Label>
                                                <p className="text-xs text-muted-foreground mb-2">You are altering the physical inventory count. Please log why.</p>
                                                <Input
                                                    value={editingMaterial.adjustmentReason}
                                                    onChange={(e) => setEditingMaterial(prev => ({ ...prev!, adjustmentReason: e.target.value }))}
                                                    placeholder="e.g. Broken in warehouse, re-counted inventory..."
                                                    className="border-yellow-500/50"
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <Label>Image (Optional)</Label>
                                            <ImageUploader value={editingMaterial.imageUrl} onChange={(url) => setEditingMaterial(prev => ({ ...prev!, imageUrl: url }))} />
                                        </div>
                                    </>
                                )}
                            </div>
                            <DialogFooter className="flex items-center justify-between w-full sm:justify-between">
                                {editingMaterial ? (
                                    <>
                                        <Button variant="destructive" onClick={handleDeleteMaterial} disabled={isUpdating}>Delete</Button>
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={() => setIsManageMaterialOpen(false)}>Cancel</Button>
                                            <Button onClick={handleUpdateMaterial} disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</Button>
                                        </div>
                                    </>
                                ) : (
                                    <Button variant="outline" onClick={() => setIsManageMaterialOpen(false)}>Close</Button>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Current Inventory</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead className="text-right">Avg Cost</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rawItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-muted flex-shrink-0 border overflow-hidden">
                                                {item.imageUrl ? <ImagePreview src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} /> : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-secondary/30">N/A</div>}
                                            </div>
                                            <div className="flex flex-col">
                                                <span>{item.name}</span>
                                                <span className="text-[10px] text-muted-foreground">{item.id}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="bg-primary/10 text-primary uppercase font-bold text-[10px] px-2 py-1 rounded-full">{item.category?.name || 'Uncategorized'}</span>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {item.currentStock.toFixed(1)} <span className="text-[10px] text-muted-foreground uppercase font-bold">Units</span>
                                        </TableCell>
                                        <TableCell className="text-right">${item.movingAverageCost.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                                {rawItems.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            No raw items found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Purchases</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Total Cost</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {purchases.map((purchase) => {
                                    const itemTotal = purchase.items.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice), 0);
                                    const totalCost = purchase.landedCost + itemTotal;

                                    return (
                                        <TableRow key={purchase.id}>
                                            <TableCell className="font-mono text-xs">{purchase.id.split('-')[0]}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs ${purchase.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {purchase.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">${totalCost.toFixed(2)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                                {purchases.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                            No purchases found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
