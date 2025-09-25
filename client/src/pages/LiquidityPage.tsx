import { LiquidityProvision } from "@/components/trading";

export default function LiquidityPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Liquidity Provision</h1>
        <p className="text-muted-foreground">
          Provide liquidity to earn trading fees and rewards
        </p>
      </div>

      <LiquidityProvision />
    </div>
  );
}