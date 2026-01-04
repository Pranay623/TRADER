import React, { useRef, useEffect } from 'react';
import { X, Wallet, CheckCircle, XCircle } from 'lucide-react';
import { AccountInfo, BinanceBalance } from '@/types/binance';

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    accountInfo: AccountInfo | null;
}

export const AccountModal = ({ isOpen, onClose, accountInfo }: AccountModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen || !accountInfo) return null;

    const activeBalances = accountInfo.balances.filter(
        (b: BinanceBalance) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
                ref={modalRef}
                className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold dark:text-white">Account Wallet</h2>
                            <p className="text-sm text-neutral-500">UID: {accountInfo.uid || '---'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition">
                        <X size={20} className="text-neutral-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Status Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatusCard label="Account Type" value={accountInfo.accountType} />
                        <StatusCard label="Trading" active={accountInfo.canTrade} />
                        <StatusCard label="Deposits" active={accountInfo.canDeposit} />
                        <StatusCard label="Withdrawals" active={accountInfo.canWithdraw} />
                    </div>

                    {/* Commissions */}
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg">
                        <h3 className="text-sm font-semibold mb-3 text-neutral-500 uppercase tracking-wider">Commission Rates</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-neutral-400 block text-xs">Maker</span>
                                <span className="font-mono">{accountInfo.commissionRates.maker}</span>
                            </div>
                            <div>
                                <span className="text-neutral-400 block text-xs">Taker</span>
                                <span className="font-mono">{accountInfo.commissionRates.taker}</span>
                            </div>
                            <div>
                                <span className="text-neutral-400 block text-xs">Buyer</span>
                                <span className="font-mono">{accountInfo.commissionRates.buyer}</span>
                            </div>
                            <div>
                                <span className="text-neutral-400 block text-xs">Seller</span>
                                <span className="font-mono">{accountInfo.commissionRates.seller}</span>
                            </div>
                        </div>
                    </div>

                    {/* Balances */}
                    <div>
                        <h3 className="text-sm font-semibold mb-4 text-neutral-500 uppercase tracking-wider">Asset Balances</h3>
                        {activeBalances.length === 0 ? (
                            <div className="text-center py-8 text-neutral-500">No active balances found.</div>
                        ) : (
                            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Asset</th>
                                            <th className="px-4 py-3 font-medium text-right">Free</th>
                                            <th className="px-4 py-3 font-medium text-right">Locked</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                        {activeBalances.map((b) => (
                                            <tr key={b.asset} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition">
                                                <td className="px-4 py-3 font-bold">{b.asset}</td>
                                                <td className="px-4 py-3 text-right font-mono text-neutral-700 dark:text-neutral-300">{parseFloat(b.free).toFixed(8)}</td>
                                                <td className="px-4 py-3 text-right font-mono text-neutral-400">{parseFloat(b.locked).toFixed(8)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

const StatusCard = ({ label, value, active }: { label: string, value?: string, active?: boolean }) => (
    <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg flex flex-col items-center justify-center text-center">
        <span className="text-xs text-neutral-500 mb-1">{label}</span>
        {value ? (
            <span className="font-bold text-sm">{value}</span>
        ) : (
            <div className={`flex items-center space-x-1 ${active ? 'text-green-500' : 'text-red-500'}`}>
                {active ? <CheckCircle size={16} /> : <XCircle size={16} />}
                <span className="text-sm font-bold">{active ? 'Enabled' : 'Disabled'}</span>
            </div>
        )}
    </div>
);
