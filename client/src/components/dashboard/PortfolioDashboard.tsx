"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAptosWallet } from "@/hooks/useAptosWallet";
import {  ORDER_SIDES } from "@/components/contracts";
import type { Portfolio, LiquidityPosition, Order } from "@/components/contracts";
import {
  Wallet,
  TrendingUp,
  Droplets,
  Clock,
  DollarSign,
  PieChart,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_PORTFOLIO: Portfolio = {
  balances: {
    "APT": "1,250.50",
    "USDC": "5,680.25",
    "WETH": "3.45",
  },
  positions: [
    {
      pool_id: "APT-USDC-0.05%",
      token_x: "APT",
      token_y: "USDC",
      liquidity: "15420.75",
      fee_tier: 5,
      rewards: "23.45",
    },
    {
      pool_id: "WETH-USDC-0.30%",
      token_x: "WETH",
      token_y: "USDC",
      liquidity: "8950.30",
      fee_tier: 30,
      rewards: "67.89",
    },
  ],
  orders: [
    {
      id: "1",
      side: ORDER_SIDES.BUY,
      price: "1.0445",
      size: "100.00",
      filled_size: "45.00",
      status: "open",
      timestamp: Date.now() - 300000,
    },
    {
      id: "2",
      side: ORDER_SIDES.SELL,
      price: "1.0465",
      size: "200.00",
      filled_size: "200.00",
      status: "filled",
      timestamp: Date.now() - 600000,
    },
  ],
  pnl: "+1,234.56",
  total_value: "45,789.12",
};

const MOCK_TOKEN_PRICES = {
  "APT": 12.45,
  "USDC": 1.00,
  "WETH": 2_850.30,
};

export function PortfolioDashboard() {
  const { connected, address } = useAptosWallet();
  const [portfolio, setPortfolio] = React.useState<Portfolio>(MOCK_PORTFOLIO);
  const [isLoading, setIsLoading] = React.useState(false);

  const refreshPortfolio = async () => {
    if (!connected) return;

    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from multiple contracts
      // For now, simulate with slight variations
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock refresh - in reality, you'd fetch balances, positions, orders, etc.
      setPortfolio(MOCK_PORTFOLIO);
    } catch (error) {
      console.error("Failed to refresh portfolio:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTokenValue = (symbol: string, amount: string) => {
    const price = MOCK_TOKEN_PRICES[symbol as keyof typeof MOCK_TOKEN_PRICES] || 0;
    return parseFloat(amount.replace(/,/g, "")) * price;
  };

  const getTotalPortfolioValue = () => {
    let total = 0;

    // Add token balances
    Object.entries(portfolio.balances).forEach(([symbol, amount]) => {
      total += calculateTokenValue(symbol, amount);
    });

    // Add liquidity position values (simplified)
    portfolio.positions.forEach(position => {
      total += parseFloat(position.liquidity) * 2.45; // Mock value
    });

    return total;
  };

  const getPortfolioDistribution = () => {
    const total = getTotalPortfolioValue();
    const distribution: { name: string; value: number; percentage: number; color: string }[] = [];

    // Token balances
    Object.entries(portfolio.balances).forEach(([symbol, amount], index) => {
      const value = calculateTokenValue(symbol, amount);
      const percentage = (value / total) * 100;
      const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

      distribution.push({
        name: symbol,
        value,
        percentage,
        color: colors[index % colors.length],
      });
    });

    // Liquidity positions
    portfolio.positions.forEach((position, index) => {
      const value = parseFloat(position.liquidity) * 2.45;
      const percentage = (value / total) * 100;

      distribution.push({
        name: `${position.token_x}-${position.token_y} LP`,
        value,
        percentage,
        color: `hsl(${200 + index * 30}, 70%, 60%)`,
      });
    });

    return distribution.sort((a, b) => b.value - a.value);
  };

  if (!connected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Connect Your Wallet</p>
          <p className="text-muted-foreground text-center">
            Connect your Aptos wallet to view your portfolio and trading positions
          </p>
        </CardContent>
      </Card>
    );
  }

  const distribution = getPortfolioDistribution();
  const totalValue = getTotalPortfolioValue();
  const pnlValue = parseFloat(portfolio.pnl.replace(/[+,]/g, ""));
  const pnlPercentage = ((pnlValue / totalValue) * 100).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Value</div>
                <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-success/10 p-3">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">P&L (24h)</div>
                <div className="text-2xl font-bold text-success flex items-center gap-1">
                  +${pnlValue.toLocaleString()}
                  <span className="text-sm">({pnlPercentage}%)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-500/10 p-3">
                <Droplets className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">LP Positions</div>
                <div className="text-2xl font-bold">{portfolio.positions.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-warning/10 p-3">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Open Orders</div>
                <div className="text-2xl font-bold">
                  {portfolio.orders.filter(o => o.status === "open").length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Allocation */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Asset Allocation
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshPortfolio}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {distribution.map((asset, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: asset.color }}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{asset.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {asset.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${asset.value.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Portfolio Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Portfolio Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="balances">
              <TabsList>
                <TabsTrigger value="balances">Token Balances</TabsTrigger>
                <TabsTrigger value="positions">LP Positions</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
              </TabsList>

              <TabsContent value="balances" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(portfolio.balances).map(([symbol, amount]) => {
                      const price = MOCK_TOKEN_PRICES[symbol as keyof typeof MOCK_TOKEN_PRICES] || 0;
                      const value = calculateTokenValue(symbol, amount);

                      return (
                        <TableRow key={symbol}>
                          <TableCell className="font-medium">{symbol}</TableCell>
                          <TableCell className="font-mono">{amount}</TableCell>
                          <TableCell className="font-mono">${price.toLocaleString()}</TableCell>
                          <TableCell className="font-mono">${value.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="positions" className="mt-4">
                <div className="space-y-4">
                  {portfolio.positions.map((position, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-semibold">
                            {position.token_x}/{position.token_y}
                          </div>
                          <Badge variant="outline">
                            {(position.fee_tier / 100).toFixed(2)}% Fee
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-success">
                            {((position.fee_tier === 5 ? 5.2 : 12.8) + Math.random() * 2).toFixed(1)}% APY
                          </div>
                          <div className="text-xs text-muted-foreground">Current Yield</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Liquidity</div>
                          <div className="font-mono">{position.liquidity}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Rewards</div>
                          <div className="font-mono text-success">{position.rewards}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Value</div>
                          <div className="font-mono">
                            ${(parseFloat(position.liquidity) * 2.45).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="orders" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Side</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Filled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolio.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className={order.side === ORDER_SIDES.BUY ? "text-success" : "text-destructive"}>
                            {order.side === ORDER_SIDES.BUY ? "Buy" : "Sell"}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{order.price}</TableCell>
                        <TableCell className="font-mono">{order.size}</TableCell>
                        <TableCell className="font-mono">{order.filled_size}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              order.status === "open" && "text-warning border-warning",
                              order.status === "filled" && "text-success border-success",
                              order.status === "cancelled" && "text-destructive border-destructive"
                            )}
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}