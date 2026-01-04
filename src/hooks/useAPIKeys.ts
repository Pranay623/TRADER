'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY_API = 'binance_api_key';
const STORAGE_KEY_SECRET = 'binance_secret_key';

export const useAPIKeys = () => {
    const [apiKey, setApiKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const envApiKey = process.env.NEXT_PUBLIC_BINANCE_API_KEY || '';
        const envSecretKey = process.env.NEXT_PUBLIC_BINANCE_SECRET_KEY || '';

        const storedApiKey = localStorage.getItem(STORAGE_KEY_API) || envApiKey;
        const storedSecretKey = localStorage.getItem(STORAGE_KEY_SECRET) || envSecretKey;

        setApiKey(storedApiKey);
        setSecretKey(storedSecretKey);
        setIsLoaded(true);
    }, []);

    const saveKeys = (newApiKey: string, newSecretKey: string) => {
        localStorage.setItem(STORAGE_KEY_API, newApiKey);
        localStorage.setItem(STORAGE_KEY_SECRET, newSecretKey);
        setApiKey(newApiKey);
        setSecretKey(newSecretKey);
    };

    const clearKeys = () => {
        localStorage.removeItem(STORAGE_KEY_API);
        localStorage.removeItem(STORAGE_KEY_SECRET);
        setApiKey('');
        setSecretKey('');
    };

    return {
        apiKey,
        secretKey,
        saveKeys,
        clearKeys,
        isLoaded
    };
};
