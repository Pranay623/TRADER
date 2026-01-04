'use client';

import Navbar from "@/components/Navbar";
import OrderPanel from "@/components/OrderPanel/OrderForm";
import { ChartComponent } from "@/components/Chart/ChartComponent";
import PositionsTable from "@/components/PositionsTable/PositionsTable";
import dynamic from 'next/dynamic';

const DraggableGrid = dynamic(() => import('@/components/Dashboard/DraggableGrid'), {
    ssr: false,
    loading: () => <div className="p-4">Loading Dashboard Layout...</div>
});

export default function Dashboard() {
    return (
        // Premium Gradient Background
        <div className="h-screen bg-[#F0F2F5] dark:bg-[#050505] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-neutral-50 to-white dark:from-indigo-950/20 dark:via-[#050505] dark:to-[#050505]">
            <Navbar />

            <main className="flex-grow h-[calc(100vh-56px)] overflow-y-auto p-2">
                <DraggableGrid>
                    {/* Left Column: Order Panel & Account */}
                    <div key="order-panel" className="
                        glass-panel rounded-xl flex flex-col overflow-hidden h-full 
                        border border-white/40 dark:border-white/5 
                        shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]
                        backdrop-blur-xl bg-white/70 dark:bg-[#121212]/80
                    ">
                        <div className="drag-handle cursor-grab active:cursor-grabbing px-4 py-3 flex justify-between items-center group border-b border-black/5 dark:border-white/5">
                            <span className="text-xs font-semibold tracking-wide text-neutral-600 dark:text-neutral-300">Trading Panel</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                            </div>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                            <OrderPanel />

                            <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5">
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3">Account</h3>
                                <div className="space-y-3 text-xs font-medium">
                                    <div className="flex justify-between items-center">
                                        <span className="text-neutral-500">Margin Ratio</span>
                                        <span className="font-mono text-neutral-800 dark:text-neutral-200">0.00%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-neutral-500">Maintenance</span>
                                        <span className="font-mono text-neutral-800 dark:text-neutral-200">0.00 USDT</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-neutral-500">Balance</span>
                                        <span className="font-mono text-neutral-800 dark:text-neutral-200">10,091.69</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chart Section */}
                    <div key="chart" className="
                        glass-panel rounded-xl flex flex-col overflow-hidden h-full 
                        border border-white/40 dark:border-white/5 
                        shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]
                        backdrop-blur-xl bg-white/70 dark:bg-[#121212]/80
                    ">
                        <div className="drag-handle cursor-grab active:cursor-grabbing px-4 py-3 flex justify-between items-center group border-b border-black/5 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold tracking-wide text-neutral-600 dark:text-neutral-300">Chart</span>
                                <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">BTCUSDT</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                            </div>
                        </div>
                        <div className="flex-grow relative">
                            <ChartComponent />
                        </div>
                    </div>

                    {/* Positions Table */}
                    <div key="positions" className="
                        glass-panel rounded-xl flex flex-col overflow-hidden h-full 
                        border border-white/40 dark:border-white/5 
                        shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]
                        backdrop-blur-xl bg-white/70 dark:bg-[#121212]/80
                    ">
                        <div className="drag-handle cursor-grab active:cursor-grabbing px-4 py-3 flex justify-between items-center group border-b border-black/5 dark:border-white/5">
                            <span className="text-xs font-semibold tracking-wide text-neutral-600 dark:text-neutral-300">Positions & Orders</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                            </div>
                        </div>
                        <div className="flex-grow overflow-hidden">
                            <PositionsTable />
                        </div>
                    </div>
                </DraggableGrid>
            </main>
        </div>
    );
}
