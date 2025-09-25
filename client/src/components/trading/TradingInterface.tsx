"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAptosWallet } from "@/hooks/useAptosWallet";
import { AMMContract, RouterContract, FEE_TIERS } from "@/components/contracts";
import { ArrowUpDown, Settings, Zap } from "lucide-react";

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
];

export function TradingInterface() {
  const { connected, address, signAndSubmitTransaction } = useAptosWallet();

  const [fromToken, setFromToken] = React.useState<Token>(TOKENS[0]);
  const [toToken, setToToken] = React.useState<Token>(TOKENS[1]);
  const [fromAmount, setFromAmount] = React.useState("");
  const [toAmount, setToAmount] = React.useState("");
  const [slippage, setSlippage] = React.useState("0.5");
  const [feeTier, setFeeTier] = React.useState(FEE_TIERS.LOW);
  const [isLoading, setIsLoading] = React.useState(false);
  const [routingMode, setRoutingMode] = React.useState<"amm" | "router">("router");

  const swapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = async () => {
    if (!connected || !fromAmount) return;

    setIsLoading(true);
    try {
      // Users enter raw units directly (e.g., 100000000 = 1 APT)
      const amountIn = Math.floor(parseFloat(fromAmount)).toString();
      const minAmountOut = Math.floor(parseFloat(toAmount || "0") * 0.95).toString(); // 5% slippage

      let transaction;

      if (routingMode === "amm") {
        transaction = AMMContract.swapExactIn(
          fromToken.address,
          toToken.address,
          feeTier,
          amountIn,
          minAmountOut,
          true
        );
      } else {
        transaction = RouterContract.swapExactInputSingle(
          fromToken.address,
          toToken.address,
          feeTier,
          amountIn,
          minAmountOut,
          true
        );
      }

      const response = await signAndSubmitTransaction(transaction);
      console.log("Swap successful:", response);

      // Reset form
      setFromAmount("");
      setToAmount("");
    } catch (error) {
      console.error("Swap failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEstimatedOutput = async () => {
    if (!fromAmount || !connected) return;

    // This would typically call the contract's view function
    // For now, we'll simulate with a mock calculation
    const mockRate = 1.05; // Mock exchange rate
    const estimated = (parseFloat(fromAmount) * mockRate).toFixed(6);
    setToAmount(estimated);
  };

  React.useEffect(() => {
    if (fromAmount) {
      const debounceTimer = setTimeout(getEstimatedOutput, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [fromAmount, fromToken, toToken, feeTier]);

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Swap Tokens</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {routingMode === "router" ? "Smart Router" : "AMM Only"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRoutingMode(routingMode === "router" ? "amm" : "router")}
            >
              {routingMode === "router" ? <Zap className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <Label htmlFor="from-amount">From</Label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <Input
                  id="from-amount"
                  placeholder="100000000 (units)"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  type="number"
                  step="1"
                />
              </div>
              <Select
                value={fromToken.symbol}
                onValueChange={(value) =>
                  setFromToken(TOKENS.find((t) => t.symbol === value) || TOKENS[0])
                }
              >
                <SelectTrigger className="w-24">
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

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={swapTokens}
              className="rounded-full p-2"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <Label htmlFor="to-amount">To</Label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <Input
                  id="to-amount"
                  placeholder="0 (units)"
                  value={toAmount}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <Select
                value={toToken.symbol}
                onValueChange={(value) =>
                  setToToken(TOKENS.find((t) => t.symbol === value) || TOKENS[1])
                }
              >
                <SelectTrigger className="w-24">
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

          <Separator />

          {/* Trading Settings */}
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slippage">Slippage Tolerance (%)</Label>
                <Select value={slippage} onValueChange={setSlippage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.1">0.1%</SelectItem>
                    <SelectItem value="0.5">0.5%</SelectItem>
                    <SelectItem value="1.0">1.0%</SelectItem>
                    <SelectItem value="2.0">2.0%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fee-tier">Fee Tier</Label>
                <Select
                  value={feeTier.toString()}
                  onValueChange={(value) => setFeeTier(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FEE_TIERS.LOW.toString()}>
                      0.05% (Low)
                    </SelectItem>
                    <SelectItem value={FEE_TIERS.HIGH.toString()}>
                      0.30% (High)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          {/* Swap Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSwap}
            disabled={!connected || !fromAmount || isLoading}
          >
            {isLoading
              ? "Swapping..."
              : !connected
              ? "Connect Wallet"
              : !fromAmount
              ? "Enter Amount"
              : "Swap Tokens"}
          </Button>

          {/* Transaction Details */}
          {fromAmount && toAmount && (
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Rate:</span>
                <span>
                  1 {fromToken.symbol} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toToken.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fee:</span>
                <span>{(feeTier / 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Slippage:</span>
                <span>{slippage}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}