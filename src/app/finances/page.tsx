"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FinancesPage() {
    const [pl, setPl] = useState<any>(null);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // Expense Logger State
    const [isExpenseOpen, setIsExpenseOpen] = useState(false);
    const [newExpense, setNewExpense] = useState({ categoryId: "", amount: 0, description: "" });
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    const fetchData = () => {
        fetch("/api/reports/pl").then(res => res.json()).then(setPl);
        fetch("/api/expenses").then(res => res.json()).then(setExpenses);
        fetch("/api/expenses/categories").then(res => res.json()).then(setCategories);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateCategory = async () => {
        if (!newCategoryName) return;
        const res = await fetch("/api/expenses/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newCategoryName })
        });
        if (res.ok) {
            const cat = await res.json();
            setCategories(prev => [...prev, cat]);
            setNewExpense(prev => ({ ...prev, categoryId: cat.id }));
            setIsAddingCategory(false);
            setNewCategoryName("");
        }
    };

    const handleLogExpense = async () => {
        if (!newExpense.categoryId || newExpense.amount <= 0) {
            alert("Category and a valid amount are required.");
            return;
        }

        const res = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newExpense)
        });

        if (res.ok) {
            setIsExpenseOpen(false);
            setNewExpense({ categoryId: "", amount: 0, description: "" });
            fetchData();
        } else {
            alert("Failed to log expense.");
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Finances & P&L</h1>
                <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
                    <DialogTrigger asChild>
                        <Button>Log New Expense</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Log Operating Expense</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {!isAddingCategory ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Expense Category</Label>
                                        <Button variant="link" size="sm" className="h-4 p-0" onClick={() => setIsAddingCategory(true)}>+ New Category</Button>
                                    </div>
                                    <Select value={newExpense.categoryId} onValueChange={val => setNewExpense(prev => ({ ...prev, categoryId: val }))}>
                                        <SelectTrigger><SelectValue placeholder="Select Category..." /></SelectTrigger>
                                        <SelectContent>
                                            {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>New Category Name</Label>
                                    <div className="flex gap-2">
                                        <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                                        <Button type="button" onClick={handleCreateCategory}>Add</Button>
                                        <Button type="button" variant="outline" onClick={() => setIsAddingCategory(false)}>Cancel</Button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Amount $</Label>
                                <Input type="number" value={newExpense.amount || ''} onChange={e => setNewExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input value={newExpense.description} onChange={e => setNewExpense(prev => ({ ...prev, description: e.target.value }))} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleLogExpense}>Save Expense</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Profit & Loss Statement</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Generated from live transaction snapshot COGS data.</p>
                    </CardHeader>
                    <CardContent>
                        {pl ? (
                            <div className="flex flex-col gap-4 text-base">
                                <div className="flex justify-between border-b pb-2">
                                    <span>Gross Sales</span>
                                    <span className="font-bold">${pl.totalSales?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-red-600 border-b pb-2">
                                    <span>(-) Cost of Goods Sold</span>
                                    <span className="font-bold">${pl.costOfGoodsSold?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-b pb-2 pt-2 text-primary">
                                    <span>Gross Profit</span>
                                    <span>${pl.grossProfit?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-red-600 border-b pb-2 pt-2">
                                    <span>(-) Operating Expenses</span>
                                    <span className="font-bold">${pl.totalExpenses?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-2xl pt-4">
                                    <span>Net Profit</span>
                                    <span className={pl.netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                                        ${pl.netProfit?.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-muted-foreground">Loading P&L...</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Recent Expenses Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(expense.date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{expense.category?.name || 'General'}</TableCell>
                                        <TableCell>{expense.description || '-'}</TableCell>
                                        <TableCell className="text-right font-bold text-red-600">
                                            -${expense.amount.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {expenses.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            No operating expenses recorded.
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
