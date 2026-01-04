'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import _ from 'lodash';
import type ReactGridLayout from 'react-grid-layout';

type Layout = ReactGridLayout.Layout;
type Layouts = ReactGridLayout.Layouts;

let ResponsiveGridLayout: any = null;
if (typeof window !== 'undefined') {
    try {
        const RGL = require('react-grid-layout/legacy');
        const Responsive = RGL.Responsive;
        const WidthProvider = RGL.WidthProvider;
        if (Responsive && WidthProvider && typeof WidthProvider === 'function') {
            ResponsiveGridLayout = WidthProvider(Responsive);
        }
    } catch (error) {
        console.error('Error loading react-grid-layout', error);
    }
}

interface DraggableGridProps {
    children: ReactNode[];
}

// Key for local storage
const STORAGE_KEY = 'trader_dashboard_layout_v2';

// COMPACT ROW HEIGHT for "Pro" look
const ROW_HEIGHT = 20;

const PRESETS: Record<string, Layouts> = {
    'Standard': {
        lg: [
            { i: 'order-panel', x: 0, y: 0, w: 3, h: 28 },
            { i: 'chart', x: 3, y: 0, w: 9, h: 18 },
            { i: 'positions', x: 3, y: 18, w: 9, h: 10 },
        ],
        md: [
            { i: 'order-panel', x: 0, y: 0, w: 4, h: 28 },
            { i: 'chart', x: 4, y: 0, w: 8, h: 18 },
            { i: 'positions', x: 4, y: 18, w: 8, h: 10 },
        ],
        sm: [
            { i: 'chart', x: 0, y: 0, w: 6, h: 15 },
            { i: 'order-panel', x: 0, y: 15, w: 6, h: 20 },
            { i: 'positions', x: 0, y: 35, w: 6, h: 10 },
        ]
    },
    'Chart Focus': {
        lg: [
            { i: 'order-panel', x: 0, y: 0, w: 2, h: 28 },
            { i: 'chart', x: 2, y: 0, w: 10, h: 20 },
            { i: 'positions', x: 2, y: 20, w: 10, h: 8 },
        ],
        md: [
            { i: 'order-panel', x: 0, y: 0, w: 3, h: 28 },
            { i: 'chart', x: 3, y: 0, w: 9, h: 20 },
            { i: 'positions', x: 3, y: 20, w: 9, h: 8 },
        ],
        sm: [
            { i: 'chart', x: 0, y: 0, w: 6, h: 20 },
            { i: 'order-panel', x: 0, y: 20, w: 6, h: 15 },
            { i: 'positions', x: 0, y: 35, w: 6, h: 8 },
        ]
    },
    'Minimal': {
        lg: [
            { i: 'order-panel', x: 0, y: 0, w: 3, h: 28 },
            { i: 'chart', x: 3, y: 0, w: 6, h: 28 },
            { i: 'positions', x: 9, y: 0, w: 3, h: 28 },
        ],
        md: [
            { i: 'order-panel', x: 0, y: 0, w: 4, h: 28 },
            { i: 'chart', x: 4, y: 0, w: 8, h: 28 },
            { i: 'positions', x: 0, y: 28, w: 12, h: 10 },
        ],
        sm: [
            { i: 'chart', x: 0, y: 0, w: 6, h: 20 },
            { i: 'order-panel', x: 0, y: 20, w: 6, h: 20 },
            { i: 'positions', x: 0, y: 40, w: 6, h: 10 },
        ]
    }
};

export default function DraggableGrid({ children }: DraggableGridProps) {
    const [layouts, setLayouts] = useState<Layouts>(PRESETS['Standard']);
    const [currentPreset, setCurrentPreset] = useState('Standard');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setLayouts(JSON.parse(saved));
                setCurrentPreset('Custom');
            } catch (e) {
                console.error("Failed to load layout", e);
            }
        }
    }, []);

    const onLayoutChange = (currentLayout: Layout[], allLayouts: Layouts) => {
        if (!isMounted) return;
        setLayouts(allLayouts);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
    };

    // Helper to force chart resize after transition
    const triggerResize = () => {
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300);
    };

    const loadPreset = (name: string) => {
        const preset = PRESETS[name];
        if (preset) {
            setLayouts(preset);
            setCurrentPreset(name);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
            triggerResize();
        }
    };

    const handleReset = () => {
        loadPreset('Standard');
        window.location.reload();
    };

    if (!isMounted || !ResponsiveGridLayout) return null;

    return (
        <div className="relative w-full h-full">
            {/* Clean Layout Control - Matches Trading Panel Style */}
            <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
                <div className="relative">
                    <select
                        value={currentPreset}
                        onChange={(e) => loadPreset(e.target.value)}
                        className="text-sm text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-600 cursor-pointer font-normal transition-colors appearance-none"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.5rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.25em 1.25em'
                        }}
                    >
                        <option value="Custom" disabled>Custom Layout</option>
                        {Object.keys(PRESETS).map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={handleReset}
                    className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1.5 transition-colors"
                    title="Reset Layout"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 12, sm: 6, xs: 1, xxs: 1 }}
                rowHeight={ROW_HEIGHT}
                onLayoutChange={onLayoutChange}
                draggableHandle=".drag-handle"
                margin={[12, 12]}
                containerPadding={[12, 12]}
            >
                {children}
            </ResponsiveGridLayout>
        </div>
    );
}