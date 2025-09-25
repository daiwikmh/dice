"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAptosWallet } from "@/hooks/useAptosWallet";
import { CLOBContract, ORDER_SIDES } from "@/components/contracts";
import type { Order } from "@/components/contracts";
import {
  Plus,
  X,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

const TOKENS: Token[] = [
  {
    symbol: "APT",
    name: "Aptos Coin",
    address: "0x1::aptos_coin::AptosCoin",
    decimals: 8,
  },
  {
    symbol: "MY",
    name: "Custom Coin",
    address: "0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56::custom_coin::CustomCoin",
    decimals: 8,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b",
    decimals: 6,
  },
];

const MOCK_ORDERS: Order[] = [
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
  {
    id: "3",
    side: ORDER_SIDES.BUY,
    price: "1.0430",
    size: "150.00",
    filled_size: "0.00",
    status: "cancelled",
    timestamp: Date.now() - 900000,
  },
  {
    id: "4",
    side: ORDER_SIDES.SELL,
    price: "1.0470",
    size: "75.00",
    filled_size: "0.00",
    status: "open",
    timestamp: Date.now() - 120000,
  },
];

export function OrderManagement() {
  const { connected, signAndSubmitTransaction } = useAptosWallet();

  const [baseCoin, setBaseCoin] = React.useState<Token>(TOKENS[0]);
  const [quoteCoin, setQuoteCoin] = React.useState<Token>(TOKENS[1]);
  const [orderType, setOrderType] = React.useState<"limit" | "market">("limit");
  const [side, setSide] = React.useState<"buy" | "sell">("buy");
  const [price, setPrice] = React.useState("");
  const [size, setSize] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [orders, setOrders] = React.useState<Order[]>(MOCK_ORDERS);

  const handlePlaceOrder = async () => {
    if (!connected || !size || (orderType === "limit" && !price)) return;

    setIsLoading(true);
    try {
      // Users enter raw units directly (e.g., 100000000 = 1 APT)
      const sizeScaled = Math.floor(parseFloat(size)).toString();
      const orderSide = side === "buy" ? ORDER_SIDES.BUY : ORDER_SIDES.SELL;

      let transaction;

      if (orderType === "limit") {
        // Scale price with 6-decimal precision (PRICE_MULTIPLIER = 1,000,000)
        const priceScaled = Math.floor(parseFloat(price) * 1_000_000).toString();
        transaction = CLOBContract.placeLimitOrder(
          baseCoin.address,
          quoteCoin.address,
          orderSide,
          priceScaled,
          sizeScaled
        );
      } else {
        transaction = CLOBContract.placeMarketOrder(
          baseCoin.address,
          quoteCoin.address,
          orderSide,
          sizeScaled
        );
      }

      const response = await signAndSubmitTransaction(transaction);
      console.log("Order placed successfully:", response);

      // Add mock order to list
      const newOrder: Order = {
        id: Date.now().toString(),
        side: orderSide,
        price: orderType === "limit" ? price : "Market",
        size: size,
        filled_size: "0.00",
        status: "open",
        timestamp: Date.now(),
      };

      setOrders(prev => [newOrder, ...prev]);

      // Reset form
      setPrice("");
      setSize("");
    } catch (error) {
      console.error("Place order failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!connected) return;

    try {
      const transaction = CLOBContract.cancelOrder(
        baseCoin.address,
        quoteCoin.address,
        orderId
      );

      const response = await signAndSubmitTransaction(transaction);
      console.log("Order cancelled successfully:", response);

      // Update order status
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? { ...order, status: "cancelled" as const }
            : order
        )
      );
    } catch (error) {
      console.error("Cancel order failed:", error);
    }
  };

  const getOrderStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "open":
        return <Clock className="h-4 w-4 text-warning" />;
      case "filled":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getOrderStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="text-warning border-warning">Open</Badge>;
      case "filled":
        return <Badge variant="outline" className="text-success border-success">Filled</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-destructive border-destructive">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const openOrders = orders.filter(order => order.status === "open");
  const completedOrders = orders.filter(order => order.status !== "open");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Place Order Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Place Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Market Selection */}
            <div className="space-y-2">
              <Label>Trading Pair</Label>
              <div className="flex space-x-2">
                <Select
                  value={baseCoin.symbol}
                  onValueChange={(value) =>
                    setBaseCoin(TOKENS.find((t) => t.symbol === value) || TOKENS[0])
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOKENS.map((token) => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center text-muted-foreground">/</div>
                <Select
                  value={quoteCoin.symbol}
                  onValueChange={(value) =>
                    setQuoteCoin(TOKENS.find((t) => t.symbol === value) || TOKENS[1])
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOKENS.map((token) => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Order Type */}
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Tabs value={orderType} onValueChange={(value) => setOrderType(value as "limit" | "market")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="limit">Limit</TabsTrigger>
                  <TabsTrigger value="market">Market</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Side */}
            <div className="space-y-2">
              <Label>Side</Label>
              <Tabs value={side} onValueChange={(value) => setSide(value as "buy" | "sell")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="buy" className="text-success">Buy</TabsTrigger>
                  <TabsTrigger value="sell" className="text-destructive">Sell</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Price (for limit orders) */}
            {orderType === "limit" && (
              <div className="space-y-2">
                <Label>Price ({quoteCoin.symbol})</Label>
                <Input
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  type="number"
                  step="any"
                />
              </div>
            )}

            {/* Size */}
            <div className="space-y-2">
              <Label>Size ({baseCoin.symbol})</Label>
              <Input
                placeholder="0.00"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                type="number"
                step="any"
              />
            </div>

            {/* Order Summary */}
            {size && (orderType === "market" || price) && (
              <div className="bg-muted rounded-lg p-3 space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  {side === "buy" ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  Order Summary
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Side:</span>
                    <span className={side === "buy" ? "text-success" : "text-destructive"}>
                      {side.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-mono">{size} {baseCoin.symbol}</span>
                  </div>
                  {orderType === "limit" && (
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span className="font-mono">{price} {quoteCoin.symbol}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-mono">
                      {orderType === "limit"
                        ? (parseFloat(size) * parseFloat(price)).toFixed(6)
                        : "Market"} {quoteCoin.symbol}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handlePlaceOrder}
              disabled={!connected || !size || (orderType === "limit" && !price) || isLoading}
              variant={side === "buy" ? "default" : "destructive"}
            >
              {isLoading
                ? "Placing Order..."
                : !connected
                ? "Connect Wallet"
                : `${side === "buy" ? "Buy" : "Sell"} ${baseCoin.symbol}`}
            </Button>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="open">
              <TabsList>
                <TabsTrigger value="open">
                  Open Orders ({openOrders.length})
                </TabsTrigger>
                <TabsTrigger value="history">
                  Order History ({completedOrders.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="open" className="mt-4">
                {openOrders.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No open orders</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {openOrders.map((order) => (
                      <div
                        key={order.id}
                        className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {order.side === ORDER_SIDES.BUY ? (
                              <TrendingUp className="h-5 w-5 text-success" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-destructive" />
                            )}
                            <div>
                              <div className="font-medium">
                                {order.side === ORDER_SIDES.BUY ? "Buy" : "Sell"} {baseCoin.symbol}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(order.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getOrderStatusBadge(order.status)}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Price</div>
                            <div className="font-mono">{order.price}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Size</div>
                            <div className="font-mono">{order.size}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Filled</div>
                            <div className="font-mono">{order.filled_size}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Remaining</div>
                            <div className="font-mono">
                              {(parseFloat(order.size) - parseFloat(order.filled_size)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        {parseFloat(order.filled_size) > 0 && (
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2 transition-all"
                              style={{
                                width: `${(parseFloat(order.filled_size) / parseFloat(order.size)) * 100}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Filled</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="flex items-center gap-2">
                          {getOrderStatusIcon(order.status)}
                          {getOrderStatusBadge(order.status)}
                        </TableCell>
                        <TableCell>
                          <div className={order.side === ORDER_SIDES.BUY ? "text-success" : "text-destructive"}>
                            {order.side === ORDER_SIDES.BUY ? "Buy" : "Sell"}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{order.price}</TableCell>
                        <TableCell className="font-mono">{order.size}</TableCell>
                        <TableCell className="font-mono">{order.filled_size}</TableCell>
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