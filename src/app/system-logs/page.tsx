import { Metadata } from "next";
import SystemLogsClient from "./SystemLogsClient";

export const metadata: Metadata = {
    title: "System Logs | Event Gallery System",
    description: "Audit trail and system logs",
};

export default function SystemLogsPage() {
    return (
        <div className="p-4 md:p-6 lg:p-8 w-full max-w-[1600px] mx-auto overflow-x-hidden">
            <SystemLogsClient />
        </div>
    );
}
