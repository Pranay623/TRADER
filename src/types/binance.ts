
export interface BinanceBalance {
    asset: string;
    free: string;
    locked: string;
}

export interface CommissionRates {
    maker: string;
    taker: string;
    buyer: string;
    seller: string;
}

export interface AccountInfo {
    makerCommission: number;
    takerCommission: number;
    buyerCommission: number;
    sellerCommission: number;
    commissionRates: CommissionRates;
    canTrade: boolean;
    canWithdraw: boolean;
    canDeposit: boolean;
    brokered: boolean;
    requireSelfTradePrevention: boolean;
    preventSor: boolean;
    updateTime: number;
    accountType: string;
    balances: BinanceBalance[];
    uid?: number;
    permissions: string[];
}
