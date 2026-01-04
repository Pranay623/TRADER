'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAPIKeys } from '@/hooks/useAPIKeys';
import { getExchangeInfo, getOpenOrders, getAllOrders } from '@/lib/binance';
import { useTrading } from '@/context/TradingContext';
import { ArrowUp, ArrowDown, Pencil, Search } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';


export default function PositionsTable() {
    const [activeTab, setActiveTab] = useState<'POSITIONS' | 'ORDERS' | 'TRADES'>('POSITIONS');
    const { apiKey, secretKey } = useAPIKeys();
    const { symbol, lastPrice, refreshAccountInfo } = useTrading(); // Use lastPrice from context for real-time PnL

    const [exchangeInfoMap, setExchangeInfoMap] = useState<Record<string, any>>({});

    // Data States
    const [orders, setOrders] = useState<any[]>([]);
    const [trades, setTrades] = useState<any[]>([]);
    const [position, setPosition] = useState<any | null>(null);

    // Loading/Error States
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const [isLoadingTrades, setIsLoadingTrades] = useState(false);
    const [isLoadingPosition, setIsLoadingPosition] = useState(false);

    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [tradesError, setTradesError] = useState<string | null>(null);

    const formatOrderPrice = (order: any) => {
        const rawPrice = order?.price;
        if (rawPrice === undefined || rawPrice === null || rawPrice === '') {
            return order?.type === 'MARKET' ? 'MARKET' : '-';
        }
        const numericPrice = typeof rawPrice === 'number' ? rawPrice : Number.parseFloat(String(rawPrice));
        if (!Number.isFinite(numericPrice)) {
            return order?.type === 'MARKET' ? 'MARKET' : '-';
        }
        return numericPrice.toFixed(2);
    };

    const formatNumber = (value: string | number, decimals: number) => {
        const num = typeof value === 'number' ? value : parseFloat(value);
        return isNaN(num) ? 'N/A' : num.toFixed(decimals);
    };


    useEffect(() => {
        if (activeTab !== 'ORDERS' || !apiKey || !secretKey || !symbol) return;

        const controller = new AbortController();

        const fetchOrders = async () => {
            setIsLoadingOrders(true);
            try {
                // Fetch ALL orders (history + open) ensuring filled market orders are seen
                const data = await getAllOrders(apiKey, secretKey, symbol, controller.signal);
                if (!controller.signal.aborted) {
                    // Sort by time descending (newest first)
                    if (Array.isArray(data)) {
                        setOrders(data.sort((a: any, b: any) => b.time - a.time));
                    }
                    setOrdersError(null);
                }
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') return;
                console.error("Failed to fetch orders", error);
                if (!controller.signal.aborted) {
                    setOrdersError(error instanceof Error ? error.message : "Failed to load orders");
                }
            } finally {
                if (!controller.signal.aborted) setIsLoadingOrders(false);
            }
        };

        fetchOrders();
        const interval = setInterval(fetchOrders, 3000);
        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [activeTab, apiKey, secretKey, symbol]);


    const [accountData, setAccountData] = useState<any>(null);

    useEffect(() => {
        const fetchExchangeInfo = async () => {
            try {
                const info = await getExchangeInfo();
                const map: Record<string, any> = {};
                if (info?.symbols && Array.isArray(info.symbols)) {
                    info.symbols.forEach((s: any) => {
                        if (s?.symbol) map[s.symbol] = s;
                    });
                }
                setExchangeInfoMap(map);
            } catch (error) {
                console.error('Failed to fetch exchange info', error);
            }
        };

        fetchExchangeInfo();
    }, []);

    useEffect(() => {
        if (!apiKey || !secretKey || !symbol) return;


        if (activeTab !== 'TRADES' && activeTab !== 'POSITIONS') return;

        const controller = new AbortController();

        const fetchData = async () => {
            if (activeTab === 'TRADES') setIsLoadingTrades(true);
            if (activeTab === 'POSITIONS' && !accountData) setIsLoadingPosition(true); // Only show loading on first load

            try {

                const { getAccountInfo, getMyTrades } = await import('@/lib/binance');

                const [accData, tradeData] = await Promise.all([
                    activeTab === 'POSITIONS' ? getAccountInfo(apiKey, secretKey, controller.signal) : Promise.resolve(null),
                    getMyTrades(apiKey, secretKey, symbol, controller.signal)
                ]);

                if (controller.signal.aborted) return;

                if (accData) setAccountData(accData);

                if (Array.isArray(tradeData)) {

                    setTrades([...tradeData].reverse());
                    setTradesError(null);
                }
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') return;
                console.error("Failed to fetch data", error);
                if (activeTab === 'TRADES') setTradesError(error instanceof Error ? error.message : "Failed to load trades");
            } finally {
                if (activeTab === 'TRADES') setIsLoadingTrades(false);
                if (activeTab === 'POSITIONS') setIsLoadingPosition(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [activeTab, apiKey, secretKey, symbol]);

    useEffect(() => {
        if (activeTab !== 'POSITIONS' || !accountData) {
            if (activeTab === 'POSITIONS' && !accountData && !isLoadingPosition) {
            } else if (activeTab !== 'POSITIONS') {
                setPosition(null);
            }
            return;
        }

        try {

            const KNOWN_QUOTES = ['USDT', 'BUSD', 'BTC', 'ETH', 'BNB', 'TRY', 'USD'];

            let baseAsset: string | undefined = exchangeInfoMap?.[symbol]?.baseAsset;
            if (!baseAsset) {
                const detectedQuote = KNOWN_QUOTES.find(q => symbol.endsWith(q));
                if (detectedQuote && symbol.length > detectedQuote.length) {
                    baseAsset = symbol.slice(0, -detectedQuote.length);
                }
            }

            if (!baseAsset) {
                if (symbol.endsWith('USDT')) baseAsset = symbol.slice(0, -4);
                else if (symbol.endsWith('BUSD')) baseAsset = symbol.slice(0, -4);
                else baseAsset = symbol.replace('USDT', '');
            }

            let balanceQty = 0.0;
            const balanceObj = accountData.balances.find((b: any) => b.asset === baseAsset);
            if (balanceObj) {
                balanceQty = parseFloat(balanceObj.free) + parseFloat(balanceObj.locked);
            }


            let buyQty = 0.0;
            let buyCost = 0.0;
            let sellQty = 0.0;
            let sellValue = 0.0;


            trades.forEach((t: any) => {
                const qty = parseFloat(t.qty);
                const price = parseFloat(t.price);

                if (t.isBuyer) {
                    buyQty += qty;
                    buyCost += qty * price;
                } else {
                    sellQty += qty;
                    sellValue += qty * price;
                }
            });

            const entryPrice = buyQty > 0 ? (buyCost / buyQty) : 0;
            const realizedPnl = sellValue - (sellQty * entryPrice);

            const marketPrice = lastPrice || 0;

            const unrealizedPnl = (marketPrice - entryPrice) * balanceQty;

            if (balanceQty > 0 || trades.length > 0) {
                setPosition({
                    symbol: symbol,
                    size: balanceQty,
                    entryPrice: entryPrice,
                    marketPrice: marketPrice,
                    realizedPnl: realizedPnl,
                    unrealizedPnl: unrealizedPnl,
                    pnlPercent: entryPrice > 0 ? ((marketPrice - entryPrice) / entryPrice) * 100 : 0
                });
            } else {
                setPosition(null);
            }

        } catch (err) {
            console.error("Position Calc Error", err);
        }
    }, [activeTab, accountData, trades, lastPrice, symbol, exchangeInfoMap]);


    const parentRef = useRef<HTMLDivElement>(null);


    const currentData = React.useMemo(() => {
        if (activeTab === 'POSITIONS') return position ? [position] : [];
        if (activeTab === 'ORDERS') return orders;
        if (activeTab === 'TRADES') return trades;
        return [];
    }, [activeTab, position, orders, trades]);

    const rowVirtualizer = useVirtualizer({
        count: currentData.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 55,
        overscan: 5,
    });

    const renderRow = (virtualRow: any) => {
        const item = currentData[virtualRow.index];
        const index = virtualRow.index;

        if (activeTab === 'POSITIONS') {
            return (
                <tr key={virtualRow.key} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-6 py-4 flex items-center gap-3">
                        <div
                            className={`h-8 w-8 flex items-center justify-center rounded-full
                      ${item.unrealizedPnl >= 0
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-red-100 text-red-600'
                                }`}
                        >
                            {item.unrealizedPnl >= 0 ? (
                                <ArrowUp size={14} />
                            ) : (
                                <ArrowDown size={14} />
                            )}
                        </div>
                        <span className="font-semibold">{item.symbol}</span>
                    </td>

                    <td className="px-6 py-4 text-right font-mono">
                        {formatNumber(item.size, 4)}
                    </td>

                    <td className="px-6 py-4 text-right font-mono">
                        ${formatNumber(item.entryPrice, 2)}
                    </td>

                    <td className="px-6 py-4 text-right font-mono">
                        ${formatNumber(item.marketPrice, 2)}
                    </td>

                    <td
                        className={`px-6 py-4 text-right font-mono
                    ${item.realizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}
                    >
                        {item.realizedPnl >= 0 ? '+' : ''}
                        {formatNumber(item.realizedPnl, 2)}
                    </td>

                    <td className="px-6 py-4 text-right font-mono">
                        <div
                            className={
                                item.unrealizedPnl >= 0
                                    ? 'text-green-500'
                                    : 'text-red-500'
                            }
                        >
                            {item.unrealizedPnl >= 0 ? '+' : ''}
                            {formatNumber(item.unrealizedPnl, 2)}
                            <div className="text-xs opacity-70">
                                ({formatNumber(item.pnlPercent, 2)}%)
                            </div>
                        </div>
                    </td>
                </tr>
            );
        }

        if (activeTab === 'ORDERS') {
            const order = item;
            return (
                <tr key={virtualRow.key} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{order.symbol}</td>
                    <td className="px-6 py-4 text-neutral-500 text-xs">{order.type}</td>
                    <td className={`px-6 py-4 font-bold ${order.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>{order.side}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatOrderPrice(order)}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatNumber(order.origQty, 4)}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatNumber(order.executedQty, 4)}</td>
                    <td className="px-6 py-4 text-right text-xs bg-neutral-100 dark:bg-neutral-800 rounded px-2 py-1">{order.status}</td>
                </tr>
            );
        }

        if (activeTab === 'TRADES') {
            const trade = item;
            return (
                <tr key={virtualRow.key} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 text-neutral-500 text-xs">
                        {trade.time ? new Date(trade.time).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-medium">{trade.symbol}</td>
                    <td className={`px-6 py-4 font-bold ${trade.isBuyer ? 'text-green-500' : 'text-red-500'}`}>{trade.isBuyer ? 'BUY' : 'SELL'}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatNumber(trade.price, 2)}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatNumber(trade.qty, 4)}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatNumber(trade.quoteQty, 2)}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-neutral-400">{formatNumber(trade.commission, 6)} {trade.commissionAsset}</td>
                </tr>
            );
        }
        return null;
    };

    const TabButton = ({ id }: { id: 'POSITIONS' | 'ORDERS' | 'TRADES' }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition
        ${activeTab === id
                    ? 'bg-neutral-100 dark:bg-neutral-700 text-black dark:text-white'
                    : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
        >
            {id.charAt(0) + id.slice(1).toLowerCase()}
        </button>
    );

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex gap-1 rounded-full border border-neutral-200 dark:border-neutral-700 p-1">
                    <TabButton id="POSITIONS" />
                    <TabButton id="ORDERS" />
                    <TabButton id="TRADES" />
                </div>

                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                        placeholder="Search"
                        className="pl-9 pr-3 py-1.5 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 outline-none"
                    />
                </div>
            </div>

            <div ref={parentRef} className="p-0 overflow-auto flex-grow h-full" style={{ contain: 'strict' }}>
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                    <table className="w-full text-left text-sm" style={{ transform: `translateY(${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px)` }}>
                        <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 sticky top-0 z-10" style={{ transform: `translateY(-${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px)` }}>
                            <tr>
                                {activeTab === 'POSITIONS' ? (
                                    <>
                                        <th className="px-6 py-3 font-medium">Symbol</th>
                                        <th className="px-6 py-3 font-medium text-right">Size</th>
                                        <th className="px-6 py-3 font-medium text-right">Entry Price</th>
                                        <th className="px-6 py-3 font-medium text-right">Market Price</th>
                                        <th className="px-6 py-3 font-medium text-right">Realized PnL</th>
                                        <th className="px-6 py-3 font-medium text-right">Unrealized PnL</th>
                                    </>
                                ) : activeTab === 'ORDERS' ? (
                                    <>
                                        <th className="px-6 py-3 font-medium">Symbol</th>
                                        <th className="px-6 py-3 font-medium">Type</th>
                                        <th className="px-6 py-3 font-medium">Side</th>
                                        <th className="px-6 py-3 font-medium text-right">Price</th>
                                        <th className="px-6 py-3 font-medium text-right">Amount</th>
                                        <th className="px-6 py-3 font-medium text-right">Filled</th>
                                        <th className="px-6 py-3 font-medium text-right">Status</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-3 font-medium">Time</th>
                                        <th className="px-6 py-3 font-medium">Symbol</th>
                                        <th className="px-6 py-3 font-medium">Side</th>
                                        <th className="px-6 py-3 font-medium text-right">Price</th>
                                        <th className="px-6 py-3 font-medium text-right">Qty</th>
                                        <th className="px-6 py-3 font-medium text-right">Quote Qty</th>
                                        <th className="px-6 py-3 font-medium text-right">Commission</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => renderRow(virtualRow))}
                        </tbody>
                    </table>
                </div>

                {activeTab === 'POSITIONS' && !position && !isLoadingPosition && (
                    <div className="p-8 text-center text-neutral-400 absolute inset-0 flex items-center justify-center top-10">No open position for {symbol}</div>
                )}

                {activeTab === 'POSITIONS' && isLoadingPosition && !position && (
                    <div className="p-8 text-center text-neutral-400 absolute inset-0 flex items-center justify-center top-10">Loading position...</div>
                )}


                {activeTab === 'ORDERS' && orders.length === 0 && (
                    <div className="p-8 text-center text-neutral-400 absolute inset-0 flex items-center justify-center top-10">
                        {isLoadingOrders ? "Loading orders..." :
                            ordersError ? <span className="text-red-500">{ordersError}</span> :
                                (!apiKey ? "Connect API Keys to view orders" : "No open orders")}
                    </div>
                )}

                {activeTab === 'TRADES' && trades.length === 0 && (
                    <div className="p-8 text-center text-neutral-400 absolute inset-0 flex items-center justify-center top-10">
                        {isLoadingTrades ? "Loading trades..." :
                            tradesError ? <span className="text-red-500">{tradesError}</span> :
                                (!apiKey ? "Connect API Keys to view trades" : "No recent trades for this symbol")}
                    </div>
                )}
            </div>
        </div>
    );
}
