import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar, MobileSidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Event Gallery System",
  description: "Inventory, Manufacturing, POS, and Finances Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex h-screen overflow-hidden bg-background bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background text-foreground`}>
        {/* Desktop Sidebar */}
        <div className="hidden md:flex h-full w-64 flex-col border-r bg-background/60 backdrop-blur-xl">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Mobile Header with Hamburger */}
          <header className="flex md:hidden h-14 items-center gap-4 border-b bg-background/60 backdrop-blur-xl px-4 lg:h-[60px] lg:px-6">
            <MobileSidebar />
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
