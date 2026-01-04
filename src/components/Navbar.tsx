'use client';

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from 'next/link';
import { useTrading } from "@/context/TradingContext";
import { AccountModal } from "./AccountModal";
import Image from 'next/image';

export default function Navbar() {
    const { theme, setTheme } = useTheme();
    const { accountInfo } = useTrading();
    const [mounted, setMounted] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

    const usdtBalance = accountInfo?.balances?.find((b: any) => b.asset === 'USDT')?.free;

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <nav className="flex items-center justify-between px-6 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
               <div className="flex items-center space-x-2 select-none">
    {/* Logo Icon */}
    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-900 dark:bg-white">
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white dark:text-neutral-900"
        >
            {/* Candlestick / trading bars */}
            <line x1="6" y1="4" x2="6" y2="20" />
            <rect x="4" y="8" width="4" height="6" />
            <line x1="12" y1="6" x2="12" y2="18" />
            <rect x="10" y="9" width="4" height="5" />
            <line x1="18" y1="3" x2="18" y2="21" />
            <rect x="16" y="7" width="4" height="8" />
        </svg>
    </div>

    {/* Brand Name */}
    <span className="text-lg font-bold tracking-wide text-neutral-900 dark:text-white">
        TRADER
    </span>
</div>

            </nav>
        );
    }

    return (
        <nav className="flex items-center justify-between px-4 md:px-6 py-2.5 bg-[#F9FAFB] dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 transition-colors">
            <div className="flex items-center space-x-2 select-none">
                {/* Logo Icon */}
                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-900 dark:bg-white">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white dark:text-neutral-900"
                    >
                        {/* Candlestick / trading bars */}
                        <line x1="6" y1="4" x2="6" y2="20" />
                        <rect x="4" y="8" width="4" height="6" />
                        <line x1="12" y1="6" x2="12" y2="18" />
                        <rect x="10" y="9" width="4" height="5" />
                        <line x1="18" y1="3" x2="18" y2="21" />
                        <rect x="16" y="7" width="4" height="8" />
                    </svg>
                </div>

                {/* Brand Name */}
                <span className="text-lg font-bold tracking-wide text-neutral-900 dark:text-white">
                    TRADER
                </span>
            </div>


            <div className="flex items-center space-x-4">

                <div className="flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full border border-green-200 dark:border-green-800">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Live trading</span>
                </div>

                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
                >
                    {theme === 'dark' ? (

                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    ) : (

                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                    )}
                </button>

                <Link href="/settings" className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.35a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                </Link>



                {accountInfo ? (
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-xs text-neutral-500 font-medium">Available Balance</span>
                        <span className="text-sm font-bold font-mono">{parseFloat(usdtBalance || '0').toFixed(2)} USDT</span>
                    </div>
                ) : (
                    <div className="hidden md:block mr-2 text-xs text-neutral-400">Not Connected</div>
                )}


                <button
                    onClick={() => setIsAccountModalOpen(true)}
                    className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden border border-neutral-300 dark:border-neutral-600 relative group cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-blue-500 transition-all"
                >
                    <svg className="w-full h-full text-neutral-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>


                    {accountInfo && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-neutral-900 rounded-full"></div>}
                </button>

                <AccountModal
                    isOpen={isAccountModalOpen}
                    onClose={() => setIsAccountModalOpen(false)}
                    accountInfo={accountInfo}
                />
            </div>
        </nav>
    );
}
