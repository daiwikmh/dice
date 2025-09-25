import { CONTRACT_ADDRESSES } from "./types";
import type { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

export class RouterContract {
  private static readonly MODULE_ADDRESS = CONTRACT_ADDRESSES.ROUTER;

  // Simple single-hop swap
  static swapExactInputSingle(
    tokenX: string,
    tokenY: string,
    feeTier: number,
    amountIn: string,
    minAmountOut: string,
    xToY: boolean
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::swap_exact_input_single`,
        typeArguments: [tokenX, tokenY],
        functionArguments: [feeTier, amountIn, minAmountOut, xToY],
      },
    };
  }

  // Multi-hop swap
  static swapExactInputMultihop(
    tokenX: string,
    tokenY: string,
    tokenZ: string,
    feeTier1: number,
    feeTier2: number,
    amountIn: string,
    minAmountOut: string
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::swap_exact_input_multihop`,
        typeArguments: [tokenX, tokenY, tokenZ],
        functionArguments: [feeTier1, feeTier2, amountIn, minAmountOut],
      },
    };
  }

  // Arbitrage between AMM and CLOB
  static arbitrageAmmClob(
    tokenX: string,
    tokenY: string,
    ammFeeTier: number,
    clobSide: number,
    clobPrice: string,
    amount: string
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::arbitrage_amm_clob`,
        typeArguments: [tokenX, tokenY],
        functionArguments: [ammFeeTier, clobSide, clobPrice, amount],
      },
    };
  }

  // Split order execution between AMM and CLOB
  static splitOrderExecution(
    tokenX: string,
    tokenY: string,
    totalAmount: string,
    ammPortion: string,
    ammFeeTier: number,
    clobPrice: string,
    minTotalOutput: string
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::split_order_execution`,
        typeArguments: [tokenX, tokenY],
        functionArguments: [
          totalAmount,
          ammPortion,
          ammFeeTier,
          clobPrice,
          minTotalOutput,
        ],
      },
    };
  }

  // View functions
  static getBestRoutePayload(
    tokenX: string,
    tokenY: string,
    amountIn: string,
    xToY: boolean
  ) {
    return {
      function: `${this.MODULE_ADDRESS}::get_best_route`,
      typeArguments: [tokenX, tokenY],
      functionArguments: [amountIn, xToY],
    };
  }

  static checkArbitrageOpportunityPayload(
    tokenX: string,
    tokenY: string,
    ammFeeTier: number
  ) {
    return {
      function: `${this.MODULE_ADDRESS}::check_arbitrage_opportunity`,
      typeArguments: [tokenX, tokenY],
      functionArguments: [ammFeeTier],
    };
  }
}