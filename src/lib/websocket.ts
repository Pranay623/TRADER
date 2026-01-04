type WebSocketCallback = (data: any) => void;

export class BinanceWebSocket {
    private ws: WebSocket | null = null;
    private subscribers: Set<WebSocketCallback> = new Set();
    private activeStreams: Set<string> = new Set();

    private baseUrl: string = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BINANCE_WS_URL)
        ? (process.env.NEXT_PUBLIC_BINANCE_WS_URL as string)
        : 'wss://testnet.binance.vision';

    private currentStreamsKey: string = '';
    private reconnectInterval: number = 5000;
    private shouldReconnect: boolean = true;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    private statusSubscribers: Set<(status: boolean) => void> = new Set();

    constructor() { }

    private normalizeBaseUrl(url: string) {
        return url.replace(/\/+$/, '').replace(/\/(ws|stream)(\?.*)?$/, '');
    }

    private buildUrlForActiveStreams(): { url: string; streamsKey: string } {
        const normalizedBase = this.normalizeBaseUrl(this.baseUrl);
        const streams = Array.from(this.activeStreams).sort();
        const streamsKey = streams.join('|');

        if (streams.length === 0) {
            return { url: `${normalizedBase}/ws`, streamsKey };
        }


        const streamsPath = streams.join('/');
        return { url: `${normalizedBase}/stream?streams=${encodeURIComponent(streamsPath)}`, streamsKey };
    }

    connect() {
        const { url, streamsKey } = this.buildUrlForActiveStreams();

        this.shouldReconnect = true;

        if (
            (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) &&
            this.currentStreamsKey === streamsKey
        ) {
            return;
        }

       
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            try {
                this.ws.close();
            } catch {
                // ignore
            }
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this.currentStreamsKey = streamsKey;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('Connected to Binance WebSocket');
            this.notifyStatus(true);
         
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.subscribers.forEach(callback => callback(data));
        };

        this.ws.onclose = () => {
            console.log('Binance WebSocket disconnected');
            this.notifyStatus(false);
            if (this.shouldReconnect) {
                if (this.reconnectTimeout) {
                    clearTimeout(this.reconnectTimeout);
                }
                this.reconnectTimeout = setTimeout(() => this.connect(), this.reconnectInterval);
            }
        };

        this.ws.onerror = (error) => {
            
            console.warn('WebSocket Manager Error (connection issues likely)', error);
            
            try {
                this.ws?.close();
            } catch {
                // ignore
            }
        };
    }

    subscribe(callback: WebSocketCallback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    subscribeToStatus(callback: (status: boolean) => void) {
        this.statusSubscribers.add(callback);

        callback(this.ws?.readyState === WebSocket.OPEN);
        return () => this.statusSubscribers.delete(callback);
    }

    private notifyStatus(status: boolean) {
        this.statusSubscribers.forEach(cb => cb(status));
    }

    subscribeToStreams(streams: string[]) {
        streams.forEach(s => this.activeStreams.add(s));

        this.connect();
    }

    unsubscribeFromStreams(streams: string[]) {
        streams.forEach(s => this.activeStreams.delete(s));

        this.connect();
    }

    disconnect() {
        this.shouldReconnect = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        try {
            this.ws?.close();
        } catch {
            // ignore
        }
        this.ws = null;
        this.currentStreamsKey = '';
        this.subscribers.clear();
        this.activeStreams.clear();
        this.notifyStatus(false);
        this.statusSubscribers.clear();
    }
}

export const wsManager = new BinanceWebSocket();
