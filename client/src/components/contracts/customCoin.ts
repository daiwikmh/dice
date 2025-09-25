import { CONTRACT_ADDRESSES } from "./types";
import type { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

export class CustomCoinContract {
  private static readonly MODULE_ADDRESS = CONTRACT_ADDRESSES.CUSTOM_COIN;

  // Initialize a new custom coin type
  static initializeCoin(
    name: string,
    symbol: string,
    decimals: number,
    monitorSupply: boolean = true
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::initialize_coin`,
        typeArguments: [`${this.MODULE_ADDRESS}::CustomCoin`],
        functionArguments: [
          Array.from(new TextEncoder().encode(name)),
          Array.from(new TextEncoder().encode(symbol)),
          decimals,
          monitorSupply,
        ],
      },
    };
  }

  // Mint tokens to a specific address
  static mint(
    to: string,
    amount: string
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::mint`,
        typeArguments: [`${this.MODULE_ADDRESS}::CustomCoin`],
        functionArguments: [to, amount],
      },
    };
  }

  // Mint tokens with admin signature
  static mintWithAdmin(
    to: string,
    amount: string
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::mint_with_admin`,
        typeArguments: [`${this.MODULE_ADDRESS}::CustomCoin`],
        functionArguments: [to, amount],
      },
    };
  }

  // Burn tokens
  static burn(
    amount: string
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::burn`,
        typeArguments: [`${this.MODULE_ADDRESS}::CustomCoin`],
        functionArguments: [amount],
      },
    };
  }

  // Register coin for an account
  static registerCoin(): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::register_coin`,
        typeArguments: [`${this.MODULE_ADDRESS}::CustomCoin`],
        functionArguments: [],
      },
    };
  }

  // Transfer tokens between accounts
  static transfer(
    to: string,
    amount: string
  ): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::transfer`,
        typeArguments: [`${this.MODULE_ADDRESS}::CustomCoin`],
        functionArguments: [to, amount],
      },
    };
  }

  // View functions - these would typically be called using the Aptos client's view function
  static getCoinInfoPayload(adminAddress: string) {
    return {
      function: `${this.MODULE_ADDRESS}::get_coin_info`,
      functionArguments: [adminAddress],
    };
  }

  static getBalancePayload(accountAddress: string) {
    return {
      function: `${this.MODULE_ADDRESS}::get_balance`,
      typeArguments: [`${this.MODULE_ADDRESS}::CustomCoin`],
      functionArguments: [accountAddress],
    };
  }

  static isAccountRegisteredPayload(accountAddress: string) {
    return {
      function: `${this.MODULE_ADDRESS}::is_account_registered`,
      typeArguments: [`${this.MODULE_ADDRESS}::CustomCoin`],
      functionArguments: [accountAddress],
    };
  }

  static isCoinInitializedPayload(adminAddress: string) {
    return {
      function: `${this.MODULE_ADDRESS}::is_coin_initialized`,
      typeArguments: [`${this.MODULE_ADDRESS}::CustomCoin`],
      functionArguments: [adminAddress],
    };
  }
}