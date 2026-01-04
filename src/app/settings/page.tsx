'use client';

import { useState, useEffect } from 'react';
import { useAPIKeys } from '@/hooks/useAPIKeys';

export default function SettingsPage() {
    const { apiKey, secretKey, saveKeys, isLoaded } = useAPIKeys();
    const [inputApiKey, setInputApiKey] = useState('');
    const [inputSecretKey, setInputSecretKey] = useState('');
    const [showSecrets, setShowSecrets] = useState(false);
    const [status, setStatus] = useState<null | 'success' | 'error'>(null);

    useEffect(() => {
        if (isLoaded) {
            setInputApiKey(apiKey);
            setInputSecretKey(secretKey);
        }
    }, [isLoaded, apiKey, secretKey]);

    const handleSave = () => {
        saveKeys(inputApiKey, inputSecretKey);
        setStatus('success');
        setTimeout(() => setStatus(null), 3000);
    };

    if (!isLoaded) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">API Configuration</h1>

            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Binance Testnet API Key</label>
                    <input
                        type={showSecrets ? "text" : "password"}
                        value={inputApiKey}
                        onChange={(e) => setInputApiKey(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-neutral-900 dark:border-neutral-700"
                        placeholder="Enter API Key"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Binance Testnet Secret Key</label>
                    <input
                        type={showSecrets ? "text" : "password"}
                        value={inputSecretKey}
                        onChange={(e) => setInputSecretKey(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-neutral-900 dark:border-neutral-700"
                        placeholder="Enter Secret Key"
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="showSecrets"
                        checked={showSecrets}
                        onChange={(e) => setShowSecrets(e.target.checked)}
                        className="rounded"
                    />
                    <label htmlFor="showSecrets" className="text-sm">Show Keys</label>
                </div>

                <div className="pt-4 flex space-x-4">
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Save Keys
                    </button>
                </div>

                {status === 'success' && (
                    <div className="text-green-600 text-sm mt-2">
                        Keys saved successfully to browser storage.
                    </div>
                )}
            </div>

            <div className="mt-8 text-sm text-neutral-500">
                <p>Note: Keys are stored locally in your browser and are used to sign requests to the Binance Testnet.</p>
            </div>
        </div>
    );
}
