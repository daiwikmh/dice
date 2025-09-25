import { ArbitrageMonitor } from "@/components/trading";

export default function ArbitragePage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Arbitrage Monitor</h1>
        <p className="text-muted-foreground">
          Find and execute profitable arbitrage opportunities between AMM and CLOB
        </p>
      </div>

      <ArbitrageMonitor />
    </div>
  );
}