import { useWallet } from "@aptos-labs/wallet-adapter-react";
import type { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

export interface WalletInfo {
  name: string;
  icon?: string;
}

export interface UseAptosWalletReturn {
  // Connection state
  connected: boolean;
  connecting: boolean;
  address?: string;

  // Wallet management
  wallets: WalletInfo[];
  connect: (walletName?: string) => Promise<void>;
  disconnect: () => Promise<void>;

  // Transaction functions
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>;
}

export function useAptosWallet(): UseAptosWalletReturn {
  const {
    connect: aptosConnect,
    disconnect: aptosDisconnect,
    account,
    connected,
    connecting,
    wallets: availableWallets,
    signAndSubmitTransaction,
  } = useWallet();

  const connect = async (walletName?: string) => {
    try {
      if (walletName) {
        await aptosConnect(walletName);
      } else {
        // Default to first available wallet (usually Petra)
        const defaultWallet = availableWallets[0];
        if (defaultWallet) {
          await aptosConnect(defaultWallet.name);
        }
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      await aptosDisconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      throw error;
    }
  };

  const wallets: WalletInfo[] = availableWallets.map((wallet) => ({
    name: wallet.name,
    icon: wallet.icon,
  }));

  return {
    connected,
    connecting,
    address: account?.address,
    wallets,
    connect,
    disconnect,
    signAndSubmitTransaction,
  };
}

export function shortenAddress(addr?: string): string {
  if (!addr || typeof addr !== 'string') return "";
  if (addr.length <= 10) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}