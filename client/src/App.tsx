import { AppLayout } from "@/pages/Layout";
import DashboardOverview from "./pages/DashBoard";
import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Pool from "@/components/pool/Pool";
import TradingPage from "./pages/TradingPage";
import LiquidityPage from "./pages/LiquidityPage";
import OrdersPage from "./pages/OrdersPage";
import PortfolioPage from "./pages/PortfolioPage";
import ArbitragePage from "./pages/ArbitragePage";

function App() {
  const client = new QueryClient();

  return (
    <>
      <AptosWalletAdapterProvider
        autoConnect={true}
        dappConfig={{
          network: Network.TESTNET,
        }}
        onError={(error) => console.log("Aptos wallet error:", error)}
      >
        <QueryClientProvider client={client}>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<DashboardOverview />} />
                <Route path="/trading" element={<TradingPage />} />
                <Route path="/create-pool" element={<Pool />} />
                <Route path="/liquidity" element={<LiquidityPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/arbitrage" element={<ArbitragePage />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </QueryClientProvider>
      </AptosWalletAdapterProvider>
    </>
  );
}

export default App;
