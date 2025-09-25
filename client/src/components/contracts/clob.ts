import { CONTRACT_ADDRESSES } from "./types";
import type { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

export class CLOBContract {
  private static readonly MODULE_ADDRESS = CONTRACT_ADDRESSES.CLOB;

  // Create a new market
  static createMarket(
    baseCoin: string,
    quoteCoin: string,
    tickSize: string,
    lotSize: string
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::create_market`,
        typeArguments: [baseCoin, quoteCoin],
        functionArguments: [tickSize, lotSize],
      },
    };
  }

  // Place limit order
  static placeLimitOrder(
    baseCoin: string,
    quoteCoin: string,
    side: number, // 0 for BUY, 1 for SELL
    price: string,
    size: string
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::place_limit_order`,
        typeArguments: [baseCoin, quoteCoin],
        functionArguments: [side, price, size],
      },
    };
  }

  // Place market order
  static placeMarketOrder(
    baseCoin: string,
    quoteCoin: string,
    side: number, // 0 for BUY, 1 for SELL
    size: string
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::place_market_order`,
        typeArguments: [baseCoin, quoteCoin],
        functionArguments: [side, size],
      },
    };
  }

  // Cancel order
  static cancelOrder(
    baseCoin: string,
    quoteCoin: string,
    orderId: string
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::cancel_order`,
        typeArguments: [baseCoin, quoteCoin],
        functionArguments: [orderId],
      },
    };
  }

  // View functions
  static getBestBidAskPayload(
    baseCoin: string,
    quoteCoin: string
  ) {
    return {
      function: `${this.MODULE_ADDRESS}::get_best_bid_ask`,
      typeArguments: [baseCoin, quoteCoin],
      functionArguments: [],
    };
  }

  static getOrderBookDepthPayload(
    baseCoin: string,
    quoteCoin: string,
    levels: number
  ) {
    return {
      function: `${this.MODULE_ADDRESS}::get_order_book_depth`,
      typeArguments: [baseCoin, quoteCoin],
      functionArguments: [levels],
    };
  }
}