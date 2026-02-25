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
    Menu,
    History,
    Activity,
    Tent // Added Tent icon for Rentals
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function NavLinks() {
    return (
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 py-4 gap-4">
            <div>
                <Link
                    href="/"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted/50"
                >
                    <Home className="h-4 w-4" />
                    Dashboard
                </Link>
            </div>

            <div>
                <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Inventory Management</div>
                <Link
                    href="/raw-items"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted/50"
                >
                    <PackageSearch className="h-4 w-4" />
                    Raw Materials
                </Link>
                <Link
                    href="/purchases"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted/50"
                >
                    <History className="h-4 w-4" />
                    Purchase History
                </Link>
                <Link
                    href="/rentals"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted/50"
                >
                    <Tent className="h-4 w-4" />
                    Rental Inventory
                </Link>
            </div>

            <div>
                <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Production</div>
                <Link
                    href="/kits"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted/50"
                >
                    <Package className="h-4 w-4" />
                    Kit Definitions
                </Link>
                <Link
                    href="/manufacturing"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted/50"
                >
                    <Wrench className="h-4 w-4" />
                    Smart Assembly
                </Link>
            </div>

            <div>
                <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Sales & Orders</div>
                <Link
                    href="/sales"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted/50"
                >
                    <ShoppingCart className="h-4 w-4" />
                    Point of Sale
                </Link>
                <Link
                    href="/orders"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted/50"
                >
                    <ClipboardList className="h-4 w-4" />
                    Order History
                </Link>
            </div>

            <div>
                <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Administration</div>
                <Link
                    href="/finances"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted/50"
                >
                    <CreditCard className="h-4 w-4" />
                    Finances & P&L
                </Link>
                <Link
                    href="/system-logs"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted/50"
                >
                    <Activity className="h-4 w-4 shrink-0" />
                    System Logs
                </Link>
            </div>
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
