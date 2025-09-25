import { PortfolioDashboard } from "@/components/dashboard/PortfolioDashboard";

export default function PortfolioPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Portfolio</h1>
        <p className="text-muted-foreground">
          Monitor your assets, positions, and trading performance
        </p>
      </div>

      <PortfolioDashboard />
    </div>
  );
}