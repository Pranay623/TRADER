'use client';

import { useEffect, useRef, useState } from 'react';
import { wsManager } from '@/lib/websocket';

export const useWebSocket = (symbol: string = 'btcusdt', interval: string = '1m') => {
    const [klineData, setKlineData] = useState<any>(null);
    const [tradeData, setTradeData] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Subscribe to connection status
    useEffect(() => {
        const unsubscribeStatus = wsManager.subscribeToStatus((status) => {
            setIsConnected(status);
        });
        return () => {
            unsubscribeStatus();
        };
    }, []);

    useEffect(() => {
        const normalizedSymbol = symbol.toLowerCase();
        const streams = [
            `${normalizedSymbol}@trade`,
            `${normalizedSymbol}@kline_${interval}`
        ];

        wsManager.subscribeToStreams(streams);

        const unsubscribe = wsManager.subscribe((newData) => {
            const payload = newData.data || newData;
            const streamName = newData.stream || '';


            const isRelevant = streams.includes(streamName) ||
                (payload.s?.toLowerCase() === normalizedSymbol &&
                    (payload.e === 'trade' || payload.e === 'kline'));

            if (!isRelevant) return;

            if (streamName.endsWith('@trade') || payload.e === 'trade') {
                setTradeData(payload);
            }
            if (streamName.endsWith(`@kline_${interval}`) || payload.e === 'kline') {
                setKlineData(payload);
            }
        });

        return () => {
            unsubscribe();
            wsManager.unsubscribeFromStreams(streams);
        };
    }, [symbol, interval]);

    return { klineData, tradeData, isConnected };
};
