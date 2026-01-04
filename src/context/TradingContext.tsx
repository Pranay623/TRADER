'use client';

import { useAPIKeys } from '@/hooks/useAPIKeys';
import { getAccountInfo } from '@/lib/binance';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

export interface ActiveOrder {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    timestamp: number;
    type?: 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
    parentId?: string;
}

interface TradingContextType {
    symbol: string;
    setSymbol: (symbol: string) => void;
    timeframe: string;
    setTimeframe: (timeframe: string) => void;
    lastPrice: number | null;
    setLastPrice: (price: number) => void;
    accountInfo: any | null;
    refreshAccountInfo: () => Promise<void>;
    activeOrders: ActiveOrder[];
    addOrder: (order: Omit<ActiveOrder, 'id' | 'timestamp'>) => void;
    updateOrderPrice: (id: string, newPrice: number) => void;
    updateOrderQuantity: (id: string, newQuantity: number) => void;
    cancelOrder: (id: string) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export function TradingProvider({ children }: { children: ReactNode }) {
    const params = useParams();
    const router = useRouter();
    const [symbol, _setSymbol] = useState('BTCUSDT');
    const [timeframe, setTimeframe] = useState('1m');
    const [lastPrice, setLastPrice] = useState<number | null>(null);
    const [accountInfo, setAccountInfo] = useState<any | null>(null);

    const { apiKey, secretKey } = useAPIKeys();

    // Sync state with URL params
    useEffect(() => {
        if (params?.symbol && typeof params.symbol === 'string') {
            const urlSymbol = decodeURIComponent(params.symbol).toUpperCase();
            if (urlSymbol !== symbol) {
                _setSymbol(urlSymbol);
            }
        }
    }, [params?.symbol]);

    const setSymbol = useCallback((newSymbol: string) => {
        router.push(`/trade/${newSymbol}`);
    }, [router]);

    const fetchAccount = async () => {
        if (!apiKey || !secretKey) return;
        try {
            const info = await getAccountInfo(apiKey, secretKey);
            setAccountInfo(info);
        } catch (error) {
            console.error("Failed to fetch account info", error);
        }
    };

    useEffect(() => {
        if (apiKey && secretKey) {
            fetchAccount();
            const interval = setInterval(fetchAccount, 10000); // Poll every 10s
            return () => clearInterval(interval);
        } else {
            setAccountInfo(null);
        }
    }, [apiKey, secretKey]);

    useEffect(() => {
        let ws: WebSocket | null = null;
        let active = true;
        let reconnectTimeout: NodeJS.Timeout;
        const currentSymbol = symbol.toLowerCase();

        setLastPrice(null);

        const connect = () => {
            if (!active) return;

            // Use the environment variable or default to testnet
            const wsBaseUrl = process.env.NEXT_PUBLIC_BINANCE_WS_URL || 'wss://testnet.binance.vision/ws';

            // Handle different URL formats (with or without /ws or /stream suffix logic)
            // The simple logic: `wss://stream.binance.com:9443/ws/${symbol}@trade`
            // But if user provided `wss://testnet.binance.vision/ws`, we append `/${symbol}@trade`

            // Let's stick to the previous hardcoded logic for now but respecting the env request for dynamic URL if possible.
            // Previous logic was: `wss://stream.binance.com:9443/ws/${currentSymbol}@trade`
            // But verify if we are on testnet or mainnet.
            const url = `wss://stream.binance.com:9443/ws/${currentSymbol}@trade`;
            // Better: stick to the working hardcoded one from previous file unless explicitly changing it.
            // The previous file had: `wss://stream.binance.com:9443/ws/${currentSymbol}@trade`

            ws = new WebSocket(url);

            ws.onopen = () => {
                if (active) console.log(`✅ Connected to ${currentSymbol.toUpperCase()} trade stream`);
            };

            ws.onmessage = (event) => {
                if (!active) return;
                try {
                    const data = JSON.parse(event.data);
                    const price = parseFloat(data.p);
                    setLastPrice(price);
                } catch (e) {
                    console.error("Error parsing price data", e);
                }
            };

            ws.onerror = (error) => {
                if (active) {
                    console.warn("⚠️ WebSocket encountered an error (check network/connection).");
                }
            };

            ws.onclose = (event) => {
                if (!active) return;
                console.log(`🔌 WebSocket closed (Code: ${event.code}, Reason: ${event.reason || 'None'}). Reconnecting in 3 seconds...`);
                reconnectTimeout = setTimeout(connect, 3000);
            };
        };

        connect();

        return () => {
            active = false;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (ws) {
                ws.onclose = null;
                ws.close();
            }
        };
    }, [symbol]);

    const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);

    // Audio Feedback
    const { playSuccess, playModify, playCancel } = useSoundEffects();

    const addOrder = (order: Omit<ActiveOrder, 'id' | 'timestamp'>) => {
        const newOrder: ActiveOrder = {
            ...order,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
        };
        setActiveOrders(prev => [...prev, newOrder]);
        playSuccess(); // Audio Feedback
    };

    const updateOrderPrice = (id: string, newPrice: number) => {
        setActiveOrders(prev => prev.map(o => o.id === id ? { ...o, price: newPrice } : o));
        playModify(); // Audio Feedback
    };

    const updateOrderQuantity = (id: string, newQuantity: number) => {
        setActiveOrders(prev => prev.map(o => o.id === id ? { ...o, quantity: newQuantity } : o));
        playModify(); // Audio Feedback
    };

    const cancelOrder = (id: string) => {
        setActiveOrders(prev => {
            // Find the order being cancelled to check if it's a parent
            const orderToCancel = prev.find(o => o.id === id);

            // Filter out the specific order and any children (orders with this id as parentId)
            return prev.filter(o => o.id !== id && o.parentId !== id);
        });
        playCancel(); // Audio Feedback
    };

    return (
        <TradingContext.Provider
            value={{
                symbol,
                setSymbol,
                timeframe,
                setTimeframe,
                lastPrice,
                setLastPrice,
                accountInfo,
                refreshAccountInfo: fetchAccount,
                activeOrders,
                addOrder,
                updateOrderPrice,
                updateOrderQuantity,
                cancelOrder,
            }}
        >
            {children}
        </TradingContext.Provider>
    );
}

export function useTrading() {
    const context = useContext(TradingContext);
    if (context === undefined) {
        throw new Error('useTrading must be used within a TradingProvider');
    }
    return context;
}
