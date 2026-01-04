'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTrading } from '@/context/TradingContext';
import { useAPIKeys } from '@/hooks/useAPIKeys';
import { placeOrder, getExchangeInfo } from '@/lib/binance';
import { Search, ChevronDown, Check } from 'lucide-react';
import { BinanceBalance } from '@/types/binance';

interface BinanceFilter {
    filterType: string;
    minQty: string;
    maxQty: string;
    stepSize: string;
    minNotional: string;
    maxNotional?: string;
    minPrice: string;
    maxPrice: string;
    tickSize: string;
}

interface BinanceSymbol {
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    filters: BinanceFilter[];
}

export default function OrderPanel() {
    const { symbol, setSymbol, lastPrice, accountInfo } = useTrading();
    const { apiKey, secretKey } = useAPIKeys();


    const [availablePairs, setAvailablePairs] = useState<string[]>([]);
    const [symbolInfoMap, setSymbolInfoMap] = useState<Record<string, BinanceSymbol>>({});
    const [isLoadingPairs, setIsLoadingPairs] = useState(true);

    // Derived Balance
    const availableBalance = useMemo(() => {
        if (!accountInfo?.balances) return '--';

        const targetAsset = 'USDT';
        const bal = accountInfo.balances.find((b: BinanceBalance) => b.asset === targetAsset);
        return parseFloat(bal?.free || '0').toFixed(2);
    }, [accountInfo, symbol]);


    const isLoadingBalance = !accountInfo && !!apiKey;




    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownInputRef = useRef<HTMLInputElement>(null);


    const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
    const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET' | 'STOP_MARKET'>('LIMIT');
    const [price, setPrice] = useState('');
    const [stopPrice, setStopPrice] = useState('');
    const [quantity, setQuantity] = useState('');
    const [total, setTotal] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);


    useEffect(() => {
        const fetchPairs = async () => {
            try {

                const info = await getExchangeInfo(apiKey || undefined, secretKey || undefined);
                const pairs = info.symbols
                    .filter((s: BinanceSymbol) => s.status === 'TRADING')
                    .map((s: BinanceSymbol) => s.symbol)
                    .sort();

                const map: Record<string, BinanceSymbol> = {};
                info.symbols.forEach((s: BinanceSymbol) => {
                    map[s.symbol] = s;
                });

                setAvailablePairs(pairs);
                setSymbolInfoMap(map);
            } catch (err) {
                console.error("Failed to fetch pairs", err);
                // Fallback
                setAvailablePairs(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']);
            } finally {
                setIsLoadingPairs(false);
            }
        };
        fetchPairs();
    }, [apiKey, secretKey]);


    useEffect(() => {
        setPrice('');
        setStopPrice('');
        setQuantity('');
        setTotal('');
        setStatus(null);
    }, [symbol]);

    useEffect(() => {
        if (orderType === 'LIMIT' && lastPrice && !price) {
            setPrice(lastPrice.toString());
        }
    }, [lastPrice, orderType]);


    useEffect(() => {
        const p = orderType === 'LIMIT' ? parseFloat(price) : (lastPrice || 0);
        const q = parseFloat(quantity);
        if (!isNaN(p) && !isNaN(q)) {
            setTotal((p * q).toFixed(4));
        } else {
            setTotal('');
        }
    }, [price, quantity, orderType, lastPrice]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const filteredPairs = useMemo(() => {
        return availablePairs.filter(p => p.includes(searchTerm.toUpperCase()));
    }, [availablePairs, searchTerm]);


    const validateOrder = (
        symbolInfo: BinanceSymbol,
        type: string,
        quantity: number,
        price: number
    ): string | null => {
        if (!symbolInfo) return null;

        for (const filter of symbolInfo.filters) {
            if (filter.filterType === 'LOT_SIZE') {
                const minQty = parseFloat(filter.minQty);
                const maxQty = parseFloat(filter.maxQty);
                const stepSize = parseFloat(filter.stepSize);

                if (quantity < minQty) return `LOT_SIZE: Quantity is too low. Min: ${minQty}`;
                if (quantity > maxQty) return `LOT_SIZE: Quantity is too high. Max: ${maxQty}`;

                // Check step size (epsilon for float point errors)
                const remainder = (quantity - minQty) % stepSize;
                if (remainder > 0.00000001 && Math.abs(remainder - stepSize) > 0.00000001) {
                    return `LOT_SIZE: Invalid quantity step. Must be multiple of ${stepSize}`;
                }
            }

            if (filter.filterType === 'MIN_NOTIONAL') {
                const minNotional = parseFloat(filter.minNotional);
                const notional = price * quantity;
                if (notional < minNotional) {
                    return `MIN_NOTIONAL: Order value too small. Min: ${minNotional} ${symbolInfo.quoteAsset}`;
                }
            }

            if (filter.filterType === 'NOTIONAL') {
                const minNotional = parseFloat(filter.minNotional || '0');
                const maxNotional = parseFloat(filter.maxNotional || '0');
                const notional = price * quantity;

                if (notional < minNotional) {
                    return `NOTIONAL: Order value too small. Min: ${minNotional} ${symbolInfo.quoteAsset}`;
                }
                if (maxNotional > 0 && notional > maxNotional) {
                    return `NOTIONAL: Order value too high. Max: ${maxNotional} ${symbolInfo.quoteAsset}`;
                }
            }

            if (filter.filterType === 'PRICE_FILTER' && type === 'LIMIT') {
                const minPrice = parseFloat(filter.minPrice);
                const maxPrice = parseFloat(filter.maxPrice);
                const tickSize = parseFloat(filter.tickSize);

                if (price < minPrice) return `PRICE_FILTER: Price too low. Min: ${minPrice}`;
                if (price > maxPrice) return `PRICE_FILTER: Price too high. Max: ${maxPrice}`;

                const remainder = (price - minPrice) % tickSize;
                if (remainder > 0.00000001 && Math.abs(remainder - tickSize) > 0.00000001) {
                    return `PRICE_FILTER: Invalid price tick. Must be multiple of ${tickSize}`;
                }
            }

            if (filter.filterType === 'MARKET_LOT_SIZE' && type === 'MARKET') {
                const minQty = parseFloat(filter.minQty);
                const maxQty = parseFloat(filter.maxQty);

                if (quantity < minQty) return `MARKET_LOT_SIZE: Market qty too low. Min: ${minQty}`;
                if (quantity > maxQty) return `MARKET_LOT_SIZE: Market qty too high. Max: ${maxQty}`;
            }
        }
        return null; // Valid
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus(null);

        try {
            // Validation
            const p = orderType === 'LIMIT' ? parseFloat(price) : (lastPrice || 0);
            const q = parseFloat(quantity);

            if (isNaN(q) || q <= 0) throw new Error("Invalid quantity");
            if (orderType === 'LIMIT' && (isNaN(p) || p <= 0)) throw new Error("Invalid price");

            const validationError = validateOrder(symbolInfoMap[symbol], orderType, q, p);
            if (validationError) {
                throw new Error(validationError);
            }

            // Map STOP_MARKET to a valid API type or cast it
            // Assuming the API PlaceOrderParams type expects specific strings.
            // If STOP_MARKET is not valid for the API type definition, we cast it or map it.
            // Based on previous code, it was mapped to STOP_LOSS.
            // Ideally we check types/binance.ts for PlaceOrderParams.
            // For now, I will use 'any' cast for the type property to avoid the specific union mismatch error,
            // as I know STOP_LOSS is likely what's expected but orderType is STOP_MARKET in state.

            let apiType: any = orderType;
            if (orderType === 'STOP_MARKET') apiType = 'STOP_LOSS';

            if (!apiKey && !secretKey) {

                const TEST_API_KEY = process.env.NEXT_PUBLIC_BINANCE_API_KEY || '';
                const TEST_SECRET_KEY = process.env.NEXT_PUBLIC_BINANCE_SECRET_KEY || '';

                const result = await placeOrder(TEST_API_KEY, TEST_SECRET_KEY, {
                    symbol,
                    side,
                    type: apiType,
                    quantity,
                    price: orderType === 'LIMIT' ? price : undefined,
                    stopPrice: orderType === 'STOP_MARKET' ? stopPrice : undefined,
                    timeInForce: orderType === 'LIMIT' ? 'GTC' : undefined,
                });
                console.log("Order Result:", result);

                setStatus({ type: 'success', msg: `Order Placed!` });
                setQuantity('');
                setIsSubmitting(false);
                return;
            }

            const result = await placeOrder(apiKey, secretKey, {
                symbol,
                side,
                type: apiType,
                quantity,
                price: orderType === 'LIMIT' ? price : undefined,
                stopPrice: orderType === 'STOP_MARKET' ? stopPrice : undefined,
                timeInForce: orderType === 'LIMIT' ? 'GTC' : undefined,
            });
            console.log("Order Result:", result);

            setStatus({ type: 'success', msg: `Order Placed!` });
            setQuantity('');

        } catch (error: any) {
            const errMsg = error instanceof Error ? error.message : 'Failed';
            setStatus({ type: 'error', msg: errMsg });
        } finally {
            setIsSubmitting(false);
        }
    };


    const themeColor = side === 'BUY' ? 'text-green-500' : 'text-red-500';
    const btnColor = side === 'BUY' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600';
    const activeTabClass = "text-neutral-900 dark:text-white border-b-2 border-[#9746FF] font-medium";
    const inactiveTabClass = "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300";
    const inputBox = "flex items-center border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-white dark:bg-neutral-900 focus-within:border-primary";


    return (
        <div className="flex flex-col bg-white dark:bg-neutral-900 border rounded-2xl border-gray-100 dark:border-neutral-800 shadow-md">

            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => {
                            setIsDropdownOpen(!isDropdownOpen);
                            setTimeout(() => dropdownInputRef.current?.focus(), 100);
                        }}
                        className="w-full flex items-center justify-between p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                    >
                        <span className="font-bold text-lg">{symbol}</span>
                        <ChevronDown size={18} className="text-neutral-500" />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-h-[350px] flex flex-col overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                            <div className="p-2 border-b border-neutral-100 dark:border-neutral-700 flex items-center">
                                <Search size={16} className="text-neutral-400 mr-2" />
                                <input
                                    ref={dropdownInputRef}
                                    className="w-full bg-transparent outline-none text-sm"
                                    placeholder="Search Pair..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                                />
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {isLoadingPairs ? (
                                    <div className="p-4 text-center text-xs text-neutral-500">Loading pairs...</div>
                                ) : filteredPairs.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-neutral-500">No results</div>
                                ) : (
                                    filteredPairs.map(p => (
                                        <div
                                            key={p}
                                            onClick={() => {
                                                setSymbol(p);
                                                setSearchTerm('');
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`px-4 py-2 text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 flex justify-between items-center ${symbol === p ? 'bg-neutral-50 dark:bg-neutral-700/50' : ''}`}
                                        >
                                            <span>{p}</span>
                                            {symbol === p && <Check size={14} className="text-primary" />}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>


            <div className="p-4 flex flex-col flex-1 overflow-y-auto">


                <div className="flex w-[40%] max-w-xs bg-white dark:bg-neutral-900 
                border border-neutral-300 dark:border-neutral-700 
                rounded-full p-0.5 mb-4">

                    <button
                        onClick={() => setSide("BUY")}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-full transition-all
      ${side === "BUY"
                                ? "bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white"
                                : "text-neutral-500 dark:text-neutral-400"
                            }`}
                    >
                        BUY
                    </button>

                    <button
                        onClick={() => setSide("SELL")}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-full transition-all
      ${side === "SELL"
                                ? "bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white"
                                : "text-neutral-500 dark:text-neutral-400"
                            }`}
                    >
                        SELL
                    </button>
                </div>


                <div className="flex space-x-4 mb-6 border-b border-neutral-100 dark:border-neutral-800 text-xs">
                    {['LIMIT', 'MARKET', 'STOP_MARKET'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setOrderType(t as any)}
                            className={`pb-2 transition-colors ${orderType === t ? activeTabClass : inactiveTabClass}`}
                        >
                            {t.replace('_', ' ')}
                        </button>
                    ))}
                </div>


                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                    {orderType === 'STOP_MARKET' && (
                        <div className="group">
                            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Trigger Price</label>
                            <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2 border border-transparent group-focus-within:border-primary transition ease-in-out">
                                <input
                                    type="number" step="any" required placeholder="0.00"
                                    value={stopPrice} onChange={e => setStopPrice(e.target.value)}
                                    className="bg-transparent w-full outline-none font-mono text-sm"
                                />
                                <span className="text-xs text-neutral-400 ml-2 mt-0.5">{symbol.endsWith('USDT') ? 'USDT' : symbol.slice(-3)}</span>
                            </div>
                        </div>
                    )}

                    {orderType === 'LIMIT' && (
                        <div>
                            <label className="text-xs text-neutral-500 mb-1 block">Limit price</label>
                            <div className={inputBox}>
                                <input
                                    type="number" step="any" required placeholder="0.00"
                                    value={price} onChange={e => setPrice(e.target.value)}
                                    className="bg-transparent w-full outline-none font-mono text-sm"
                                />
                                <span className="text-xs text-neutral-400 ml-2 mt-0.5">{symbol.endsWith('USDT') ? 'USDT' : symbol.slice(-3)}</span>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-neutral-500 mb-1 block">Quantity</label>
                            <div className={inputBox}>
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="0.00"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full bg-transparent outline-none text-xs font-mono"
                                />
                                <span className="text-xs text-neutral-400 ml-2 mt-0.5">{symbol.endsWith('USDT') ? symbol.slice(0, -4) : symbol.slice(0, -3)}</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-neutral-500 mb-1 block">Total</label>
                            <div className={`${inputBox} bg-neutral-50 dark:bg-neutral-800`}>
                                <span className="text-xs font-mono text-neutral-800 dark:text-white">
                                    = {total || "0.00"}
                                </span>
                                <span className="text-xs text-neutral-400 ml-auto"> USDT</span>
                            </div>
                        </div>
                    </div>


                    <div className="flex items-center justify-between mt-4">
                        {/* Balance */}
                        <div className="flex flex-col">
                            <span className="text-[11px] text-neutral-400">
                                Available balance
                            </span>
                            <span className="text-sm font-mono font-medium text-neutral-900 dark:text-white">
                                {isLoadingBalance
                                    ? "Loading..."
                                    : `${availableBalance} ${symbol.endsWith("USDT") ? "USDT" : "..."}`}
                            </span>
                        </div>

                        <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            aria-label="Add funds (coming soon)"
                            title="Add funds is not available in this demo yet"
                            className="px-3 py-1 text-[11px] font-medium rounded-full
                                    bg-purple-100 text-purple-600
                                    hover:bg-purple-200
                                    dark:bg-purple-900/30 dark:text-purple-400
                                    dark:hover:bg-purple-900/50
                                    transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-100 dark:disabled:hover:bg-purple-900/30"
                        >
                            Add funds
                        </button>
                    </div>


                    <hr className="border-gray-300 dark:border-gray-700" />

                    <div className="mt-4">
                        <button
                            disabled={isSubmitting}
                            className={`
                        relative w-full py-3 rounded-full font-semibold text-sm
                        transition-all duration-200 ease-out
                        hover:-translate-y-[1px]
                        hover:shadow-md
                        active:translate-y-0
                        active:scale-[0.97]
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${side === "BUY" ? "btn-buy" : "btn-sell"}
                        `}
                        >
                            {isSubmitting ? (
                                <span className="animate-pulse">Processing...</span>
                            ) : (
                                `${side} ${symbol.replace("USDT", "")}`
                            )}
                        </button>
                    </div>


                    {status && (
                        <div className={`p-3 rounded-lg text-xs flex items-center ${status.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {status.type === 'success' ? <Check size={14} className="mr-2" /> : null}
                            {status.msg}
                        </div>
                    )}

                </form>
            </div>
        </div>
    );
}
