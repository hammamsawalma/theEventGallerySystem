"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImagePreview } from "@/components/ui/image-preview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Minus, Edit2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";
import { generateInvoicePDF } from "@/lib/pdfGenerator";

export default function SalesPOSPage() {
    const [kits, setKits] = useState<any[]>([]);
    const [rawItems, setRawItems] = useState<any[]>([]);
    const [rentals, setRentals] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);

    // Search state
    const [kitSearchQuery, setKitSearchQuery] = useState("");
    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [rentalSearchQuery, setRentalSearchQuery] = useState("");

    // Checkout state
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerNameOpen, setCustomerNameOpen] = useState(false);
    const [customerPhoneOpen, setCustomerPhoneOpen] = useState(false);
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [depositAmount, setDepositAmount] = useState<number>(0);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    // Custom Row state
    const [isCustomRowOpen, setIsCustomRowOpen] = useState(false);
    const [customRowDesc, setCustomRowDesc] = useState("");
    const [customRowPrice, setCustomRowPrice] = useState<number>(0);

    // Customization state
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [activeKit, setActiveKit] = useState<any>(null);
    const [checkoutBomItems, setCheckoutBomItems] = useState<{ rawItem: any, quantity: number, baseQuantity: number, isBase: boolean }[]>([]);
    const [overridePrice, setOverridePrice] = useState<number>(0);

    // Raw Item Modal state
    const [isRawItemModalOpen, setIsRawItemModalOpen] = useState(false);
    const [activeRawItem, setActiveRawItem] = useState<any>(null);
    const [rawItemQty, setRawItemQty] = useState(1);
    const [rawItemOverridePrice, setRawItemOverridePrice] = useState<number>(0);

    // Rental Modal state
    const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
    const [activeRental, setActiveRental] = useState<any>(null);
    const [rentalStartDate, setRentalStartDate] = useState("");
    const [rentalEndDate, setRentalEndDate] = useState("");
    const [rentalQty, setRentalQty] = useState(1);
    const [rentalCheckStatus, setRentalCheckStatus] = useState<{ loading: boolean, error: string | null, maxAvailable: number | null }>({ loading: false, error: null, maxAvailable: null });

    const [originalEditId, setOriginalEditId] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/kits").then(res => res.json()).then(data => setKits(Array.isArray(data) ? data : []));
        fetch("/api/raw-items").then(res => res.json()).then(data => setRawItems(Array.isArray(data) ? data : []));
        fetch("/api/rentals").then(res => res.json()).then(data => setRentals(Array.isArray(data) ? data : []));
        fetch("/api/customers").then(res => res.json()).then(data => setCustomers(Array.isArray(data) ? data : []));

        // Check if we are editing an order
        const editDraftStr = localStorage.getItem("editOrderDraft");
        const editId = localStorage.getItem("editOrderId");
        if (editDraftStr && editId) {
            try {
                const draft = JSON.parse(editDraftStr);
                setCustomerName(draft.customer?.name || "");
                setCustomerPhone(draft.customer?.phone || "");
                setOriginalEditId(editId);

                // Map API items back to cart items
                const rebuiltCart = draft.items.map((apiItem: any) => ({
                    id: apiItem.itemId,
                    name: apiItem.itemType === 'KIT' ? "Kit " + apiItem.itemId?.slice(-4) : (apiItem.itemType === 'RENTAL' ? "Rental " + apiItem.itemId?.slice(-4) : "Raw Item " + apiItem.itemId?.slice(-4)),
                    price: apiItem.unitPrice,
                    type: apiItem.itemType,
                    qty: apiItem.quantity,
                    rentalStartDate: apiItem.rentalStartDate,
                    rentalEndDate: apiItem.rentalEndDate,
                    rentalDays: apiItem.rentalDays,
                    customizations: apiItem.customizations?.map((c: any) => ({
                        rawItemId: c.rawItemId,
                        name: "Custom Item " + c.rawItemId.slice(-4),
                        quantityAdded: c.quantityAdded,
                        extraPrice: c.extraPrice
                    })) || []
                }));

                setCart(rebuiltCart);
            } catch (e) {
                console.error("Failed to parse edit draft", e);
            }
        }
    }, []);

    const addToCart = (item: any, type: 'KIT' | 'RAW_ITEM' | 'RENTAL', customDetails?: any[], finalPriceOverride?: number, qtyOverride: number = 1, rentalDetails?: any) => {
        const priceToUse = finalPriceOverride !== undefined ? finalPriceOverride : (item.baseSalePrice || item.movingAverageCost || item.dailyPrice || 0);
        setCart((prev) => {
            const existing = prev.find(i => i.id === item.id && i.type === type && i.price === priceToUse && JSON.stringify(i.customizations) === JSON.stringify(customDetails) && i.rentalStartDate === rentalDetails?.rentalStartDate);
            if (existing && type !== 'RENTAL') { // we allow combining standard items, but rentals are kept separate per date pair safely
                return prev.map(i => i === existing ? { ...i, qty: i.qty + qtyOverride } : i);
            }
            return [...prev, {
                id: item.id,
                name: item.name,
                imageUrl: item.imageUrl,
                category: item.category,
                price: priceToUse,
                type,
                qty: qtyOverride,
                customizations: customDetails,
                ...rentalDetails
            }];
        });
    };

    const startCustomizing = (kit: any) => {
        setActiveKit(kit);
        const mappedBom = kit.bomItems.map((b: any) => ({
            rawItem: b.rawItem,
            quantity: b.quantity,
            baseQuantity: b.quantity,
            isBase: true
        }));
        setCheckoutBomItems(mappedBom);
        setOverridePrice(kit.baseSalePrice || 0);
        setIsCustomizing(true);
    };

    const addCustomItem = (rawItem: any) => {
        setCheckoutBomItems(prev => {
            const existing = prev.find(i => i.rawItem.id === rawItem.id);
            if (existing) {
                return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { rawItem, quantity: 1, baseQuantity: 0, isBase: false }];
        });
    };

    const commitCustomization = () => {
        const customizations = checkoutBomItems
            .map(item => ({
                rawItemId: item.rawItem.id,
                name: item.rawItem.name,
                imageUrl: item.rawItem.imageUrl,
                quantityAdded: item.quantity - item.baseQuantity,
                extraPrice: 0 // Captured globally by the overridePrice
            }))
            .filter(c => c.quantityAdded !== 0);

        if (editingCartIndex !== null) {
            setCart(prev => prev.map((item, i) => i === editingCartIndex ? { ...item, customizations, price: overridePrice } : item));
            setEditingCartIndex(null);
        } else {
            addToCart(activeKit, 'KIT', customizations, overridePrice, 1);
        }
        setIsCustomizing(false);
    };

    const openRawItemModal = (item: any) => {
        setActiveRawItem(item);
        setRawItemQty(1);
        const totalCost = (item.movingAverageCost || 0) * 1;
        const formulaTotalRetail = Math.ceil(Math.ceil(totalCost * 2) / 5) * 5;
        // If it's 1 qty, we might still fallback to the baseSalePrice if it existed and is valid, but strictly formula is safer based on rules
        setRawItemOverridePrice(formulaTotalRetail);
        setIsRawItemModalOpen(true);
    };

    const commitRawItem = () => {
        addToCart(activeRawItem, 'RAW_ITEM', undefined, rawItemOverridePrice / rawItemQty, rawItemQty);
        setIsRawItemModalOpen(false);
    };

    const openRentalModal = (rental: any) => {
        setActiveRental(rental);
        // Default to today and tomorrow
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        setRentalStartDate(today.toISOString().split('T')[0]);
        setRentalEndDate(tomorrow.toISOString().split('T')[0]);
        setRentalQty(1);
        setRentalCheckStatus({ loading: false, error: null, maxAvailable: null });
        setIsRentalModalOpen(true);
    };

    const checkRentalAvailability = async () => {
        if (!rentalStartDate || !rentalEndDate || !activeRental) return;
        setRentalCheckStatus({ loading: true, error: null, maxAvailable: null });
        try {
            const res = await fetch(`/api/rentals/availability?rentalItemId=${activeRental.id}&startDate=${rentalStartDate}&endDate=${rentalEndDate}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Adjust to ensure we don't return negative maxAvailable if math fails
            setRentalCheckStatus({ loading: false, error: null, maxAvailable: data.availableStock });
            if (rentalQty > data.availableStock) {
                setRentalQty(Math.max(1, data.availableStock));
            }
        } catch (err: any) {
            setRentalCheckStatus({ loading: false, error: err.message, maxAvailable: null });
        }
    };

    // Auto-check availability when dates change
    useEffect(() => {
        if (isRentalModalOpen && activeRental) {
            checkRentalAvailability();
        }
    }, [rentalStartDate, rentalEndDate]);

    const commitRental = () => {
        if (rentalCheckStatus.maxAvailable === null || rentalQty > rentalCheckStatus.maxAvailable) {
            alert("Cannot add. Please select valid dates and quantity within limits.");
            return;
        }

        const s = new Date(rentalStartDate);
        const e = new Date(rentalEndDate);
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // Minimum 1 day

        addToCart(activeRental, 'RENTAL', undefined, activeRental.dailyPrice * diffDays, rentalQty, {
            rentalStartDate,
            rentalEndDate,
            rentalDays: diffDays
        });

        setIsRentalModalOpen(false);
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => prev.map((item, i) => {
            if (i === index) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);

    const editCartItemCustomizations = (index: number, item: any) => {
        const originalKit = kits.find(k => k.id === item.id);
        if (!originalKit) return;

        setActiveKit(originalKit);

        const mappedBom = originalKit.bomItems.map((b: any) => {
            const custom = item.customizations?.find((c: any) => c.rawItemId === b.rawItem.id);
            return {
                rawItem: b.rawItem,
                quantity: b.quantity + (custom ? custom.quantityAdded : 0),
                baseQuantity: b.quantity,
                isBase: true
            };
        });

        item.customizations?.forEach((c: any) => {
            if (!originalKit.bomItems.some((b: any) => b.rawItemId === c.rawItemId)) {
                mappedBom.push({
                    rawItem: rawItems.find(r => r.id === c.rawItemId) || { id: c.rawItemId, name: c.name, imageUrl: c.imageUrl },
                    quantity: c.quantityAdded,
                    baseQuantity: 0,
                    isBase: false
                });
            }
        });

        setCheckoutBomItems(mappedBom);
        setOverridePrice(item.price);
        setEditingCartIndex(index);
        setIsCustomizing(true);
    };

    const cartTotal = cart.reduce((total, item) => {
        let itemTotal = item.price * item.qty;
        if (item.customizations) {
            itemTotal += item.customizations.reduce((acc: number, custom: any) => acc + (custom.extraPrice * custom.quantityAdded), 0) * item.qty;
        }
        return total + itemTotal;
    }, 0);

    const handleCheckout = async () => {
        if (!customerName || !customerPhone) {
            alert("Please enter customer name and phone.");
            return;
        }

        setIsCheckingOut(true);
        try {
            const payload = {
                customerName,
                customerPhone,
                items: cart.map(item => ({
                    itemType: item.type,
                    itemId: item.type === "CUSTOM" ? null : item.id,
                    description: item.type === "CUSTOM" ? item.name : null,
                    quantity: item.qty,
                    unitPrice: item.price,
                    customizations: item.customizations?.map((c: any) => ({
                        rawItemId: c.rawItemId,
                        quantityAdded: c.quantityAdded,
                        extraPrice: c.extraPrice
                    }))
                })),
                totalAmount: cartTotal - (discountAmount || 0),
                depositAmount: depositAmount || 0
            };

            // If we were editing, delete the old order first to free up stock
            if (originalEditId) {
                const deleteRes = await fetch(`/api/sales/${originalEditId}`, {
                    method: "DELETE"
                });
                if (!deleteRes.ok) {
                    console.error("Failed to delete original order during edit swap");
                } else {
                    localStorage.removeItem("editOrderDraft");
                    localStorage.removeItem("editOrderId");
                    setOriginalEditId(null);
                }
            }

            const res = await fetch("/api/sales", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Checkout failed");
            }

            const completedSale = await res.json();

            // Auto-generate the PDF invoice
            const kitsMap = Object.fromEntries(kits.map(k => [k.id, k]));
            const rawItemsMap = Object.fromEntries(rawItems.map(r => [r.id, r]));
            generateInvoicePDF(completedSale, kitsMap, rawItemsMap);

            // Success
            setCart([]);
            setCustomerName("");
            setCustomerPhone("");
            setDiscountAmount(0);
            alert("Sale completed successfully! Your invoice is downloading.");
            // Refresh inventory numbers
            fetch("/api/kits").then(res => res.json()).then(setKits);
            fetch("/api/raw-items").then(res => res.json()).then(setRawItems);

        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full gap-6">
            {/* Product Grid */}
            <div className="flex-1 flex flex-col gap-4 overflow-auto">
                <h2 className="text-2xl font-bold">Point of Sale</h2>

                <div className="flex justify-between items-center mt-4">
                    <h3 className="text-lg font-semibold">Event Kits</h3>
                    <div className="w-64">
                        <Input
                            placeholder="Search kits by name..."
                            value={kitSearchQuery}
                            onChange={(e) => setKitSearchQuery(e.target.value)}
                            className="bg-background h-8 text-sm"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {kits.filter(kit => kit.currentStock > 0 && kit.name.toLowerCase().includes(kitSearchQuery.toLowerCase())).map(kit => (
                        <Card key={kit.id} className="flex flex-col">
                            <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground w-full h-32 rounded-t-lg border-b overflow-hidden relative">
                                {kit.imageUrl ? <ImagePreview src={kit.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={kit.name} /> : <div className="text-xs">No Image</div>}
                            </div>
                            <CardContent className="p-4 flex-1 flex flex-col justify-between cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => startCustomizing(kit)}>
                                <div>
                                    <div className="font-bold text-sm leading-tight flex-1">{kit.name}</div>
                                    <div className="flex flex-col gap-0.5 mt-2">
                                        <span className="text-[10px] text-muted-foreground font-mono">Cost: ${(kit.calculatedCost || 0).toFixed(2)}</span>
                                        <span className="text-sm font-bold text-primary">Retail: ${kit.baseSalePrice.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="text-xs mt-2 text-primary font-bold">{kit.currentStock} in stock</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-between items-center mt-4">
                    <h3 className="text-lg font-semibold">Individual Raw Items</h3>
                    <div className="w-64">
                        <Input
                            placeholder="Search items or categories..."
                            value={itemSearchQuery}
                            onChange={(e) => setItemSearchQuery(e.target.value)}
                            className="bg-background h-8 text-sm"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {rawItems.filter(item =>
                        item.currentStock > 0 &&
                        (item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                            item.category?.name?.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                    ).map(item => (
                        <Card key={item.id} className="flex flex-col">
                            <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground w-full h-32 rounded-t-lg border-b overflow-hidden relative">
                                {item.imageUrl ? <ImagePreview src={item.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={item.name} /> : <div className="text-[10px] w-full h-full flex items-center justify-center text-muted-foreground font-semibold bg-secondary/30">N/A</div>}
                            </div>
                            <CardContent className="p-4 flex-1 flex flex-col justify-between cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => openRawItemModal(item)}>
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <div className="font-bold text-sm leading-tight flex-1">{item.name}</div>
                                    </div>
                                    <span className="bg-primary/10 text-primary uppercase font-bold text-[9px] px-1.5 py-0.5 rounded-full">{item.category?.name || 'Uncategorized'}</span>
                                    <div className="text-sm text-muted-foreground font-semibold mt-2">${(item.baseSalePrice || item.movingAverageCost || 0).toFixed(2)}</div>
                                </div>
                                <div className="text-xs mt-2 text-primary font-bold">{item.currentStock.toFixed(1)} in stock</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Rentals Section */}
                <div className="flex justify-between items-center mt-6 border-t pt-4">
                    <h3 className="text-lg font-semibold text-blue-600">Rentals & Props</h3>
                    <div className="w-64">
                        <Input
                            placeholder="Search rentals..."
                            value={rentalSearchQuery}
                            onChange={(e) => setRentalSearchQuery(e.target.value)}
                            className="bg-background h-8 text-sm"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
                    {rentals.filter(rental =>
                        rental.name.toLowerCase().includes(rentalSearchQuery.toLowerCase()) ||
                        rental.category?.name?.toLowerCase().includes(rentalSearchQuery.toLowerCase())
                    ).map(rental => (
                        <Card key={rental.id} className="flex flex-col border-blue-200 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-md z-10 shadow-sm">RENTAL</div>
                            <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground w-full h-32 rounded-t-lg border-b border-blue-100 overflow-hidden relative">
                                {rental.imageUrl ? <ImagePreview src={rental.imageUrl} className="object-cover w-full h-full absolute inset-0 group-hover:scale-105 transition-transform duration-500" alt={rental.name} /> : <div className="text-[10px] w-full h-full flex items-center justify-center text-muted-foreground font-semibold bg-secondary/30">N/A</div>}
                            </div>
                            <CardContent className="p-4 flex-1 flex flex-col justify-between cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => openRentalModal(rental)}>
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <div className="font-bold text-sm leading-tight flex-1">{rental.name}</div>
                                    </div>
                                    <span className="bg-blue-100 text-blue-700 uppercase font-bold text-[9px] px-1.5 py-0.5 rounded-full">{rental.category?.name || 'Uncategorized'}</span>
                                    <div className="text-sm font-semibold mt-2 text-blue-600">${rental.dailyPrice.toFixed(2)} <span className="text-[9px] text-muted-foreground font-normal">/ day</span></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Cart Sidebar */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l bg-card p-4 flex flex-col h-auto md:h-full rounded-b-lg md:rounded-bl-none md:rounded-r-lg shadow-sm shrink-0">
                <h3 className="font-bold text-lg border-b pb-2 flex justify-between items-center">
                    {originalEditId ? "Editing Order" : "Current Order"}
                    {originalEditId && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive" onClick={() => {
                            localStorage.removeItem("editOrderDraft");
                            localStorage.removeItem("editOrderId");
                            setOriginalEditId(null);
                            setCart([]);
                            setCustomerName("");
                            setCustomerPhone("");
                        }}>Cancel Edit</Button>
                    )}
                </h3>
                <div className="flex-1 overflow-auto py-4 flex flex-col gap-4">
                    {cart.length === 0 && <span className="text-muted-foreground text-sm text-center mt-10">Cart is empty</span>}
                    {cart.map((item, idx) => (
                        <div key={idx} className="flex flex-col border p-2 rounded bg-background shadow-sm">
                            <div className="flex justify-between items-start font-medium">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded bg-muted flex-shrink-0 border overflow-hidden relative">
                                        {item.imageUrl ? <ImagePreview src={item.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={item.name} /> : <div className="text-[10px] w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/30">N/A</div>}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center flex-wrap gap-1 leading-tight">
                                            <span>{item.name}</span>
                                            {item.type === 'KIT' && <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded-full uppercase font-bold text-secondary-foreground">KIT</span>}
                                            {item.type === 'RAW_ITEM' && item.category && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase font-bold">{item.category.name}</span>}
                                            {item.type === 'CUSTOM' && <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full uppercase font-bold">FEE</span>}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(idx, -1)}><Minus className="h-3 w-3" /></Button>
                                            <span className="text-sm w-4 text-center">{item.qty}</span>
                                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(idx, 1)}><Plus className="h-3 w-3" /></Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span>${(item.price * item.qty).toFixed(2)}</span>
                                    <div className="flex gap-1">
                                        {item.type === 'KIT' && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => editCartItemCustomizations(idx, item)}>
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(idx)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            {item.customizations && item.customizations.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-3 pl-3 border-l-2 space-y-2 border-primary/20">
                                    <div className="font-semibold text-[10px] uppercase tracking-wider">Custom Additions:</div>
                                    {item.customizations.map((c: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded bg-muted flex-shrink-0 border overflow-hidden relative">
                                                    {c.imageUrl ? <ImagePreview src={c.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={c.name} /> : <div className="text-[8px] w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/30">N/A</div>}
                                                </div>
                                                <span>{c.quantityAdded}x {c.name}</span>
                                            </div>
                                            <span>+${c.extraPrice}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {item.type === 'RENTAL' && (
                                <div className="text-xs text-blue-600 bg-blue-50 mt-3 p-2 rounded border border-blue-100 flex flex-col gap-1">
                                    <div className="font-semibold uppercase text-[10px]">Rental Dates ({item.rentalDays} Days):</div>
                                    <div>{item.rentalStartDate} to {item.rentalEndDate}</div>
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="mt-2">
                        <Button variant="ghost" size="sm" className="text-muted-foreground w-full border border-dashed border-primary/20 hover:bg-primary/5 hover:text-primary" onClick={() => setIsCustomRowOpen(true)}>
                            <Plus className="h-3 w-3 mr-2" /> Add Custom Fee/Row
                        </Button>
                    </div>
                </div>

                <div className="border-t pt-4 mt-auto space-y-3">
                    <div className="flex flex-col gap-2">
                        <div className="relative">
                            <Input placeholder="Customer Name" value={customerName}
                                onChange={e => { setCustomerName(e.target.value); setCustomerNameOpen(true); }}
                                onFocus={() => setCustomerNameOpen(true)}
                                onBlur={() => setTimeout(() => setCustomerNameOpen(false), 200)}
                            />
                            {customerNameOpen && customerName.length > 0 && customers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase())).length > 0 && (
                                <div className="absolute z-10 w-full bg-popover border shadow-md rounded-md mt-1 max-h-40 overflow-y-auto top-[100%]">
                                    {customers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase())).map(c => (
                                        <div key={c.id} className="p-2 text-sm hover:bg-muted cursor-pointer flex justify-between items-center" onClick={() => {
                                            setCustomerName(c.name);
                                            setCustomerPhone(c.phone);
                                            setCustomerNameOpen(false);
                                        }}>
                                            <span>{c.name}</span>
                                            <span className="text-muted-foreground text-[10px]">{c.phone}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <Input placeholder="Customer Phone" value={customerPhone}
                                onChange={e => { setCustomerPhone(e.target.value); setCustomerPhoneOpen(true); }}
                                onFocus={() => setCustomerPhoneOpen(true)}
                                onBlur={() => setTimeout(() => setCustomerPhoneOpen(false), 200)}
                            />
                            {customerPhoneOpen && customerPhone.length > 0 && customers.filter(c => c.phone.includes(customerPhone)).length > 0 && (
                                <div className="absolute z-10 w-full bg-popover border shadow-md rounded-md mt-1 max-h-40 overflow-y-auto top-[100%]">
                                    {customers.filter(c => c.phone.includes(customerPhone)).map(c => (
                                        <div key={c.id} className="p-2 text-sm hover:bg-muted cursor-pointer flex justify-between items-center" onClick={() => {
                                            setCustomerName(c.name);
                                            setCustomerPhone(c.phone);
                                            setCustomerPhoneOpen(false);
                                        }}>
                                            <span>{c.phone}</span>
                                            <span className="text-muted-foreground text-[10px]">{c.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-2 border-y border-dashed">
                        <span className="font-semibold text-muted-foreground">Discount ({'$'})</span>
                        <div className="w-24">
                            <Input type="number" className="h-8 text-right font-mono" min="0" placeholder="0.00" value={discountAmount || ''} onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm pb-2 border-b border-dashed">
                        <span className="font-semibold text-blue-600 flex flex-col">
                            Deposit ({'$'})
                            <span className="text-[10px] font-normal text-muted-foreground">Returned upon safe check-in</span>
                        </span>
                        <div className="w-24">
                            <Input type="number" className="h-8 text-right font-mono bg-blue-50 border-blue-200" min="0" placeholder="0.00" value={depositAmount || ''} onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        {(discountAmount > 0 || depositAmount > 0) && (
                            <div className="flex justify-between text-muted-foreground text-sm font-semibold">
                                <span>Cart Subtotal:</span>
                                <span>${cartTotal.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-black text-xl text-primary">
                            <span>Amount Due:</span>
                            <span>${Math.max(0, cartTotal - (discountAmount || 0) + (depositAmount || 0)).toFixed(2)}</span>
                        </div>
                    </div>

                    <Button
                        className="w-full mt-2 shadow-md"
                        size="lg"
                        disabled={cart.length === 0 || isCheckingOut || !customerName || !customerPhone}
                        onClick={handleCheckout}
                    >
                        {isCheckingOut ? "Processing..." : "Complete Order"}
                    </Button>
                </div>
            </div>

            {/* Custom Invoice Row Dialog */}
            <Dialog open={isCustomRowOpen} onOpenChange={setIsCustomRowOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Custom Fee / Item</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input placeholder="e.g. Delivery, Rush Fee, Setup..." value={customRowDesc} onChange={e => setCustomRowDesc(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Flat Price ($)</Label>
                            <Input type="number" min={0} value={customRowPrice || ""} onChange={e => setCustomRowPrice(parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            disabled={!customRowDesc.trim()}
                            onClick={() => {
                                setCart(prev => [...prev, {
                                    id: "custom-" + Date.now().toString(),
                                    name: customRowDesc.trim(),
                                    type: "CUSTOM",
                                    price: customRowPrice || 0,
                                    qty: 1,
                                    imageUrl: "",
                                    category: null,
                                    customizations: null
                                }]);
                                setCustomRowDesc("");
                                setCustomRowPrice(0);
                                setIsCustomRowOpen(false);
                            }}>
                            Add to Invoice
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Customization Dialog */}
            <Dialog open={isCustomizing} onOpenChange={setIsCustomizing}>
                <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Configure Kit for Checkout: {activeKit?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        {/* Left Side: Raw Items catalog */}
                        <div className="flex flex-col gap-4 border-r pr-6">
                            <h4 className="font-semibold text-sm">Add Extra Components</h4>
                            <p className="text-xs text-muted-foreground">Click items below to add them to this kit's custom BOM.</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-auto max-h-[50vh] pr-2">
                                {rawItems.map(item => (
                                    <div key={item.id} className="border rounded p-2 text-xs flex flex-col hover:bg-muted cursor-pointer gap-2 transition-colors relative" onClick={() => addCustomItem(item)}>
                                        <div className="w-full h-16 rounded bg-muted flex-shrink-0 border overflow-hidden relative">
                                            {item.imageUrl ? <ImagePreview src={item.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={item.name} /> : <div className="text-[10px] w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/30">N/A</div>}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="font-bold truncate" title={item.name}>{item.name}</div>
                                            <div className="text-muted-foreground text-[10px] mt-1">{item.currentStock.toFixed(1)} avail</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Side: Editable BOM and Pricing */}
                        <div className="flex flex-col gap-4">
                            <h4 className="font-semibold text-sm">Active BOM</h4>
                            <div className="flex flex-col gap-2 overflow-auto max-h-[35vh]">
                                {checkoutBomItems.map((c, idx) => (
                                    <div key={idx} className={`flex items-center gap-3 text-sm p-2 rounded border ${c.isBase && c.quantity === c.baseQuantity ? 'bg-muted/30' : 'bg-primary/5 border-primary/20'}`}>
                                        <div className="w-8 h-8 rounded bg-background flex-shrink-0 border overflow-hidden relative">
                                            {c.rawItem.imageUrl ? <ImagePreview src={c.rawItem.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={c.rawItem.name} /> : <div className="text-[8px] w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/30">N/A</div>}
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            <span className="font-medium leading-tight">{c.rawItem.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">${(c.rawItem.movingAverageCost || 0).toFixed(2)}/ea</span>
                                        </div>
                                        <Input
                                            type="number"
                                            className="w-16 h-8 text-center"
                                            min={0}
                                            value={c.quantity}
                                            onChange={(e) => {
                                                const newQty = parseFloat(e.target.value) || 0;
                                                setCheckoutBomItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: newQty } : item));
                                            }}
                                        />
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => {
                                            if (c.isBase) {
                                                setCheckoutBomItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: 0 } : item));
                                            } else {
                                                setCheckoutBomItems(prev => prev.filter((_, i) => i !== idx));
                                            }
                                        }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {/* Pricing Summary */}
                            <div className="mt-auto border-t pt-4 flex flex-col gap-3">
                                {(() => {
                                    const netCost = checkoutBomItems.reduce((acc, curr) => acc + (curr.quantity * (curr.rawItem.movingAverageCost || 0)), 0);
                                    const formulaRetail = Math.ceil(Math.ceil(netCost * 2) / 5) * 5;

                                    return (
                                        <>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Dynamic Net Cost:</span>
                                                <span className="font-mono font-semibold">${netCost.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Formula Retail:</span>
                                                <span className="font-mono font-semibold text-primary">${formulaRetail.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2 p-3 bg-muted rounded-lg">
                                                <span className="font-bold">Final Checkout Price:</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-muted-foreground font-medium">$</span>
                                                    <Input
                                                        type="number"
                                                        className="w-24 text-right font-bold"
                                                        value={overridePrice || ''}
                                                        onChange={e => setOverridePrice(parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCustomizing(false)}>Cancel</Button>
                        <Button onClick={commitCustomization} disabled={checkoutBomItems.filter(c => c.quantity > 0).length === 0}>Save Checkout Pricing</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Individual Raw Item Dialog */}
            <Dialog open={isRawItemModalOpen} onOpenChange={setIsRawItemModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Add Raw Item: {activeRawItem?.name}</DialogTitle>
                    </DialogHeader>
                    {activeRawItem && (
                        <div className="flex flex-col gap-6 py-4">
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-24 rounded-lg bg-muted flex-shrink-0 border shadow-sm relative overflow-hidden">
                                    {activeRawItem.imageUrl ? <ImagePreview src={activeRawItem.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={activeRawItem.name} /> : <div className="text-[10px] w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/30">N/A</div>}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-lg">{activeRawItem.name}</span>
                                    <span className="text-sm border w-max px-2 py-0.5 rounded-full mt-1">{activeRawItem.category?.name || 'Uncategorized'}</span>
                                    <span className="text-xs text-muted-foreground mt-2">{activeRawItem.currentStock.toFixed(1)} available</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Total Cost (MAC)</span>
                                    <span className="font-mono font-semibold">${((activeRawItem.movingAverageCost || 0) * rawItemQty).toFixed(2)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Total Formula Retail</span>
                                    <span className="font-mono font-semibold text-primary">
                                        ${(Math.ceil(Math.ceil(((activeRawItem.movingAverageCost || 0) * rawItemQty) * 2) / 5) * 5).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm">Quantity to Add:</span>
                                    <Input
                                        type="number"
                                        className="w-24 text-center font-bold"
                                        min={1}
                                        value={rawItemQty}
                                        onChange={e => {
                                            const newQty = parseInt(e.target.value) || 1;
                                            setRawItemQty(newQty);
                                            const totalCost = (activeRawItem.movingAverageCost || 0) * newQty;
                                            const formulaTotalRetail = Math.ceil(Math.ceil(totalCost * 2) / 5) * 5;
                                            setRawItemOverridePrice(formulaTotalRetail);
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between items-center bg-muted p-3 rounded-lg mt-2">
                                    <span className="font-bold text-sm">Final Checkout Price (Total):</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground font-medium">$</span>
                                        <Input
                                            type="number"
                                            className="w-24 text-right font-bold"
                                            value={rawItemOverridePrice || ''}
                                            onChange={e => setRawItemOverridePrice(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRawItemModalOpen(false)}>Cancel</Button>
                        <Button onClick={commitRawItem}>Add to Cart</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rental Item Dialog */}
            <Dialog open={isRentalModalOpen} onOpenChange={setIsRentalModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Add Rental: {activeRental?.name}</DialogTitle>
                    </DialogHeader>
                    {activeRental && (
                        <div className="flex flex-col gap-6 py-4">
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-24 rounded-lg bg-blue-50 flex-shrink-0 border border-blue-100 shadow-sm relative overflow-hidden">
                                    {activeRental.imageUrl ? <ImagePreview src={activeRental.imageUrl} className="object-cover w-full h-full absolute inset-0" alt={activeRental.name} /> : <div className="text-[10px] w-full h-full flex items-center justify-center text-blue-400 font-semibold">N/A</div>}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-lg">{activeRental.name}</span>
                                    <span className="text-sm border border-blue-200 bg-blue-50 text-blue-700 w-max px-2 py-0.5 rounded-full mt-1 uppercase text-[10px] font-bold">{activeRental.category?.name || 'Uncategorized'}</span>
                                    <span className="text-sm font-semibold mt-2 text-blue-600">${activeRental.dailyPrice.toFixed(2)} / day</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
                                <div className="flex flex-col gap-2">
                                    <Label>Start Date</Label>
                                    <Input type="date" value={rentalStartDate} onChange={(e) => setRentalStartDate(e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label>End Date</Label>
                                    <Input type="date" value={rentalEndDate} onChange={(e) => setRentalEndDate(e.target.value)} min={rentalStartDate} />
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm">Quantity to Add:</span>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="number"
                                            className="w-24 text-center font-bold"
                                            min={1}
                                            max={rentalCheckStatus.maxAvailable || 1}
                                            value={rentalQty}
                                            onChange={e => setRentalQty(parseInt(e.target.value) || 1)}
                                            disabled={rentalCheckStatus.loading || rentalCheckStatus.maxAvailable === 0}
                                        />
                                        <span className="text-xs text-muted-foreground w-32 border-l pl-3">
                                            {rentalCheckStatus.loading ? (
                                                <span className="animate-pulse">Checking API...</span>
                                            ) : rentalCheckStatus.error ? (
                                                <span className="text-destructive font-bold text-[10px] uppercase">Error: {rentalCheckStatus.error}</span>
                                            ) : rentalCheckStatus.maxAvailable !== null ? (
                                                <span><strong className={rentalCheckStatus.maxAvailable > 0 ? "text-primary" : "text-destructive"}>{rentalCheckStatus.maxAvailable}</strong> available for these dates</span>
                                            ) : null}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-3 rounded-lg mt-2">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-blue-900">Total Rental Cost:</span>
                                        <span className="text-[10px] text-blue-600 uppercase font-semibold mt-0.5">Calculated automatically</span>
                                    </div>
                                    <div className="flex items-center gap-1 font-mono text-lg font-black text-blue-700">
                                        ${(() => {
                                            const s = new Date(rentalStartDate);
                                            const e = new Date(rentalEndDate);
                                            const diffDays = Math.max(1, Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
                                            if (isNaN(diffDays)) return "0.00";
                                            return (activeRental.dailyPrice * diffDays * rentalQty).toFixed(2);
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRentalModalOpen(false)}>Cancel</Button>
                        <Button onClick={commitRental} disabled={rentalCheckStatus.loading || rentalCheckStatus.maxAvailable === 0 || rentalQty < 1}>Add to Cart</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
