'use client';

import { useState, useEffect } from "react";
import { Plus, Search, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ImagePreview } from "@/components/ui/image-preview";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = {
    id: string;
    name: string;
}

type RentalItem = {
    id: string;
    name: string;
    imageUrl: string | null;
    categoryId: string;
    category?: Category;
    dailyPrice: number;
    totalStock: number;
};

export default function RentalsClient() {
    const [rentals, setRentals] = useState<RentalItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isManageRentalOpen, setIsManageRentalOpen] = useState(false);
    const [editingRental, setEditingRental] = useState<RentalItem | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [dailyPrice, setDailyPrice] = useState("");
    const [totalStock, setTotalStock] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [rentalsRes, categoriesRes] = await Promise.all([
                fetch('/api/rentals'),
                fetch('/api/categories')
            ]);

            if (rentalsRes.ok) setRentals(await rentalsRes.json());
            if (categoriesRes.ok) setCategories(await categoriesRes.json());
        } catch (error) {
            console.error("Failed to load data:", error);
            alert("Failed to load rental data.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingRental(null);
        setName("");
        setCategoryId("");
        setDailyPrice("");
        setTotalStock("");
        setImageUrl("");
        setIsManageRentalOpen(true);
    };

    const handleSave = async () => {
        if (!name || !categoryId || !dailyPrice || !totalStock) {
            alert("Validation Error: Please fill in all required fields.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                name,
                categoryId,
                dailyPrice: parseFloat(dailyPrice),
                totalStock: parseInt(totalStock, 10),
                imageUrl: imageUrl || null
            };

            const res = await fetch('/api/rentals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Success: Rental item saved.");
                setIsManageRentalOpen(false);
                fetchData();
            } else {
                const err = await res.json();
                alert("Error: " + (err.error || "Failed to save rental."));
            }
        } catch (error) {
            console.error(error);
            alert("Error: Failed to save rental.");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredRentals = rentals.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.category?.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rental Inventory</h1>
                    <p className="text-muted-foreground mt-2">Manage your fleet of rental assets and equipment.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleOpenCreate} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Rental Item
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-96">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search rentals by name or category..."
                        className="pl-8 bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="py-24 text-center text-muted-foreground animate-pulse">Loading rental inventory...</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredRentals.map(rental => (
                        <Card key={rental.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow group cursor-pointer" onClick={() => {/* Future EDIT feature */ }}>
                            <div className="aspect-square w-full bg-muted border-b relative overflow-hidden">
                                {rental.imageUrl ? (
                                    <ImagePreview src={rental.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={rental.name} />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-xs text-muted-foreground font-semibold bg-secondary/30">
                                        <div className="p-3 rounded-full bg-secondary/50 mb-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                        </div>
                                        NO IMAGE
                                    </div>
                                )}
                                <div className="absolute top-2 left-2">
                                    <span className="inline-flex items-center rounded-md bg-background/90 px-2 py-1 text-[10px] font-bold ring-1 ring-inset ring-border shadow-sm uppercase tracking-wider backdrop-blur-sm">
                                        {rental.category?.name || 'Uncategorized'}
                                    </span>
                                </div>
                            </div>

                            <CardContent className="p-3 flex-1 flex flex-col bg-card">
                                <h3 className="font-bold text-sm leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">{rental.name}</h3>
                                <div className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1 py-0.5 rounded w-max mt-1 mb-3">ID: {rental.id.split('-')[0]}</div>

                                <div className="mt-auto pt-2 border-t flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground font-medium">Daily Rate:</span>
                                        <span className="font-bold font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">${rental.dailyPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground font-medium">Total Owned:</span>
                                        <span className="font-bold font-mono bg-muted px-1.5 py-0.5 rounded">{rental.totalStock}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredRentals.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                            No rentals found. <br /><span className="text-sm mt-1 inline-block">Click 'Add Rental Item' to create your first asset.</span>
                        </div>
                    )}
                </div>
            )}

            <Dialog open={isManageRentalOpen} onOpenChange={setIsManageRentalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add Rental Item</DialogTitle>
                        <DialogDescription>Define a new asset that can be rented out for events.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col items-center justify-center gap-2 mb-2">
                            <Label className="w-full text-left">Asset Image</Label>
                            <ImageUploader
                                value={imageUrl}
                                onChange={(url: string) => setImageUrl(url)}
                                className="w-full h-40 border-dashed rounded-lg"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="name">Asset Name <span className="text-red-500">*</span></Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VIP Velvet Chair" />
                        </div>

                        <div className="grid gap-2">
                            <Label>Category <span className="text-red-500">*</span></Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="price">Daily Rate ($) <span className="text-red-500">*</span></Label>
                                <Input id="price" type="number" min="0" step="0.01" value={dailyPrice} onChange={(e) => setDailyPrice(e.target.value)} placeholder="e.g. 5.50" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="stock">Total Stock Owned <span className="text-red-500">*</span></Label>
                                <Input id="stock" type="number" min="1" value={totalStock} onChange={(e) => setTotalStock(e.target.value)} placeholder="e.g. 100" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsManageRentalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Asset"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
