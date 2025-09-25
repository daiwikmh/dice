import { CONTRACT_ADDRESSES, FEE_TIERS } from "./types";
import type { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

export class AMMContract {
  private static readonly MODULE_ADDRESS = CONTRACT_ADDRESSES.AMM;

  // Create a new trading pool
  static createPool<X, Y>(
    tokenX: string,
    tokenY: string,
    feeTier: number = FEE_TIERS.LOW
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::create_pool`,
        typeArguments: [tokenX, tokenY],
        functionArguments: [feeTier],
      },
    };
  }

  // Add liquidity to pool
  static addLiquidity<X, Y>(
    tokenX: string,
    tokenY: string,
    feeTier: number,
    amountX: string,
    amountY: string,
    minLiquidity: string
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::add_liquidity`,
        typeArguments: [tokenX, tokenY],
        functionArguments: [feeTier, amountX, amountY, minLiquidity],
      },
    };
  }

  // Remove liquidity from pool
  static removeLiquidity<X, Y>(
    tokenX: string,
    tokenY: string,
    feeTier: number,
    liquidity: string,
    minAmountX: string,
    minAmountY: string
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::remove_liquidity`,
        typeArguments: [tokenX, tokenY],
        functionArguments: [feeTier, liquidity, minAmountX, minAmountY],
      },
    };
  }

  // Swap exact input
  static swapExactIn<X, Y>(
    tokenX: string,
    tokenY: string,
    feeTier: number,
    amountIn: string,
    minAmountOut: string,
    xToY: boolean
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::swap_exact_in`,
        typeArguments: [tokenX, tokenY],
        functionArguments: [feeTier, amountIn, minAmountOut, xToY],
      },
    };
  }

  // View functions - these would typically be called using the Aptos client's view function
  static getPoolReservesPayload<X, Y>(
    tokenX: string,
    tokenY: string,
    feeTier: number
  ) {
    return {
      function: `${this.MODULE_ADDRESS}::get_pool_reserves`,
      typeArguments: [tokenX, tokenY],
      functionArguments: [feeTier],
    };
  }

  static quoteSwapExactInPayload<X, Y>(
    tokenX: string,
    tokenY: string,
    amountIn: string,
    feeTier: number,
    xToY: boolean
  ) {
    return {
      function: `${this.MODULE_ADDRESS}::quote_swap_exact_in`,
      typeArguments: [tokenX, tokenY],
      functionArguments: [amountIn, feeTier, xToY],
    };
  }
}