'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
    const { activeOrders, addOrder, updateOrderPrice, updateOrderQuantity, cancelOrder } = useTrading();

    const [isLoading, setIsLoading] = useState(true);
    const [prevClose, setPrevClose] = useState<number | null>(null);

    const [clickPrice, setClickPrice] = useState<number | null>(null);
    const [confirmPosition, setConfirmPosition] = useState<{ x: number, y: number } | null>(null);

    // Coordinate mapping for overlays
    const [orderPositions, setOrderPositions] = useState<{ [id: string]: number }>({});
    const [draggingOrder, setDraggingOrder] = useState<string | null>(null);
    const [editingOrder, setEditingOrder] = useState<string | null>(null);
    const [creatingBracket, setCreatingBracket] = useState<string | null>(null);
    const [tempBracketPosition, setTempBracketPosition] = useState<{ y: number, price: number } | null>(null);

    // Refs for Drag Logic
    const dragState = useRef<{ type: 'MOVE' | 'BRACKET' | null, id: string | null }>({ type: null, id: null });
    const dragPrice = useRef<number | null>(null);

    // Update overlay positions on resize or scroll
    const updateOverlays = useCallback(() => {
        if (!chartRef.current || !seriesRef.current || !containerRef.current) return;

        const series = seriesRef.current;
        const positions: { [id: string]: number } = {};

        activeOrders.forEach(order => {
            if (order.symbol === symbol) {
                const y = series.priceToCoordinate(order.price);
                if (y !== null) positions[order.id] = y;
            }
        });
        setOrderPositions(positions);
    }, [activeOrders, symbol]);


    // Global Mouse Listeners (Managed manually via Refs)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { type, id } = dragState.current;
            if (!type || !id || !containerRef.current || !seriesRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const price = seriesRef.current.coordinateToPrice(y);

            if (price) {
                const priceNum = parseFloat(price.toFixed(2));
                dragPrice.current = priceNum;

                if (type === 'MOVE') {
                    updateOrderPrice(id, priceNum);
                } else if (type === 'BRACKET') {
                    setTempBracketPosition({ y, price: priceNum });
                }
            }
        };

        const handleMouseUp = () => {
            const { type, id } = dragState.current;
            const finalPrice = dragPrice.current;

            if (type === 'BRACKET' && id && finalPrice) {
                const parent = activeOrders.find(o => o.id === id);
                if (parent) {
                    let orderType: 'STOP_LOSS' | 'TAKE_PROFIT' | undefined;

                    // Determine SL vs TP based on side and price
                    if (parent.side === 'BUY') {
                        if (finalPrice > parent.price) orderType = 'TAKE_PROFIT';
                        else orderType = 'STOP_LOSS';
                    } else {
                        if (finalPrice < parent.price) orderType = 'TAKE_PROFIT';
                        else orderType = 'STOP_LOSS';
                    }

                    if (orderType) {
                        addOrder({
                            symbol,
                            side: parent.side === 'BUY' ? 'SELL' : 'BUY',
                            price: finalPrice,
                            quantity: parent.quantity,
                            type: orderType,
                            parentId: parent.id
                        });
                    }
                }
            }

            // Reset
            dragState.current = { type: null, id: null };
            dragPrice.current = null;

            setDraggingOrder(null);
            setCreatingBracket(null);
            setTempBracketPosition(null);

            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        // Expose start handlers that bind these listeners
        (window as any).__startDrag = (type: 'MOVE' | 'BRACKET', id: string) => {
            dragState.current = { type, id };
            if (type === 'MOVE') setDraggingOrder(id);
            if (type === 'BRACKET') setCreatingBracket(id);

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        };

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            delete (window as any).__startDrag;
        };
    }, [activeOrders, symbol, updateOrderPrice, addOrder]); // Dependencies for the listeners

    const handleDragStart = (e: React.MouseEvent, orderId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if ((window as any).__startDrag) (window as any).__startDrag('MOVE', orderId);
    };

    const handleBracketStart = (e: React.MouseEvent, orderId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if ((window as any).__startDrag) (window as any).__startDrag('BRACKET', orderId);
    };

    // Sync overlays on orders change
    useEffect(() => {
        requestAnimationFrame(updateOverlays);
    }, [updateOverlays, lastPrice]);

    useEffect(() => {
        if (!containerRef.current) return;

        const handleResize = () => {
            if (chartRef.current && containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                if (clientWidth > 0 && clientHeight > 0) {
                    chartRef.current.applyOptions({ width: clientWidth, height: clientHeight });
                    requestAnimationFrame(updateOverlays);
                }
            }
        };

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
            rightPriceScale: { visible: true, borderVisible: false },
            leftPriceScale: { visible: false, borderVisible: false },
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
            priceScaleId: 'right', // Explicitly match chart config
        });

        chartRef.current = chart;
        seriesRef.current = series;

        // Click Handler for Placing Orders
        chart.subscribeClick((param) => {
            if (!param.point || !param.time || !series) {
                setConfirmPosition(null);
                return;
            }

            const price = series.coordinateToPrice(param.point.y);
            if (price) {
                setClickPrice(price);
                // Clamp modal position to container
                const x = Math.min(param.point.x, (containerRef.current?.clientWidth || 0) - 150);
                const y = Math.min(param.point.y, (containerRef.current?.clientHeight || 0) - 100);
                setConfirmPosition({ x, y });
            }
        });

        // Sync overlays on scroll/zoom
        chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
            requestAnimationFrame(updateOverlays);
        });

        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0) {
                chart.applyOptions({ width, height });
                requestAnimationFrame(updateOverlays);
            }
        });

        ro.observe(containerRef.current);
        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            ro.disconnect();
            chart.remove();
        };
    }, [symbol]); // Re-create on symbol change


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

    const handlePlaceOrder = (side: 'BUY' | 'SELL') => {
        if (clickPrice) {
            addOrder({
                symbol,
                side,
                price: parseFloat(clickPrice.toFixed(2)),
                quantity: 0.1
            });
            setConfirmPosition(null);
        }
    };

    return (
        <div className="flex flex-col h-full p-2 relative group">
            <div className="flex justify-between items-center mb-2 px-1">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                            {lastPrice ? `$${lastPrice.toLocaleString()}` : '—'}
                        </span>
                        {changePct !== null && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isUp ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                                {isUp ? '+' : ''}{changePct.toFixed(2)}%
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800/50 p-0.5">
                    {['1m', '5m', '1h', '1d', '1w'].map(tf => (
                        <button key={tf} onClick={() => setTimeframe(tf)} className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${timeframe === tf ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'}`}>
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            <div ref={containerRef} className="relative flex-grow h-full min-h-0 select-none cursor-crosshair">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm z-10">
                        <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    </div>
                )}

                {confirmPosition && (
                    <div
                        className="absolute z-20 bg-white/90 dark:bg-neutral-800/90 backdrop-blur rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 p-3 w-40 animate-in fade-in zoom-in-95 duration-100"
                        style={{ left: confirmPosition.x + 10, top: confirmPosition.y - 50 }}
                    >
                        <div className="text-[10px] text-neutral-500 font-medium mb-2">
                            Limit at <span className="font-mono font-bold text-neutral-900 dark:text-white">{clickPrice?.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handlePlaceOrder('BUY')} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold py-1.5 rounded transition-colors shadow-sm">Buy</button>
                            <button onClick={() => handlePlaceOrder('SELL')} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold py-1.5 rounded transition-colors shadow-sm">Sell</button>
                        </div>
                        <button onClick={() => setConfirmPosition(null)} className="absolute -top-1.5 -right-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full p-0.5 text-neutral-500 hover:text-neutral-800">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}

                {/* SVG Layer for Connections */}
                <svg className="absolute inset-0 pointer-events-none z-0">
                    {activeOrders.map(order => {
                        if (!order.parentId) return null;
                        const parentY = orderPositions[order.parentId];
                        const childY = orderPositions[order.id];
                        if (!parentY || !childY) return null;

                        return (
                            <path
                                key={`link-${order.id}`}
                                d={`M ${containerRef.current?.clientWidth ? containerRef.current.clientWidth / 2 : 200} ${parentY} L ${containerRef.current?.clientWidth ? containerRef.current.clientWidth / 2 : 200} ${childY}`}
                                stroke="#9ca3af"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                                opacity="0.5"
                            />
                        );
                    })}
                    {/* Ghost Line for Bracket Creation */}
                    {creatingBracket && tempBracketPosition && orderPositions[creatingBracket] && (
                        <path
                            d={`M ${containerRef.current?.clientWidth ? containerRef.current.clientWidth / 2 : 200} ${orderPositions[creatingBracket]} L ${containerRef.current?.clientWidth ? containerRef.current.clientWidth / 2 : 200} ${tempBracketPosition.y}`}
                            stroke="#9ca3af"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            opacity="0.8"
                        />
                    )}
                </svg>

                {activeOrders.filter(o => o.symbol === symbol).map(order => {
                    const top = orderPositions[order.id];
                    if (top === undefined || top < 2 || (containerRef.current && top > containerRef.current.clientHeight - 20)) return null;

                    const isBracket = order.type === 'STOP_LOSS' || order.type === 'TAKE_PROFIT';

                    return (
                        <div
                            key={order.id}
                            className={`absolute left-0 right-0 h-0 flex items-center z-10 group/line ${draggingOrder === order.id ? 'opacity-80' : ''}`}
                            style={{ top: top, paddingRight: '60px' }}
                        >
                            <div className={`w-full border-t-2 border-dashed ${order.side === 'BUY' ? 'border-green-500/60' : 'border-red-500/60'} group-hover/line:border-solid cursor-ns-resize transition-all`}></div>
                            <div
                                onMouseDown={(e) => handleDragStart(e, order.id)}
                                className={`absolute right-[60px] flex items-center gap-2 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm cursor-grab active:cursor-grabbing ${order.side === 'BUY' ? 'bg-green-500' : 'bg-red-500'} hover:scale-105 transition-transform`}
                            >
                                <span className="uppercase">{order.type ? (order.type === 'STOP_LOSS' ? 'SL' : 'TP') : order.side}</span>

                                {editingOrder === order.id ? (
                                    <input
                                        type="number"
                                        className="w-12 px-1 py-0.5 text-black rounded text-[10px] focus:outline-none"
                                        defaultValue={order.quantity}
                                        autoFocus
                                        onBlur={() => setEditingOrder(null)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = parseFloat(e.currentTarget.value);
                                                if (val > 0) updateOrderQuantity(order.id, val);
                                                setEditingOrder(null);
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
                                    />
                                ) : (
                                    <span
                                        className="font-mono opacity-90 cursor-text hover:bg-black/20 px-1 rounded"
                                        title="Click to edit quantity"
                                        onClick={(e) => { e.stopPropagation(); setEditingOrder(order.id); }}
                                    >
                                        {order.quantity}
                                    </span>
                                )}

                                <span className="font-mono opacity-90">@{order.price.toFixed(2)}</span>

                                {/* Bracket Drag Handle (Only for main orders) */}
                                {!isBracket && (
                                    <div
                                        className="border-l border-white/20 pl-1 ml-1 cursor-crosshair hover:bg-black/20 rounded p-0.5"
                                        title="Drag to add SL/TP"
                                        onMouseDown={(e) => handleBracketStart(e, order.id)}
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                )}

                                <button className="hover:bg-black/20 rounded p-0.5 ml-1" onClick={(e) => { e.stopPropagation(); cancelOrder(order.id); }}>✕</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
