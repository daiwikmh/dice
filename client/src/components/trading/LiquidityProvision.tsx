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
import { useAptosWallet } from "@/hooks/useAptosWallet";
import { AMMContract, FEE_TIERS } from "@/components/contracts";
import type { LiquidityPosition } from "@/components/contracts";
import { PlusCircle, MinusCircle, Droplets, Calculator } from "lucide-react";

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

// Remove mock positions - these will be fetched from the blockchain
const INITIAL_POSITIONS: LiquidityPosition[] = [];

export function LiquidityProvision() {
  const { connected, address, signAndSubmitTransaction } = useAptosWallet();

  const [activeTab, setActiveTab] = React.useState("add");
  const [tokenX, setTokenX] = React.useState<Token>(TOKENS[0]);
  const [tokenY, setTokenY] = React.useState<Token>(TOKENS[1]);
  const [amountX, setAmountX] = React.useState("");
  const [amountY, setAmountY] = React.useState("");
  const [feeTier, setFeeTier] = React.useState(FEE_TIERS.LOW);
  const [isLoading, setIsLoading] = React.useState(false);
  const [positions, setPositions] = React.useState<LiquidityPosition[]>(INITIAL_POSITIONS);

  // Remove liquidity state
  const [selectedPosition, setSelectedPosition] = React.useState<LiquidityPosition | null>(null);
  const [removePercentage, setRemovePercentage] = React.useState("100");

  const calculateExpectedLiquidity = () => {
    if (!amountX || !amountY) return "0";
    // Mock calculation - in reality, this would be based on the pool's current ratio
    return (Math.sqrt(parseFloat(amountX) * parseFloat(amountY))).toFixed(6);
  };

  const handleAddLiquidity = async () => {
    if (!connected || !amountX || !amountY) return;

    setIsLoading(true);
    try {
      // Users enter raw units directly (e.g., 100000000 = 1 APT)
      const amountXScaled = Math.floor(parseFloat(amountX)).toString();
      const amountYScaled = Math.floor(parseFloat(amountY)).toString();
      const minLiquidity = "1"; // Minimum liquidity tokens

      const transaction = AMMContract.addLiquidity(
        tokenX.address,
        tokenY.address,
        feeTier,
        amountXScaled,
        amountYScaled,
        minLiquidity
      );

      const response = await signAndSubmitTransaction(transaction);
      console.log("Add liquidity successful:", response);

      // Reset form
      setAmountX("");
      setAmountY("");
    } catch (error) {
      console.error("Add liquidity failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!connected || !selectedPosition) return;

    setIsLoading(true);
    try {
      // Calculate liquidity amount to remove based on percentage
      const liquidityAmount = Math.floor(
        (parseFloat(selectedPosition.liquidity) * parseFloat(removePercentage)) / 100
      ).toString();

      const minAmountX = "1"; // Minimum amount X
      const minAmountY = "1"; // Minimum amount Y

      const transaction = AMMContract.removeLiquidity(
        tokenX.address,
        tokenY.address,
        selectedPosition.fee_tier,
        liquidityAmount,
        minAmountX,
        minAmountY
      );

      const response = await signAndSubmitTransaction(transaction);
      console.log("Remove liquidity successful:", response);

      // Reset form
      setSelectedPosition(null);
      setRemovePercentage("100");
    } catch (error) {
      console.error("Remove liquidity failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPoolAPY = (position: LiquidityPosition) => {
    // Mock APY calculation based on fee tier
    const baseAPY = position.fee_tier === FEE_TIERS.LOW ? 5.2 : 12.8;
    return baseAPY + Math.random() * 2; // Add some variation
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Liquidity Provision
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Add Liquidity
              </TabsTrigger>
              <TabsTrigger value="remove" className="flex items-center gap-2">
                <MinusCircle className="h-4 w-4" />
                Remove Liquidity
              </TabsTrigger>
            </TabsList>

            {/* Add Liquidity Tab */}
            <TabsContent value="add" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Token X</Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="100000000 (1 APT)"
                        value={amountX}
                        onChange={(e) => setAmountX(e.target.value)}
                        type="number"
                        step="1"
                      />
                      <Select
                        value={tokenX.symbol}
                        onValueChange={(value) =>
                          setTokenX(TOKENS.find((t) => t.symbol === value) || TOKENS[0])
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

                  <div className="space-y-2">
                    <Label>Token Y</Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="100000000 (1 MY)"
                        value={amountY}
                        onChange={(e) => setAmountY(e.target.value)}
                        type="number"
                        step="1"
                      />
                      <Select
                        value={tokenY.symbol}
                        onValueChange={(value) =>
                          setTokenY(TOKENS.find((t) => t.symbol === value) || TOKENS[1])
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
                </div>

                <div className="space-y-2">
                  <Label>Fee Tier</Label>
                  <Select
                    value={feeTier.toString()}
                    onValueChange={(value) => setFeeTier(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FEE_TIERS.LOW.toString()}>
                        0.05% (Low Risk)
                      </SelectItem>
                      <SelectItem value={FEE_TIERS.HIGH.toString()}>
                        0.30% (High Risk)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {amountX && amountY && (
                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calculator className="h-4 w-4" />
                      Position Preview
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Token X Amount:</span>
                        <span className="font-mono">{parseFloat(amountX).toLocaleString()} units = {(parseFloat(amountX) / Math.pow(10, tokenX.decimals)).toFixed(8)} {tokenX.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Token Y Amount:</span>
                        <span className="font-mono">{parseFloat(amountY).toLocaleString()} units = {(parseFloat(amountY) / Math.pow(10, tokenY.decimals)).toFixed(8)} {tokenY.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expected LP Tokens:</span>
                        <span className="font-mono">{calculateExpectedLiquidity()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated APY:</span>
                        <span className="font-mono text-success">
                          {feeTier === FEE_TIERS.LOW ? "5.2%" : "12.8%"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAddLiquidity}
                  disabled={!connected || !amountX || !amountY || isLoading}
                >
                  {isLoading
                    ? "Adding Liquidity..."
                    : !connected
                    ? "Connect Wallet"
                    : !amountX || !amountY
                    ? "Enter Amounts"
                    : "Add Liquidity"}
                </Button>
              </div>
            </TabsContent>

            {/* Remove Liquidity Tab */}
            <TabsContent value="remove" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Position</Label>
                  <Select
                    value={selectedPosition?.pool_id || ""}
                    onValueChange={(value) =>
                      setSelectedPosition(positions.find((p) => p.pool_id === value) || null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a position to remove" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((position) => (
                        <SelectItem key={position.pool_id} value={position.pool_id}>
                          {position.token_x}/{position.token_y} - {position.liquidity} LP
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPosition && (
                  <>
                    <div className="bg-muted rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Position Details</span>
                        <Badge variant="outline">
                          {(selectedPosition.fee_tier / 100).toFixed(2)}% Fee
                        </Badge>
                      </div>
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span>Liquidity Tokens:</span>
                          <span className="font-mono">{selectedPosition.liquidity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unclaimed Rewards:</span>
                          <span className="font-mono text-success">
                            {selectedPosition.rewards} {selectedPosition.token_y}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Current APY:</span>
                          <span className="font-mono text-success">
                            {getPoolAPY(selectedPosition).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Removal Percentage</Label>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="100"
                          value={removePercentage}
                          onChange={(e) => setRemovePercentage(e.target.value)}
                          type="number"
                          min="1"
                          max="100"
                        />
                        <div className="flex space-x-1">
                          {["25", "50", "75", "100"].map((percent) => (
                            <Button
                              key={percent}
                              variant="outline"
                              size="sm"
                              onClick={() => setRemovePercentage(percent)}
                            >
                              {percent}%
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted rounded-lg p-4 space-y-2">
                      <div className="text-sm font-medium">You will receive:</div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>{selectedPosition.token_x}:</span>
                          <span className="font-mono">
                            ~{((parseFloat(selectedPosition.liquidity) * parseFloat(removePercentage)) / 200).toFixed(6)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{selectedPosition.token_y}:</span>
                          <span className="font-mono">
                            ~{((parseFloat(selectedPosition.liquidity) * parseFloat(removePercentage)) / 200).toFixed(6)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rewards:</span>
                          <span className="font-mono text-success">
                            {selectedPosition.rewards} {selectedPosition.token_y}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleRemoveLiquidity}
                      disabled={!connected || isLoading}
                      variant="destructive"
                    >
                      {isLoading
                        ? "Removing Liquidity..."
                        : !connected
                        ? "Connect Wallet"
                        : `Remove ${removePercentage}% Liquidity`}
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Current Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Your Liquidity Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Droplets className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No liquidity positions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {positions.map((position, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
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
                        {getPoolAPY(position).toFixed(1)}% APY
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}