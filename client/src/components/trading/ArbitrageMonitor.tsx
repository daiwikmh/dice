"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAptosWallet } from "@/hooks/useAptosWallet";
import { RouterContract,FEE_TIERS } from "@/components/contracts";
import type { ArbitrageOpportunity } from "@/components/contracts";
import {
  Zap,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Clock,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_OPPORTUNITIES: ArbitrageOpportunity[] = [
  {
    token_x: "APT",
    token_y: "USDC",
    amm_price: "12.4500",
    clob_price: "12.4750",
    profit_potential: "125.50",
    recommended_amount: "5000.00",
  },
  {
    token_x: "WETH",
    token_y: "USDC",
    amm_price: "2850.30",
    clob_price: "2848.95",
    profit_potential: "67.50",
    recommended_amount: "1.50",
  },
  {
    token_x: "APT",
    token_y: "WETH",
    amm_price: "0.004370",
    clob_price: "0.004385",
    profit_potential: "45.20",
    recommended_amount: "10000.00",
  },
];

interface ArbitrageStats {
  totalOpportunities: number;
  totalProfitPotential: string;
  averageProfitMargin: string;
  bestOpportunity: ArbitrageOpportunity | null;
}

export function ArbitrageMonitor() {
  const { connected, signAndSubmitTransaction } = useAptosWallet();
  const [opportunities, setOpportunities] = React.useState<ArbitrageOpportunity[]>(MOCK_OPPORTUNITIES);
  const [isLoading, setIsLoading] = React.useState(false);
  const [lastUpdate, setLastUpdate] = React.useState(Date.now());
  const [isExecuting, setIsExecuting] = React.useState<string | null>(null);

  const refreshOpportunities = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would check multiple trading pairs
      // For now, simulate with slight variations
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newOpportunities = MOCK_OPPORTUNITIES.map(opp => ({
        ...opp,
        amm_price: (parseFloat(opp.amm_price) + (Math.random() - 0.5) * 0.01).toFixed(4),
        clob_price: (parseFloat(opp.clob_price) + (Math.random() - 0.5) * 0.01).toFixed(4),
        profit_potential: (parseFloat(opp.profit_potential) + (Math.random() - 0.5) * 10).toFixed(2),
      }));

      setOpportunities(newOpportunities);
      setLastUpdate(Date.now());
    } catch (error) {
      console.error("Failed to refresh opportunities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeArbitrage = async (opportunity: ArbitrageOpportunity) => {
    if (!connected) return;

    setIsExecuting(opportunity.token_x + opportunity.token_y);
    try {
      // Determine which side to execute on CLOB
      const ammPrice = parseFloat(opportunity.amm_price);
      const clobPrice = parseFloat(opportunity.clob_price);
      const clobSide = ammPrice < clobPrice ? 1 : 0; // Sell if AMM < CLOB, Buy if AMM > CLOB

      const transaction = RouterContract.arbitrageAmmClob(
        `0x1::aptos_coin::AptosCoin`, // Mock token X address
        `0x12345::usdc::USDC`, // Mock token Y address
        FEE_TIERS.LOW,
        clobSide,
        Math.floor(clobPrice * 1_000_000).toString(), // Scale price with 6-decimal precision
        Math.floor(parseFloat(opportunity.recommended_amount)).toString() // Amount in raw units
      );

      const response = await signAndSubmitTransaction(transaction);
      console.log("Arbitrage executed successfully:", response);

      // Remove the executed opportunity from the list
      setOpportunities(prev =>
        prev.filter(opp => opp !== opportunity)
      );
    } catch (error) {
      console.error("Arbitrage execution failed:", error);
    } finally {
      setIsExecuting(null);
    }
  };

  const calculateStats = (): ArbitrageStats => {
    const totalProfitPotential = opportunities.reduce(
      (sum, opp) => sum + parseFloat(opp.profit_potential),
      0
    );

    const averageMargin = opportunities.length > 0 ?
      opportunities.reduce((sum, opp) => {
        const ammPrice = parseFloat(opp.amm_price);
        const clobPrice = parseFloat(opp.clob_price);
        const margin = Math.abs((clobPrice - ammPrice) / ammPrice) * 100;
        return sum + margin;
      }, 0) / opportunities.length : 0;

    const bestOpportunity = opportunities.reduce((best, current) => {
      const currentProfit = parseFloat(current.profit_potential);
      const bestProfit = best ? parseFloat(best.profit_potential) : 0;
      return currentProfit > bestProfit ? current : best;
    }, null as ArbitrageOpportunity | null);

    return {
      totalOpportunities: opportunities.length,
      totalProfitPotential: totalProfitPotential.toFixed(2),
      averageProfitMargin: averageMargin.toFixed(3),
      bestOpportunity,
    };
  };

  const getProfitMargin = (opportunity: ArbitrageOpportunity): number => {
    const ammPrice = parseFloat(opportunity.amm_price);
    const clobPrice = parseFloat(opportunity.clob_price);
    return Math.abs((clobPrice - ammPrice) / ammPrice) * 100;
  };

  const getArbitrageDirection = (opportunity: ArbitrageOpportunity): "buy-amm" | "buy-clob" => {
    return parseFloat(opportunity.amm_price) < parseFloat(opportunity.clob_price) ?
      "buy-amm" : "buy-clob";
  };

  React.useEffect(() => {
    refreshOpportunities();
    const interval = setInterval(refreshOpportunities, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-warning/10 p-3">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Opportunities</div>
                <div className="text-2xl font-bold">{stats.totalOpportunities}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-success/10 p-3">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Profit</div>
                <div className="text-2xl font-bold">${stats.totalProfitPotential}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-500/10 p-3">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Avg Margin</div>
                <div className="text-2xl font-bold">{stats.averageProfitMargin}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-500/10 p-3">
                <Clock className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Last Update</div>
                <div className="text-lg font-bold">
                  {Math.floor((Date.now() - lastUpdate) / 1000)}s
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Opportunity Highlight */}
      {stats.bestOpportunity && (
        <Card className="border-success/50 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <Zap className="h-5 w-5" />
              Best Opportunity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Pair</div>
                <div className="text-lg font-bold">
                  {stats.bestOpportunity.token_x}/{stats.bestOpportunity.token_y}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Profit</div>
                <div className="text-lg font-bold text-success">
                  ${stats.bestOpportunity.profit_potential}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Margin</div>
                <div className="text-lg font-bold">
                  {getProfitMargin(stats.bestOpportunity).toFixed(3)}%
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Strategy</div>
                <Badge variant="outline" className="text-xs">
                  {getArbitrageDirection(stats.bestOpportunity) === "buy-amm" ?
                    "Buy AMM → Sell CLOB" : "Buy CLOB → Sell AMM"}
                </Badge>
              </div>
              <div>
                <Button
                  size="sm"
                  onClick={() => executeArbitrage(stats.bestOpportunity!)}
                  disabled={!connected || isExecuting === stats.bestOpportunity!.token_x + stats.bestOpportunity!.token_y}
                  className="w-full"
                >
                  {isExecuting === stats.bestOpportunity.token_x + stats.bestOpportunity.token_y ?
                    "Executing..." : "Execute"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunities Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Arbitrage Opportunities
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshOpportunities}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Opportunities Found</p>
              <p>No profitable arbitrage opportunities detected at the moment.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pair</TableHead>
                  <TableHead>AMM Price</TableHead>
                  <TableHead>CLOB Price</TableHead>
                  <TableHead>Profit Margin</TableHead>
                  <TableHead>Est. Profit</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((opportunity, index) => {
                  const margin = getProfitMargin(opportunity);
                  const direction = getArbitrageDirection(opportunity);
                  const isCurrentlyExecuting = isExecuting === opportunity.token_x + opportunity.token_y;

                  return (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {opportunity.token_x}/{opportunity.token_y}
                      </TableCell>
                      <TableCell className="font-mono">
                        ${parseFloat(opportunity.amm_price).toFixed(4)}
                      </TableCell>
                      <TableCell className="font-mono">
                        ${parseFloat(opportunity.clob_price).toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            margin > 0.1 ? "text-success border-success" :
                            margin > 0.05 ? "text-warning border-warning" :
                            "text-muted-foreground"
                          )}
                        >
                          {margin.toFixed(3)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-success">
                        ${opportunity.profit_potential}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {direction === "buy-amm" ?
                            "Buy AMM → Sell CLOB" : "Buy CLOB → Sell AMM"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => executeArbitrage(opportunity)}
                          disabled={!connected || isCurrentlyExecuting}
                        >
                          {isCurrentlyExecuting ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              Executing
                            </>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 mr-1" />
                              Execute
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Educational Info */}
      <Card>
        <CardHeader>
          <CardTitle>How Arbitrage Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                AMM → CLOB Arbitrage
              </h4>
              <p className="text-sm text-muted-foreground">
                When AMM price is lower than CLOB price, buy from AMM and sell on CLOB to capture the price difference.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 rotate-180" />
                CLOB → AMM Arbitrage
              </h4>
              <p className="text-sm text-muted-foreground">
                When CLOB price is lower than AMM price, buy from CLOB and sell to AMM to profit from the spread.
              </p>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <h5 className="font-medium text-sm">Risk Warning</h5>
                <p className="text-xs text-muted-foreground mt-1">
                  Arbitrage opportunities can disappear quickly due to price movements and other traders.
                  Always verify current prices before executing trades and be aware of gas costs and slippage.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}