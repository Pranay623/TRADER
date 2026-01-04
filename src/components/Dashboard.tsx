'use client';

import Navbar from "@/components/Navbar";
import OrderPanel from "@/components/OrderPanel/OrderForm";
import { ChartComponent } from "@/components/Chart/ChartComponent";
import PositionsTable from "@/components/PositionsTable/PositionsTable";

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 flex flex-col font-sans">
            <Navbar />

            <main className="flex-grow p-2 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 h-auto lg:h-[calc(100vh-64px)] overflow-y-auto lg:overflow-hidden">

                {/* Left Column: Order Panel - Order 2 on Mobile (Bottom), Order 1 on Desktop (Left) */}
                <div className="lg:col-span-3 flex flex-col gap-4 lg:gap-6 order-2 lg:order-1 h-auto lg:h-full lg:overflow-y-auto pb-10 lg:pb-0">
                    <OrderPanel />

                    {/* Account Details */}
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
                        <h3 className="font-bold mb-4">Account</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Margin Ratio</span>
                                <span className="font-mono">0.00%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Maintenance Margin</span>
                                <span className="font-mono">0.00 USDT</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Margin Balance</span>
                                <span className="font-mono ">0.0000</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Chart & Tables - Order 1 on Mobile (Top), Order 2 on Desktop (Right) */}
                <div className="lg:col-span-9 flex flex-col gap-4 lg:gap-6 order-1 lg:order-2 h-auto lg:h-full lg:overflow-hidden">
                    {/* Chart Section - Fixed height on mobile, flexible on desktop */}
                    <div className="h-[450px] lg:h-auto lg:flex-grow-[2] lg:min-h-[30%] shrink-0">
                        <ChartComponent />
                    </div>

                    {/* Positions Table Section - Fixed height on mobile, flexible on desktop */}
                    <div className="h-[500px] lg:h-auto lg:flex-grow-[3] lg:min-h-[30%] lg:overflow-hidden shrink-0">
                        <PositionsTable />
                    </div>
                </div>

            </main>
        </div>
    );
}
