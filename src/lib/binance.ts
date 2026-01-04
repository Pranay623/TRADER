
import CryptoJS from 'crypto-js';

const KEY_BASE = '/api/binance';

interface OrderParams {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';
    quantity: string;
    price?: string;
    stopPrice?: string;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export const signRequest = (params: Record<string, string>, secretKey: string) => {
    const queryString = new URLSearchParams(params).toString();
    const signature = CryptoJS.HmacSHA256(queryString, secretKey).toString(CryptoJS.enc.Hex);
    return `${queryString}&signature=${signature}`;
};

export const placeOrder = async (
    apiKey: string,
    secretKey: string,
    order: OrderParams
) => {
    if (!apiKey || !secretKey) throw new Error('API keys are missing');

    const endpoint = `${KEY_BASE}/order`;
    const timestamp = Date.now().toString();

    const params: Record<string, string> = {
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        timestamp: timestamp,
    };

    if (order.price) params.price = order.price;
    if (order.stopPrice) params.stopPrice = order.stopPrice;
    if (order.timeInForce) params.timeInForce = order.timeInForce;

    const queryStringWithSignature = signRequest(params, secretKey);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-MBX-APIKEY': apiKey,
        },
        body: queryStringWithSignature,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || 'Order failed');
    }

    return response.json();
};

export const getKlines = async (symbol: string, interval: string, limit: number = 500) => {
    const response = await fetch(`${KEY_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch klines');
    return response.json();
};

export const getExchangeInfo = async (apiKey?: string, secretKey?: string) => {
    const response = await fetch(`${KEY_BASE}/exchangeInfo`);
    if (!response.ok) throw new Error('Failed to fetch exchange info');
    const exchangeInfo = await response.json();

    if (apiKey && secretKey) {
        try {
            const accountInfo = await getAccountInfo(apiKey, secretKey);
            const heldAssets = new Set(
                accountInfo.balances
                    .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
                    .map((b: any) => b.asset)
            );

            // Filter symbols where user holds either the base or quote asset
            exchangeInfo.symbols = exchangeInfo.symbols.filter((s: any) =>
                heldAssets.has(s.baseAsset) || heldAssets.has(s.quoteAsset)
            );
        } catch (error) {
            console.error("Failed to filter by account info", error);
            // If fetching account info fails, we return the full list (fail-open) 
            // or we could throw. Fail-open is usually better for UX here.
        }
    }

    return exchangeInfo;
};

export const getAccountInfo = async (apiKey: string, secretKey: string, signal?: AbortSignal) => {
    if (!apiKey || !secretKey) throw new Error('API keys are missing');

    const endpoint = `${KEY_BASE}/account`;
    const timestamp = Date.now().toString();
    const params = { timestamp };

    const queryStringWithSignature = signRequest(params, secretKey);

    const response = await fetch(`${endpoint}?${queryStringWithSignature}`, {
        method: 'GET',
        headers: {
            'X-MBX-APIKEY': apiKey,
        },
        signal
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || 'Failed to fetch account info');
    }

    return response.json();
};

export const getOpenOrders = async (apiKey: string, secretKey: string, symbol?: string, signal?: AbortSignal) => {
    if (!apiKey || !secretKey) throw new Error('API keys are missing');

    const endpoint = `${KEY_BASE}/openOrders`;
    const timestamp = Date.now().toString();
    const params: Record<string, string> = { timestamp };

    if (symbol) {
        params.symbol = symbol;
    }

    const queryStringWithSignature = signRequest(params, secretKey);

    const response = await fetch(`${endpoint}?${queryStringWithSignature}`, {
        method: 'GET',
        headers: {
            'X-MBX-APIKEY': apiKey,
        },
        signal
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || 'Failed to fetch open orders');
    }

    return response.json();
};

export const getAllOrders = async (apiKey: string, secretKey: string, symbol: string, signal?: AbortSignal) => {
    if (!apiKey || !secretKey) throw new Error('API keys are missing');
    if (!symbol) throw new Error('Symbol is required for fetching order history');

    const endpoint = `${KEY_BASE}/allOrders`;
    const timestamp = Date.now().toString();
    const params: Record<string, string> = {
        symbol,
        timestamp
    };

    const queryStringWithSignature = signRequest(params, secretKey);

    const response = await fetch(`${endpoint}?${queryStringWithSignature}`, {
        method: 'GET',
        headers: {
            'X-MBX-APIKEY': apiKey,
        },
        signal
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || 'Failed to fetch order history');
    }

    return response.json();
};

export const getMyTrades = async (apiKey: string, secretKey: string, symbol: string, signal?: AbortSignal) => {
    if (!apiKey || !secretKey) throw new Error('API keys are missing');
    if (!symbol) throw new Error('Symbol is required for fetching trades');

    const endpoint = `${KEY_BASE}/myTrades`;
    const timestamp = Date.now().toString();
    const params = {
        symbol,
        timestamp
    };

    const queryStringWithSignature = signRequest(params, secretKey);

    const response = await fetch(`${endpoint}?${queryStringWithSignature}`, {
        method: 'GET',
        headers: {
            'X-MBX-APIKEY': apiKey,
        },
        signal
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || 'Failed to fetch trades');
    }

    return response.json();
};
