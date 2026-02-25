import { Metadata } from "next";
import RentalsClient from "./RentalsClient";

export const metadata: Metadata = {
    title: "Rental Inventory | Event Gallery System",
    description: "Manage rental assets and equipment.",
};

export default function RentalsPage() {
    return (
        <div className="p-4 md:p-6 lg:p-8 w-full max-w-[1600px] mx-auto overflow-x-hidden">
            <RentalsClient />
        </div>
    );
}
