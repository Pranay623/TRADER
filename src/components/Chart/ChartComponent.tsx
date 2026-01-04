'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    createChart,
    CandlestickSeries,
    ColorType,
    IChartApi,
    ISeriesApi,
    UTCTimestamp,
    CandlestickData,
} from 'lightweight-charts';

import { useTrading } from '@/context/TradingContext';
import { getKlines } from '@/lib/binance';
import { useWebSocket } from '@/hooks/useWebSocket';

// Define the shape of a single kline (candlestick) from Binance API (array format)
type RawBinanceKline = [
    number, // Open time
    string, // Open
    string, // High
    string, // Low
    string, // Close
    string, // Volume
    number, // Close time
    string, // Quote asset volume
    number, // Number of trades
    string, // Taker buy base asset volume
    string, // Taker buy quote asset volume
    string  // Ignore
];

export const ChartComponent = () => {
    const { symbol, timeframe, setTimeframe, lastPrice } = useTrading();

    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const lastCandleRef = useRef<CandlestickData<UTCTimestamp> | null>(null);

    const { klineData } = useWebSocket(symbol, timeframe);

    const [isLoading, setIsLoading] = useState(true);
    const [prevClose, setPrevClose] = useState<number | null>(null);


    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#9aa0a6',
                fontFamily: 'Inter, system-ui, sans-serif',
            },
            grid: {
                vertLines: { color: 'rgba(0,0,0,0.05)' },
                horzLines: { color: 'rgba(0,0,0,0.05)' },
            },
            rightPriceScale: { visible: false },
            leftPriceScale: { visible: true, borderVisible: false },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderVisible: false,
            },
            crosshair: {
                mode: 1,
                vertLine: { width: 1, color: '#758696', style: 3 },
                horzLine: { width: 1, color: '#758696', style: 3 },
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
            borderVisible: false,
            priceScaleId: 'left',
        });

        chartRef.current = chart;
        seriesRef.current = series;

        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
                chart.applyOptions({ width, height });
        });

        ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            chart.remove();
        };
    }, []);


    useEffect(() => {
        let cancelled = false;

        const loadHistory = async () => {
            if (!seriesRef.current) return;

            setIsLoading(true);

            try {
                const raw = await getKlines(symbol, timeframe, 500) as RawBinanceKline[];
                if (cancelled) return;

                if (!Array.isArray(raw) || raw.length < 2) {
                    lastCandleRef.current = null;
                    setPrevClose(null);
                    return;
                }

                const candles: CandlestickData<UTCTimestamp>[] = raw
                    .filter((d): d is RawBinanceKline => Array.isArray(d) && d.length >= 5)
                    .map((d) => ({
                        time: (d[0] / 1000) as UTCTimestamp,
                        open: +d[1],
                        high: +d[2],
                        low: +d[3],
                        close: +d[4],
                    }));

                if (candles.length < 2) {
                    lastCandleRef.current = null;
                    setPrevClose(null);
                    return;
                }

                seriesRef.current.setData(candles);
                lastCandleRef.current = candles[candles.length - 1] ?? null;
                setPrevClose(candles[candles.length - 2]?.close ?? null);
            } catch (error) {
                console.error('Failed to load historical klines', error);
                if (!cancelled) {
                    lastCandleRef.current = null;
                    setPrevClose(null);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        loadHistory();

        return () => {
            cancelled = true;
        };
    }, [symbol, timeframe]);


    useEffect(() => {
        if (!klineData || !seriesRef.current) return;

        const k = klineData.k;
        if (!k) return;

        const time = (k.t / 1000) as UTCTimestamp;
        const price = lastPrice ?? +k.c;

        const candle: CandlestickData<UTCTimestamp> = {
            time,
            open: +k.o,
            high: Math.max(+k.h, price),
            low: Math.min(+k.l, price),
            close: price,
        };


        if (lastCandleRef.current?.time === time) {
            seriesRef.current.update(candle);
        }

        else {
            setPrevClose(lastCandleRef.current?.close ?? null);
            seriesRef.current.update(candle);
            lastCandleRef.current = candle;
        }
    }, [klineData, lastPrice]);

    const changePct =
        prevClose && lastPrice
            ? ((lastPrice - prevClose) / prevClose) * 100
            : null;

    const isUp = changePct !== null && changePct >= 0;

    return (
        <div className="flex flex-col h-full p-2">
            <div className="flex justify-between items-center mb-2 px-1">
                {/* Price and Details */}
                <div>
                    {/* Clean header - symbol is already in the drag handle */}
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                            {lastPrice ? `$${lastPrice.toLocaleString()}` : '—'}
                        </span>
                        {changePct !== null && (
                            <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${isUp
                                        ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                                    }`}
                            >
                                {isUp ? '+' : ''}
                                {changePct.toFixed(2)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Timeframe Selector */}
                <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800/50 p-0.5">
                    {['1m', '5m', '1h', '1d', '1w'].map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all
                ${timeframe === tf
                                    ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
                                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                                }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            <div ref={containerRef} className="relative flex-grow h-full min-h-0">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm z-10">
                        <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
};
