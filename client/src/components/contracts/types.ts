
// Contract addresses
export const CONTRACT_ADDRESSES = {
  AMM: "0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56::amm",
  CLOB: "0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56::clob",
  ROUTER: "0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56::router",
  CUSTOM_COIN: "0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56::custom_coin",
} as const;

// Fee tiers
export const FEE_TIERS = {
  LOW: 5,    // 0.05%
  HIGH: 30,  // 0.30%
} as const;

// Order sides
export const ORDER_SIDES = {
  BUY: 0,
  SELL: 1,
} as const;

// Constants
export const PRICE_MULTIPLIER = 1_000_000; // 6 decimals

// Types
export interface PoolReserves {
  reserve_x: string;
  reserve_y: string;
  fee_tier: number;
}

export interface SwapQuote {
  amount_out: string;
  price_impact: number;
  fee: string;
}

export interface OrderBookLevel {
  price: string;
  size: string;
}

export interface OrderBookDepth {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface Order {
  id: string;
  side: number;
  price: string;
  size: string;
  filled_size: string;
  status: 'open' | 'filled' | 'cancelled';
  timestamp: number;
}

export interface LiquidityPosition {
  pool_id: string;
  token_x: string;
  token_y: string;
  liquidity: string;
  fee_tier: number;
  rewards: string;
}

export interface ArbitrageOpportunity {
  token_x: string;
  token_y: string;
  amm_price: string;
  clob_price: string;
  profit_potential: string;
  recommended_amount: string;
}

export interface Portfolio {
  balances: Record<string, string>;
  positions: LiquidityPosition[];
  orders: Order[];
  pnl: string;
  total_value: string;
}

export interface CoinInfo {
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
}

export interface TokenCreationRequest {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  txHash?: string;
  tokenAddress?: string;
}