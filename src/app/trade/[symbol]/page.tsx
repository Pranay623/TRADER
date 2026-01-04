import Dashboard from "@/components/Dashboard";

export function generateStaticParams() {
    return [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }, { symbol: 'BNBUSDT' }];
}

export default function TradePage() {
    return <Dashboard />;
}
