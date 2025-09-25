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
import { AMMContract, FEE_TIERS, CustomCoinContract, CONTRACT_ADDRESSES } from "@/components/contracts";
import { TokenPriceChart } from "./TokenPriceChart";
import type { TokenCreationRequest } from "@/components/contracts";
import {
  Plus,
  CheckCircle,
  AlertCircle,
  Factory,
  Coins,
  Sparkles,
  TrendingUp
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

interface PoolCreationRequest {
  id: string;
  tokenX: Token;
  tokenY: Token;
  feeTier: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  txHash?: string;
}

export function PoolManagement() {
  const { connected, address, signAndSubmitTransaction } = useAptosWallet();

  const [isInitialized, setIsInitialized] = React.useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = React.useState(false);

  // Pool creation state
  const [tokenX, setTokenX] = React.useState<Token>(TOKENS[0]);
  const [tokenY, setTokenY] = React.useState<Token>(TOKENS[1]);
  const [feeTier, setFeeTier] = React.useState<5 | 30>(FEE_TIERS.LOW);
  const [isCreatingPool, setIsCreatingPool] = React.useState(false);

  // Track pool creation requests
  const [poolCreationRequests, setPoolCreationRequests] = React.useState<PoolCreationRequest[]>([]);

  // Custom token input state
  const [customTokenAddress, setCustomTokenAddress] = React.useState("");
  const [customTokenSymbol, setCustomTokenSymbol] = React.useState("");
  const [customTokenName, setCustomTokenName] = React.useState("");
  const [customTokenDecimals, setCustomTokenDecimals] = React.useState("8");

  // Token creation state
  const [tokenName, setTokenName] = React.useState("");
  const [tokenSymbol, setTokenSymbol] = React.useState("");
  const [tokenDecimals, setTokenDecimals] = React.useState("8");
  const [initialSupply, setInitialSupply] = React.useState("");
  const [monitorSupply, setMonitorSupply] = React.useState(true);
  const [isCreatingToken, setIsCreatingToken] = React.useState(false);
  const [tokenCreationRequests, setTokenCreationRequests] = React.useState<TokenCreationRequest[]>([]);

  // Token management state for created tokens
  const [selectedToken, setSelectedToken] = React.useState<TokenCreationRequest | null>(null);
  const [mintAmount, setMintAmount] = React.useState("");
  const [mintToAddress, setMintToAddress] = React.useState("");
  const [transferAmount, setTransferAmount] = React.useState("");
  const [transferToAddress, setTransferToAddress] = React.useState("");
  const [isMinting, setIsMinting] = React.useState(false);
  const [isTransferring, setIsTransferring] = React.useState(false);

  const handleInitialize = async () => {
    if (!connected) return;

    setIsInitializing(true);
    try {
      const transaction = AMMContract.initialize();
      const response = await signAndSubmitTransaction(transaction);
      console.log("AMM initialized successfully:", response);
      setIsInitialized(true);
    } catch (error) {
      console.error("AMM initialization failed:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCreatePool = async () => {
    if (!connected || !isInitialized || tokenX.address === tokenY.address) return;

    setIsCreatingPool(true);

    // Create tracking entry
    const requestId = Date.now().toString();
    const newRequest: PoolCreationRequest = {
      id: requestId,
      tokenX,
      tokenY,
      feeTier,
      status: 'pending',
      timestamp: Date.now(),
    };

    setPoolCreationRequests(prev => [newRequest, ...prev]);

    try {
      // Ensure consistent token ordering for pool
      const [sortedTokenX, sortedTokenY] = [tokenX.address, tokenY.address].sort();

      const transaction = AMMContract.createPool(
        sortedTokenX,
        sortedTokenY,
        feeTier
      );

      const response = await signAndSubmitTransaction(transaction);
      console.log("Pool created successfully:", response);

      // Update request status
      setPoolCreationRequests(prev => prev.map(req =>
        req.id === requestId
          ? { ...req, status: 'completed', txHash: response.hash }
          : req
      ));

    } catch (error) {
      console.error("Pool creation failed:", error);

      // Update request status to failed
      setPoolCreationRequests(prev => prev.map(req =>
        req.id === requestId
          ? { ...req, status: 'failed' }
          : req
      ));
    } finally {
      setIsCreatingPool(false);
    }
  };

  const handleCreateToken = async () => {
    if (!connected || !tokenName || !tokenSymbol || !initialSupply) return;

    setIsCreatingToken(true);

    // Create tracking entry
    const requestId = Date.now().toString();
    const newRequest: TokenCreationRequest = {
      id: requestId,
      name: tokenName,
      symbol: tokenSymbol.toUpperCase(),
      decimals: parseInt(tokenDecimals),
      initialSupply,
      status: 'pending',
      timestamp: Date.now(),
    };

    setTokenCreationRequests(prev => [newRequest, ...prev]);

    try {
      // Use the only available struct type in the contract
      const coinType = `${CONTRACT_ADDRESSES.CUSTOM_COIN}::CustomCoin`;

      let initResponse;

      // Step 1: Try to initialize the coin (will fail if already initialized)
      try {
        const initTransaction = CustomCoinContract.initializeCoin(
          tokenName,
          tokenSymbol.toUpperCase(),
          parseInt(tokenDecimals),
          monitorSupply,
          coinType
        );

        initResponse = await signAndSubmitTransaction(initTransaction);
        console.log("Token initialized successfully:", initResponse);
      } catch (initError) {
        // If coin already initialized, we can't create a new one with this contract
        throw new Error("This contract only allows one coin type per admin address. Coin already initialized.");
      }

      // Step 2: Register the coin for the creator's account (skip if already registered)
      try {
        const registerTransaction = CustomCoinContract.registerCoin(coinType);
        await signAndSubmitTransaction(registerTransaction);
      } catch (regError) {
        console.log("Coin already registered for this account");
      }

      // Step 3: Mint initial supply to creator (this will work even if coin was already initialized)
      const mintTransaction = CustomCoinContract.mintWithAdmin(
        address!,
        (parseFloat(initialSupply) * Math.pow(10, parseInt(tokenDecimals))).toString(),
        coinType
      );
      await signAndSubmitTransaction(mintTransaction);

      // Use the coin type as token address
      const tokenAddress = coinType;

      // Update request status
      setTokenCreationRequests(prev => prev.map(req =>
        req.id === requestId
          ? {
              ...req,
              status: 'completed',
              txHash: initResponse.hash,
              tokenAddress
            }
          : req
      ));

      // Add to available tokens
      const newToken: Token = {
        symbol: tokenSymbol.toUpperCase(),
        name: tokenName,
        address: tokenAddress,
        decimals: parseInt(tokenDecimals),
      };
      TOKENS.push(newToken);

      // Reset form
      setTokenName("");
      setTokenSymbol("");
      setTokenDecimals("8");
      setInitialSupply("");
      setMonitorSupply(true);

    } catch (error) {
      console.error("Token creation failed:", error);

      // Update request status to failed
      setTokenCreationRequests(prev => prev.map(req =>
        req.id === requestId
          ? { ...req, status: 'failed' }
          : req
      ));
    } finally {
      setIsCreatingToken(false);
    }
  };

  const handleMintToken = async () => {
    if (!connected || !selectedToken || !mintAmount || !mintToAddress) return;

    setIsMinting(true);
    try {
      // Use the token's coin type for minting
      const coinType = selectedToken.tokenAddress || `${CONTRACT_ADDRESSES.CUSTOM_COIN}::${selectedToken.symbol}`;

      const transaction = CustomCoinContract.mintWithAdmin(
        mintToAddress,
        (parseFloat(mintAmount) * Math.pow(10, selectedToken.decimals)).toString(),
        coinType
      );

      const response = await signAndSubmitTransaction(transaction);
      console.log("Token minted successfully:", response);

      // Reset form
      setMintAmount("");
      setMintToAddress("");
    } catch (error) {
      console.error("Token minting failed:", error);
    } finally {
      setIsMinting(false);
    }
  };

  const handleTransferToken = async () => {
    if (!connected || !selectedToken || !transferAmount || !transferToAddress) return;

    setIsTransferring(true);
    try {
      // Use the token's coin type for transfer
      const coinType = selectedToken.tokenAddress || `${CONTRACT_ADDRESSES.CUSTOM_COIN}::${selectedToken.symbol}`;

      const transaction = CustomCoinContract.transfer(
        transferToAddress,
        (parseFloat(transferAmount) * Math.pow(10, selectedToken.decimals)).toString(),
        coinType
      );

      const response = await signAndSubmitTransaction(transaction);
      console.log("Token transferred successfully:", response);

      // Reset form
      setTransferAmount("");
      setTransferToAddress("");
    } catch (error) {
      console.error("Token transfer failed:", error);
    } finally {
      setIsTransferring(false);
    }
  };

  const addCustomToken = () => {
    if (!customTokenAddress || !customTokenSymbol || !customTokenName) return;

    const newToken: Token = {
      symbol: customTokenSymbol.toUpperCase(),
      name: customTokenName,
      address: customTokenAddress,
      decimals: parseInt(customTokenDecimals),
    };

    // Add to available tokens (in a real app, this would be persisted)
    TOKENS.push(newToken);

    // Reset form
    setCustomTokenAddress("");
    setCustomTokenSymbol("");
    setCustomTokenName("");
    setCustomTokenDecimals("8");
  };

  const getPoolId = (tokenA: Token, tokenB: Token, fee: number) => {
    const [token1, token2] = [tokenA.symbol, tokenB.symbol].sort();
    return `${token1}-${token2}-${(fee / 100).toFixed(2)}%`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* AMM Initialization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            AMM Initialization
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isInitialized === null ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>AMM initialization status unknown. Please initialize if you are the deployer.</span>
              </div>
              <Button
                onClick={handleInitialize}
                disabled={!connected || isInitializing}
                className="w-full sm:w-auto"
              >
                {isInitializing ? "Initializing..." : "Initialize AMM"}
              </Button>
            </div>
          ) : isInitialized ? (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="h-4 w-4" />
              <span>AMM is initialized and ready for pool creation</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-4 w-4" />
                <span>AMM needs to be initialized first</span>
              </div>
              <Button
                onClick={handleInitialize}
                disabled={!connected || isInitializing}
              >
                {isInitializing ? "Initializing..." : "Initialize AMM"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pool Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Pool Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="create">Create Pool</TabsTrigger>
              <TabsTrigger value="create-token">Create Token</TabsTrigger>
              <TabsTrigger value="charts">Price Charts</TabsTrigger>
              <TabsTrigger value="tokens">Manage Tokens</TabsTrigger>
            </TabsList>

            {/* Create Pool Tab */}
            <TabsContent value="create" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Token X</Label>
                    <Select
                      value={tokenX.symbol}
                      onValueChange={(value) =>
                        setTokenX(TOKENS.find((t) => t.symbol === value) || TOKENS[0])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOKENS.map((token) => (
                          <SelectItem key={token.symbol} value={token.symbol}>
                            <div className="flex flex-col">
                              <span>{token.symbol}</span>
                              <span className="text-xs text-muted-foreground">{token.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Token Y</Label>
                    <Select
                      value={tokenY.symbol}
                      onValueChange={(value) =>
                        setTokenY(TOKENS.find((t) => t.symbol === value) || TOKENS[1])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOKENS.map((token) => (
                          <SelectItem key={token.symbol} value={token.symbol}>
                            <div className="flex flex-col">
                              <span>{token.symbol}</span>
                              <span className="text-xs text-muted-foreground">{token.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fee Tier</Label>
                   <Select
  value={feeTier.toString()}
  onValueChange={(value) => setFeeTier(parseInt(value) as 5 | 30)}
>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value={FEE_TIERS.LOW.toString()}>
      0.05% (Low Risk/High Volume)
    </SelectItem>
    <SelectItem value={FEE_TIERS.HIGH.toString()}>
      0.30% (Higher Risk/Lower Volume)
    </SelectItem>
  </SelectContent>
</Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-3">Pool Preview</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Pool ID:</span>
                        <span className="font-mono">{getPoolId(tokenX, tokenY, feeTier)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Trading Fee:</span>
                        <span>{(feeTier / 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Token X:</span>
                        <span>{tokenX.symbol} ({tokenX.decimals} decimals)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Token Y:</span>
                        <span>{tokenY.symbol} ({tokenY.decimals} decimals)</span>
                      </div>
                    </div>

                    {tokenX.address === tokenY.address && (
                      <div className="mt-3 p-2 bg-destructive/10 text-destructive text-xs rounded">
                        ⚠️ Cannot create pool with same token
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCreatePool}
                    disabled={
                      !connected ||
                      !isInitialized ||
                      isCreatingPool ||
                      tokenX.address === tokenY.address
                    }
                  >
                    {isCreatingPool
                      ? "Creating Pool..."
                      : !connected
                      ? "Connect Wallet"
                      : !isInitialized
                      ? "Initialize AMM First"
                      : tokenX.address === tokenY.address
                      ? "Select Different Tokens"
                      : "Create Pool"}
                  </Button>
                </div>
              </div>

              {/* Pool Creation History */}
              {poolCreationRequests.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-lg font-semibold mb-4">Recent Pool Creations</h4>
                  <div className="space-y-3">
                    {poolCreationRequests.slice(0, 5).map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {request.tokenX.symbol}/{request.tokenY.symbol}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Fee: {(request.feeTier / 100).toFixed(2)}% • {new Date(request.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            request.status === 'completed' ? 'text-success border-success' :
                            request.status === 'failed' ? 'text-destructive border-destructive' :
                            'text-warning border-warning'
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Create Token Tab */}
            <TabsContent value="create-token" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Create New Token
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Launch your own custom token on the Aptos blockchain. You will be the admin with minting and burning capabilities.
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="token-name">Token Name</Label>
                      <Input
                        id="token-name"
                        placeholder="My Awesome Token"
                        value={tokenName}
                        onChange={(e) => setTokenName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="token-symbol">Token Symbol</Label>
                      <Input
                        id="token-symbol"
                        placeholder="MAT"
                        value={tokenSymbol}
                        onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                        maxLength={10}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="token-decimals">Decimals</Label>
                      <Select value={tokenDecimals} onValueChange={setTokenDecimals}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6 decimals</SelectItem>
                          <SelectItem value="8">8 decimals</SelectItem>
                          <SelectItem value="9">9 decimals</SelectItem>
                          <SelectItem value="18">18 decimals</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="initial-supply">Initial Supply</Label>
                      <Input
                        id="initial-supply"
                        placeholder="1000000"
                        value={initialSupply}
                        onChange={(e) => setInitialSupply(e.target.value)}
                        type="number"
                        step="any"
                      />
                      <p className="text-xs text-muted-foreground">
                        Amount of tokens to mint initially to your wallet
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="coin-type">Coin Type Name</Label>
                      <Input
                        id="coin-type"
                        placeholder="EXAMPLE"
                        value={tokenSymbol}
                        onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                        maxLength={20}
                      />
                      <p className="text-xs text-muted-foreground">
                        Will create: {CONTRACT_ADDRESSES.CUSTOM_COIN}::{tokenSymbol || "EXAMPLE"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="monitor-supply"
                          checked={monitorSupply}
                          onChange={(e) => setMonitorSupply(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="monitor-supply">Monitor Supply</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enable supply tracking and events for this token
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-3">Token Preview</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Name:</span>
                        <span>{tokenName || "Token Name"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Symbol:</span>
                        <span>{tokenSymbol || "SYMBOL"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Decimals:</span>
                        <span>{tokenDecimals}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Initial Supply:</span>
                        <span>{initialSupply || "0"} {tokenSymbol || "TOKENS"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monitor Supply:</span>
                        <span>{monitorSupply ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Admin:</span>
                        <span className="font-mono text-xs">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Your Address"}</span>
                      </div>
                    </div>

                    {(!tokenName || !tokenSymbol || !initialSupply) && (
                      <div className="mt-3 p-2 bg-warning/10 text-warning text-xs rounded">
                        ⚠️ Please fill all required fields
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCreateToken}
                    disabled={
                      !connected ||
                      !tokenName ||
                      !tokenSymbol ||
                      !initialSupply ||
                      isCreatingToken
                    }
                  >
                    {isCreatingToken
                      ? "Creating Token..."
                      : !connected
                      ? "Connect Wallet"
                      : "Create Token"}
                  </Button>

                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 text-sm">
                    <h5 className="font-medium mb-2">What happens when you create a token?</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Initialize your custom coin type</li>
                      <li>• Register the coin for your account</li>
                      <li>• Mint initial supply to your wallet</li>
                      <li>• You become the admin with full control</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Token Management Section */}
              {tokenCreationRequests.filter(t => t.status === 'completed').length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-lg font-semibold mb-4">Manage Your Tokens</h4>

                  {/* Token Selection */}
                  <div className="space-y-4 mb-6">
                    <div className="space-y-2">
                      <Label>Select Token to Manage</Label>
                      <Select
                        value={selectedToken?.id || ""}
                        onValueChange={(value) => {
                          const token = tokenCreationRequests.find(t => t.id === value);
                          setSelectedToken(token || null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a token you created" />
                        </SelectTrigger>
                        <SelectContent>
                          {tokenCreationRequests
                            .filter(t => t.status === 'completed')
                            .map((token) => (
                              <SelectItem key={token.id} value={token.id}>
                                {token.symbol} - {token.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedToken && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Mint Tokens */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Plus className="h-5 w-5 text-success" />
                            Mint Tokens
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Mint To Address</Label>
                            <Input
                              placeholder="0x..."
                              value={mintToAddress}
                              onChange={(e) => setMintToAddress(e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMintToAddress(address || "")}
                              disabled={!address}
                            >
                              Use My Address
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                              placeholder="1000"
                              value={mintAmount}
                              onChange={(e) => setMintAmount(e.target.value)}
                              type="number"
                              step="any"
                            />
                          </div>

                          <Button
                            className="w-full"
                            onClick={handleMintToken}
                            disabled={!connected || !mintAmount || !mintToAddress || isMinting}
                          >
                            {isMinting ? "Minting..." : `Mint ${selectedToken.symbol}`}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Transfer Tokens */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-blue-500" />
                            Transfer Tokens
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Transfer To Address</Label>
                            <Input
                              placeholder="0x..."
                              value={transferToAddress}
                              onChange={(e) => setTransferToAddress(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                              placeholder="100"
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                              type="number"
                              step="any"
                            />
                          </div>

                          <Button
                            className="w-full"
                            onClick={handleTransferToken}
                            disabled={!connected || !transferAmount || !transferToAddress || isTransferring}
                            variant="outline"
                          >
                            {isTransferring ? "Transferring..." : `Transfer ${selectedToken.symbol}`}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}

              {/* Token Creation History */}
              {tokenCreationRequests.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-lg font-semibold mb-4">Recent Token Creations</h4>
                  <div className="space-y-3">
                    {tokenCreationRequests.slice(0, 5).map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            {request.symbol} ({request.name})
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Supply: {request.initialSupply} • {request.decimals} decimals • {new Date(request.timestamp).toLocaleString()}
                          </div>
                          {request.tokenAddress && (
                            <div className="text-xs font-mono text-muted-foreground mt-1">
                              {request.tokenAddress}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            request.status === 'completed' ? 'text-success border-success' :
                            request.status === 'failed' ? 'text-destructive border-destructive' :
                            'text-warning border-warning'
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Price Charts Tab */}
            <TabsContent value="charts" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Token Price Charts
                </h4>
                <p className="text-sm text-muted-foreground">
                  Monitor real-time price movements for available tokens in the platform.
                </p>

                {/* Available Tokens Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {TOKENS.map((token) => (
                    <TokenPriceChart
                      key={token.symbol}
                      tokenSymbol={token.symbol}
                      tokenName={token.name}
                    />
                  ))}
                </div>

                {/* User Created Tokens Charts */}
                {tokenCreationRequests.filter(t => t.status === 'completed').length > 0 && (
                  <div className="space-y-4">
                    <h5 className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Your Created Tokens
                    </h5>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {tokenCreationRequests
                        .filter(t => t.status === 'completed')
                        .map((token) => (
                          <TokenPriceChart
                            key={token.id}
                            tokenSymbol={token.symbol}
                            tokenName={token.name}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Market Overview */}
                <div className="mt-8 pt-6 border-t">
                  <h5 className="text-lg font-semibold mb-4">Market Overview</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-success">+12.3%</div>
                      <div className="text-sm text-muted-foreground">24h Change</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">$2.4M</div>
                      <div className="text-sm text-muted-foreground">Total Volume</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">{TOKENS.length + tokenCreationRequests.filter(t => t.status === 'completed').length}</div>
                      <div className="text-sm text-muted-foreground">Active Tokens</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">98.7%</div>
                      <div className="text-sm text-muted-foreground">Uptime</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Manage Tokens Tab */}
            <TabsContent value="tokens" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Add Custom Token</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="token-address">Token Address</Label>
                    <Input
                      id="token-address"
                      placeholder="0x..."
                      value={customTokenAddress}
                      onChange={(e) => setCustomTokenAddress(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="token-symbol">Symbol</Label>
                    <Input
                      id="token-symbol"
                      placeholder="TOKEN"
                      value={customTokenSymbol}
                      onChange={(e) => setCustomTokenSymbol(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="token-name">Name</Label>
                    <Input
                      id="token-name"
                      placeholder="Token Name"
                      value={customTokenName}
                      onChange={(e) => setCustomTokenName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="token-decimals">Decimals</Label>
                    <Input
                      id="token-decimals"
                      type="number"
                      placeholder="8"
                      value={customTokenDecimals}
                      onChange={(e) => setCustomTokenDecimals(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={addCustomToken}
                  disabled={!customTokenAddress || !customTokenSymbol || !customTokenName}
                  className="w-full md:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Token
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Available Tokens</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TOKENS.map((token, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{token.symbol}</span>
                        <Badge variant="outline">{token.decimals} decimals</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{token.name}</div>
                      <div className="text-xs font-mono bg-muted p-2 rounded text-wrap break-all">
                        {token.address}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}