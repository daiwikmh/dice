"use client";

import * as React from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenPriceData {
  timestamp: number;
  price: number;
  volume: number;
}

interface TokenPriceChartProps {
  tokenSymbol: string;
  tokenName: string;
  className?: string;
}

// Mock price data generator
const generateMockPriceData = (symbol: string): TokenPriceData[] => {
  const now = Date.now();
  const data: TokenPriceData[] = [];
  let basePrice = Math.random() * 10 + 1; // Random base price between 1-11
  console.log("Base price for", symbol, "is", basePrice);

  // Generate 24 hours of hourly data
  for (let i = 23; i >= 0; i--) {
    const timestamp = now - (i * 60 * 60 * 1000); // Hours ago

    // Add some realistic price movement
    const change = (Math.random() - 0.5) * 0.1; // +/- 5% change
    basePrice = Math.max(0.1, basePrice + (basePrice * change));

    const volume = Math.random() * 100000 + 10000; // Random volume

    data.push({
      timestamp,
      price: parseFloat(basePrice.toFixed(6)),
      volume: parseFloat(volume.toFixed(2)),
    });
  }

  return data;
};

export function TokenPriceChart({ tokenSymbol, tokenName, className }: TokenPriceChartProps) {
  const [priceData, setPriceData] = React.useState<TokenPriceData[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [timeframe, setTimeframe] = React.useState<'1H' | '24H' | '7D'>('24H');

  const fetchPriceData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from a price API
      // For now, generate mock data
      setTimeout(() => {
        const mockData = generateMockPriceData(tokenSymbol);
        setPriceData(mockData);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error("Failed to fetch price data:", error);
      setIsLoading(false);
    }
  }, [tokenSymbol]);

  React.useEffect(() => {
    fetchPriceData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPriceData, 30000);
    return () => clearInterval(interval);
  }, [fetchPriceData]);

  const currentPrice = priceData[priceData.length - 1]?.price || 0;
  const previousPrice = priceData[priceData.length - 2]?.price || currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice ? (priceChange / previousPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium">{formatTime(label)}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Price: </span>
            <span className="font-mono">${formatPrice(payload[0].value)}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Volume: </span>
            <span className="font-mono">{payload[1]?.value?.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold">
            {tokenSymbol} Price Chart
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {tokenName}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-right">
            <div className="text-2xl font-bold font-mono">
              ${formatPrice(currentPrice)}
            </div>
            <div className={cn(
              "text-sm flex items-center gap-1",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isPositive ? '+' : ''}{formatPrice(priceChange)} ({priceChangePercent.toFixed(2)}%)
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPriceData}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Timeframe Selector */}
          <div className="flex space-x-1">
            {(['1H', '24H', '7D'] as const).map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>

          {/* Price Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  axisLine={false}
                  tickLine={false}
                  className="text-xs"
                />
                <YAxis
                  tickFormatter={(value) => `$${formatPrice(value)}`}
                  axisLine={false}
                  tickLine={false}
                  className="text-xs"
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isPositive ? "#10b981" : "#ef4444"}
                  fill={isPositive ? "#10b981" : "#ef4444"}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">24h Volume</div>
              <div className="font-mono font-medium">
                {priceData.reduce((sum, d) => sum + d.volume, 0).toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">24h High</div>
              <div className="font-mono font-medium">
                ${formatPrice(Math.max(...priceData.map(d => d.price)))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">24h Low</div>
              <div className="font-mono font-medium">
                ${formatPrice(Math.min(...priceData.map(d => d.price)))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}