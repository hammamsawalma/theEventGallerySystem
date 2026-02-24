import Link from "next/link";
import {
    CreditCard,
    Home,
    Package,
    PackageSearch,
    Settings,
    ShoppingCart,
    Wrench,
    ClipboardList,
    Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function NavLinks() {
    return (
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            <Link
                href="/"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
                <Home className="h-4 w-4" />
                Dashboard
            </Link>
            <Link
                href="/orders"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
                <ClipboardList className="h-4 w-4" />
                Orders History
            </Link>
            <Link
                href="/sales"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
                <ShoppingCart className="h-4 w-4" />
                POS & Sales
            </Link>
            <Link
                href="/raw-items"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
                <PackageSearch className="h-4 w-4" />
                Raw Items & Purchases
            </Link>
            <Link
                href="/kits"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
                <Package className="h-4 w-4" />
                Kits & Inventory
            </Link>
            <Link
                href="/manufacturing"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
                <Wrench className="h-4 w-4" />
                Kit Assembly (BOM)
            </Link>
            <Link
                href="/finances"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
                <CreditCard className="h-4 w-4" />
                Finances & P&L
            </Link>
        </nav>
    )
}

export function Sidebar() {
    return (
        <>
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <Package className="h-6 w-6" />
                    <span className="font-bold">Event Gallery</span>
                </Link>
            </div>
            <div className="flex-1 overflow-auto py-2">
                <NavLinks />
            </div>
        </>
    );
}

export function MobileSidebar() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 md:hidden"
                >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
                <div className="flex h-14 items-center border-b px-4 mt-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <Package className="h-6 w-6" />
                        <span className="font-bold">Event Gallery</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-auto py-4">
                    <NavLinks />
                </div>
            </SheetContent>
        </Sheet>
    )
}
