"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { OrderBookLevel, OrderBookDepth } from "@/components/contracts";

import { TrendingUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderBookViewProps {
  baseCoin: string;
  quoteCoin: string;
  onPriceClick?: (price: string, side: "buy" | "sell") => void;
}

const MOCK_ORDER_BOOK: OrderBookDepth = {
  bids: [
    { price: "1.0450", size: "125.50" },
    { price: "1.0449", size: "89.25" },
    { price: "1.0448", size: "156.75" },
    { price: "1.0447", size: "234.00" },
    { price: "1.0446", size: "98.50" },
    { price: "1.0445", size: "187.25" },
    { price: "1.0444", size: "145.80" },
    { price: "1.0443", size: "267.50" },
  ],
  asks: [
    { price: "1.0451", size: "134.75" },
    { price: "1.0452", size: "98.25" },
    { price: "1.0453", size: "167.50" },
    { price: "1.0454", size: "223.00" },
    { price: "1.0455", size: "145.75" },
    { price: "1.0456", size: "189.50" },
    { price: "1.0457", size: "156.25" },
    { price: "1.0458", size: "278.90" },
  ],
};

export function OrderBookView({ baseCoin, quoteCoin, onPriceClick }: OrderBookViewProps) {
  const [orderBook, setOrderBook] = React.useState<OrderBookDepth>(MOCK_ORDER_BOOK);
  const [isLoading, setIsLoading] = React.useState(false);
  const [lastUpdate, setLastUpdate] = React.useState(Date.now());

  const fetchOrderBook = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would call the contract
      // const payload = CLOBContract.getOrderBookDepthPayload(baseCoin, quoteCoin, 10);
      // const result = await aptosClient.view(payload);

      // For now, simulate with slight variations
      const simulateOrderBook = () => {
        const newBids = MOCK_ORDER_BOOK.bids.map(level => ({
          ...level,
          price: (parseFloat(level.price) + (Math.random() - 0.5) * 0.0001).toFixed(4),
          size: (parseFloat(level.size) + (Math.random() - 0.5) * 20).toFixed(2),
        }));

        const newAsks = MOCK_ORDER_BOOK.asks.map(level => ({
          ...level,
          price: (parseFloat(level.price) + (Math.random() - 0.5) * 0.0001).toFixed(4),
          size: (parseFloat(level.size) + (Math.random() - 0.5) * 20).toFixed(2),
        }));

        return { bids: newBids, asks: newAsks };
      };

      setTimeout(() => {
        setOrderBook(simulateOrderBook());
        setLastUpdate(Date.now());
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error("Failed to fetch order book:", error);
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [baseCoin, quoteCoin]);

  const calculateTotal = (levels: OrderBookLevel[], index: number) => {
    return levels
      .slice(0, index + 1)
      .reduce((total, level) => total + parseFloat(level.size), 0)
      .toFixed(2);
  };

  const maxBidSize = Math.max(...orderBook.bids.map(b => parseFloat(b.size)));
  const maxAskSize = Math.max(...orderBook.asks.map(a => parseFloat(a.size)));
  const maxSize = Math.max(maxBidSize, maxAskSize);

  const bestBid = orderBook.bids[0];
  const bestAsk = orderBook.asks[0];
  const spread = bestAsk && bestBid ?
    (parseFloat(bestAsk.price) - parseFloat(bestBid.price)).toFixed(4) : "0.0000";
  const spreadPercent = bestBid ?
    ((parseFloat(spread) / parseFloat(bestBid.price)) * 100).toFixed(2) : "0.00";

  return (
    <Card className="h-fit">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-bold">
          Order Book
          <div className="text-sm font-normal text-muted-foreground mt-1">
            {baseCoin}/{quoteCoin}
          </div>
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Spread: {spread} ({spreadPercent}%)
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOrderBook}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Header */}
        <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground">
          <div>Price ({quoteCoin})</div>
          <div className="text-right">Size ({baseCoin})</div>
          <div className="text-right">Total</div>
        </div>

        {/* Asks (Sell Orders) */}
        <div className="space-y-1">
          {orderBook.asks.slice().reverse().map((ask, index) => {
            const actualIndex = orderBook.asks.length - 1 - index;
            const sizePercent = (parseFloat(ask.size) / maxSize) * 100;
            const total = calculateTotal(orderBook.asks, actualIndex);

            return (
              <div
                key={`ask-${actualIndex}`}
                className="relative grid grid-cols-3 text-xs hover:bg-destructive/10 cursor-pointer rounded px-2 py-1 transition-colors"
                onClick={() => onPriceClick?.(ask.price, "sell")}
              >
                <div
                  className="absolute inset-y-0 right-0 bg-destructive/20 rounded-r"
                  style={{ width: `${sizePercent}%` }}
                />
                <div className="relative text-destructive font-medium">{ask.price}</div>
                <div className="relative text-right">{ask.size}</div>
                <div className="relative text-right text-muted-foreground">{total}</div>
              </div>
            );
          })}
        </div>

        {/* Current Price */}
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center space-x-2 text-sm">
            {bestAsk && (
              <>
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="font-mono font-bold">
                  {((parseFloat(bestBid?.price || "0") + parseFloat(bestAsk.price)) / 2).toFixed(4)}
                </span>
                <Badge variant="outline" className="text-xs">
                  Last: {new Date(lastUpdate).toLocaleTimeString()}
                </Badge>
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Bids (Buy Orders) */}
        <div className="space-y-1">
          {orderBook.bids.map((bid, index) => {
            const sizePercent = (parseFloat(bid.size) / maxSize) * 100;
            const total = calculateTotal(orderBook.bids, index);

            return (
              <div
                key={`bid-${index}`}
                className="relative grid grid-cols-3 text-xs hover:bg-success/10 cursor-pointer rounded px-2 py-1 transition-colors"
                onClick={() => onPriceClick?.(bid.price, "buy")}
              >
                <div
                  className="absolute inset-y-0 right-0 bg-success/20 rounded-r"
                  style={{ width: `${sizePercent}%` }}
                />
                <div className="relative text-success font-medium">{bid.price}</div>
                <div className="relative text-right">{bid.size}</div>
                <div className="relative text-right text-muted-foreground">{total}</div>
              </div>
            );
          })}
        </div>

        {/* Market Stats */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <div className="text-muted-foreground">24h Volume</div>
              <div className="font-medium">1,234,567 {baseCoin}</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">24h Change</div>
              <div className="font-medium text-success flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +2.34%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}