import { useCallback, useEffect, useRef } from 'react';

export const useSoundEffects = () => {
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Initialize AudioContext lazily on user interaction if needed, 
        // but typically safe to init once in modern browsers for UI sounds
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            audioContextRef.current = new AudioContextClass();
        }
    }, []);

    const playTone = (freq: number, type: OscillatorType, duration: number, gainVal: number = 0.1) => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;

        // Resume context if suspended (browser autoplay policy)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gainNode.gain.setValueAtTime(gainVal, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    };

    const playSuccess = useCallback(() => {
        // "Ching" - High pitch sine with decay
        playTone(1200, 'sine', 0.1, 0.1);
        setTimeout(() => playTone(1800, 'sine', 0.2, 0.05), 50);
    }, []);

    const playModify = useCallback(() => {
        // "Tick" - Very short, lower pitch
        playTone(800, 'triangle', 0.05, 0.05);
    }, []);

    const playCancel = useCallback(() => {
        // "Delete" - Descending tone
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);

        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    }, []);

    return { playSuccess, playModify, playCancel };
};
