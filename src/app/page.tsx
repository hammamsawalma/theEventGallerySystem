import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, DollarSign, Package, Users, Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  // Fetch real data from the database
  const totalRevenueResult = await prisma.sale.aggregate({
    _sum: { totalAmount: true }
  });
  const totalRevenue = totalRevenueResult._sum.totalAmount || 0;

  const kitsAssembledResult = await prisma.kit.aggregate({
    _sum: { currentStock: true }
  });
  const kitsAssembled = kitsAssembledResult._sum.currentStock || 0;

  const totalCustomers = await prisma.customer.count();

  const pendingPurchases = await prisma.purchase.count({
    where: { status: "PENDING" }
  });

  const recentSales = await prisma.sale.findMany({
    take: 5,
    orderBy: { date: 'desc' },
    include: { customer: true }
  });

  const recentLogs = await prisma.systemLog.findMany({
    take: 5,
    orderBy: { date: 'desc' }
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Lifetime gross sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kits Assembled</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kitsAssembled}</div>
            <p className="text-xs text-muted-foreground">In active stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Registered in CRM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Purchases</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPurchases}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Recent Sales Activity</CardTitle>
            <Link href="/orders" className="text-sm text-primary hover:underline font-medium">View All Orders &rarr;</Link>
          </CardHeader>
          <CardContent>
            {recentSales.length > 0 ? (
              <div className="space-y-4">
                {recentSales.map(sale => (
                  <div key={sale.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{sale.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{sale.date.toLocaleDateString()}</p>
                    </div>
                    <div className="font-medium">+${sale.totalAmount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center border-dashed border-2 rounded-md text-muted-foreground">
                No recent sales
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>System Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length > 0 ? (
              <div className="space-y-4">
                {recentLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-4">
                    <Activity className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center border-dashed border-2 rounded-md text-muted-foreground">
                No recent logs
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
