import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

export function shortenAddress(address: string | undefined): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function useAptosWallet() {
  const { connect: aptosConnect, disconnect: aptosDisconnect, account, connected, wallets: availableWallets, signAndSubmitTransaction } = useWallet();
  const [connecting, setConnecting] = useState(false);

  const connect = async (walletName?: string) => {
    setConnecting(true);
    try {
      if (walletName) {
        await aptosConnect(walletName);
      } else if (availableWallets.length > 0) {
        await aptosConnect(availableWallets[0].name);
      }
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    await aptosDisconnect();
  };

  const wallets = availableWallets.map(w => ({ name: w.name, icon: w.icon }));

  return {
    connected,
    connecting,
    address: account?.address?.toString(),
    wallets,
    connect,
    disconnect,
    signAndSubmitTransaction,
  };
}
