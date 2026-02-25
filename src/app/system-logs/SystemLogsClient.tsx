'use client';

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search } from "lucide-react";

type SystemLog = {
    id: string;
    userId: string;
    action: string;
    details: string;
    date: string;
};

export default function SystemLogsClient() {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/system-logs?limit=500'); // Fetch more logs
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.userId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
                    <p className="text-muted-foreground mt-2">View an audit trail of all recent activities performed in the system.</p>
                </div>
            </div>

            <Card className="shadow-sm">
                <CardHeader className="bg-muted/10 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Activity Trail</CardTitle>
                            <CardDescription>Recent actions recorded by the system</CardDescription>
                        </div>
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search action, details, user ID..."
                                className="pl-8 bg-background"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[200px]">Action</TableHead>
                                <TableHead className="w-[200px]">User / Actor</TableHead>
                                <TableHead>Event Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground animate-pulse">
                                            <span>Loading system logs...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id} className="cursor-default hover:bg-muted/20">
                                        <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                                            {format(new Date(log.date), "MMM d, yyyy HH:mm:ss")}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-md bg-secondary/30 px-2 py-1 text-xs font-semibold ring-1 ring-inset ring-secondary/50 uppercase tracking-wider">
                                                {log.action}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">
                                            {log.userId === 'SYSTEM' ? (
                                                <span className="text-indigo-600 font-bold text-xs uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">SYSTEM AGENT</span>
                                            ) : (
                                                <span className="font-mono text-xs">{log.userId}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {log.details}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                        No recent logs found matching your criteria.
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
