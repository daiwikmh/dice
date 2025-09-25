import { TradingInterface, OrderBookView } from "@/components/trading";

export default function TradingPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trading</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TradingInterface />
        <OrderBookView
          baseCoin="APT"
          quoteCoin="USDC"
          onPriceClick={(price, side) => {
            console.log(`Clicked ${side} at ${price}`);
          }}
        />
      </div>
    </div>
  );
}