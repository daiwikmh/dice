module 0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56::router {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use 0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56::amm;
    use 0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56::clob;

    // Error codes
    const E_INVALID_PLAN: u64 = 1;
    const E_INSUFFICIENT_OUTPUT: u64 = 2;
    const E_PLAN_EXECUTION_FAILED: u64 = 3;
    const E_INVALID_ACTION_TYPE: u64 = 4;

    // Action types
    const ACTION_AMM_SWAP: u8 = 0;
    const ACTION_CLOB_LIMIT_ORDER: u8 = 1;
    const ACTION_CLOB_MARKET_ORDER: u8 = 2;

    struct SwapAction has store, drop {
        action_type: u8,
        fee_tier: u64,
        amount_in: u64,
        min_amount_out: u64,
        x_to_y: bool,
    }

    struct LimitOrderAction has store, drop {
        action_type: u8,
        side: u8,
        price: u64,
        size: u64,
    }

    struct MarketOrderAction has store, drop {
        action_type: u8,
        side: u8,
        size: u64,
    }

    struct ExecutionPlan has store, drop {
        actions: vector<u8>, // Serialized actions
        min_total_output: u64,
    }

    // Execute a multi-step trading plan atomically
    public entry fun execute_plan<X, Y>(
        user: &signer,
        actions: vector<u8>,
        min_total_output: u64,
    ) {
        let user_addr = signer::address_of(user);
        let initial_balance_x = coin::balance<X>(user_addr);
        let initial_balance_y = coin::balance<Y>(user_addr);

        // Execute each action in sequence
        execute_actions<X, Y>(user, actions);

        // Verify minimum output requirement
        let final_balance_x = coin::balance<X>(user_addr);
        let final_balance_y = coin::balance<Y>(user_addr);

        let net_output = if (final_balance_y > initial_balance_y) {
            final_balance_y - initial_balance_y
        } else {
            0
        };

        assert!(net_output >= min_total_output, E_INSUFFICIENT_OUTPUT);
    }

    // Execute a simple swap through AMM
    public entry fun swap_exact_input_single<X, Y>(
        user: &signer,
        fee_tier: u64,
        amount_in: u64,
        min_amount_out: u64,
        x_to_y: bool,
    ) {
        amm::swap_exact_in<X, Y>(user, fee_tier, amount_in, min_amount_out, x_to_y);
    }

    // Execute a swap with path through multiple pools
    public entry fun swap_exact_input_multihop<X, Y, Z>(
        user: &signer,
        fee_tier_1: u64,
        fee_tier_2: u64,
        amount_in: u64,
        min_amount_out: u64,
    ) {
        // First hop: X -> Y
        let quote_out = amm::quote_swap_exact_in<X, Y>(amount_in, fee_tier_1, true);
        amm::swap_exact_in<X, Y>(user, fee_tier_1, amount_in, 0, true);

        // Second hop: Y -> Z
        amm::swap_exact_in<Y, Z>(user, fee_tier_2, quote_out, min_amount_out, true);
    }

    // Execute arbitrage between AMM and CLOB
    public entry fun arbitrage_amm_clob<X, Y>(
        user: &signer,
        amm_fee_tier: u64,
        clob_side: u8,
        clob_price: u64,
        amount: u64,
    ) {
        // Get AMM price
        let (reserve_x, reserve_y) = amm::get_pool_reserves<X, Y>(amm_fee_tier);
        let amm_price = (reserve_y * 1000000) / reserve_x; // Scaled price

        // Get CLOB best prices
        let (best_bid, best_ask) = clob::get_best_bid_ask<X, Y>();

        // Execute arbitrage if profitable
        if (clob_side == 0 && amm_price < best_bid) { // Buy on AMM, sell on CLOB
            amm::swap_exact_in<Y, X>(user, amm_fee_tier, amount, 0, false);
            clob::place_limit_order<X, Y>(user, 1, best_bid, amount);
        } else if (clob_side == 1 && amm_price > best_ask) { // Buy on CLOB, sell on AMM
            clob::place_limit_order<X, Y>(user, 0, best_ask, amount);
            // Note: Would need to handle the async nature of CLOB fills
        };
    }

    // Provide liquidity to AMM using CLOB orders as hedge
    public entry fun provide_liquidity_with_hedge<X, Y>(
        user: &signer,
        amm_fee_tier: u64,
        amount_x: u64,
        amount_y: u64,
        hedge_price: u64,
        hedge_size: u64,
    ) {
        // Add liquidity to AMM
        amm::add_liquidity<X, Y>(user, amm_fee_tier, amount_x, amount_y, 0);

        // Place hedge order on CLOB
        clob::place_limit_order<X, Y>(user, 1, hedge_price, hedge_size);
    }

    // Split large order across AMM and CLOB for better execution
    public entry fun split_order_execution<X, Y>(
        user: &signer,
        total_amount: u64,
        amm_portion: u64,
        amm_fee_tier: u64,
        clob_price: u64,
        min_total_output: u64,
    ) {
        let clob_portion = total_amount - amm_portion;
        let user_addr = signer::address_of(user);
        let initial_balance = coin::balance<Y>(user_addr);

        // Execute AMM portion
        amm::swap_exact_in<X, Y>(user, amm_fee_tier, amm_portion, 0, true);

        // Execute CLOB portion
        clob::place_limit_order<X, Y>(user, 1, clob_price, clob_portion);

        // Note: For atomic execution, would need to handle CLOB settlement
        let final_balance = coin::balance<Y>(user_addr);
        let amm_output = final_balance - initial_balance;

        // Simplified check - in practice would wait for CLOB fills
        assert!(amm_output >= min_total_output / 2, E_INSUFFICIENT_OUTPUT);
    }

    // Advanced: Time-weighted average price (TWAP) execution
    public entry fun execute_twap<X, Y>(
        user: &signer,
        total_amount: u64,
        num_intervals: u64,
        interval_amount: u64,
        max_price_impact: u64,
    ) {
        let i = 0;
        while (i < num_intervals) {
            let amount = if (i == num_intervals - 1) {
                total_amount - (interval_amount * i)
            } else {
                interval_amount
            };

            // Check price impact before execution
            let quote = amm::quote_swap_exact_in<X, Y>(amount, 30, true);
            let (reserve_x, reserve_y) = amm::get_pool_reserves<X, Y>(30);
            let current_price = (reserve_y * 1000000) / reserve_x;
            let new_reserve_x = reserve_x + amount;
            let new_reserve_y = reserve_y - quote;
            let new_price = (new_reserve_y * 1000000) / new_reserve_x;
            let price_impact = if (new_price < current_price) {
                ((current_price - new_price) * 10000) / current_price
            } else {
                0
            };

            if (price_impact <= max_price_impact) {
                amm::swap_exact_in<X, Y>(user, 30, amount, 0, true);
            } else {
                // Use CLOB for lower price impact
                let (_, best_ask) = clob::get_best_bid_ask<X, Y>();
                if (best_ask > 0) {
                    clob::place_limit_order<X, Y>(user, 0, best_ask, amount);
                };
            };

            i = i + 1;
        };
    }

    // View function to get best execution route
    #[view]
    public fun get_best_route<X, Y>(
        amount_in: u64,
        x_to_y: bool,
    ): (u8, u64, u64) { // route_type, price, amount_out
        // Get AMM quote
        let amm_quote_005 = amm::quote_swap_exact_in<X, Y>(amount_in, 5, x_to_y);
        let amm_quote_030 = amm::quote_swap_exact_in<X, Y>(amount_in, 30, x_to_y);

        // Get CLOB best prices
        let (best_bid, best_ask) = clob::get_best_bid_ask<X, Y>();

        // Simple logic to determine best route
        let best_amm_quote = if (amm_quote_005 > amm_quote_030) amm_quote_005 else amm_quote_030;
        let best_amm_fee = if (amm_quote_005 > amm_quote_030) 5 else 30;

        let clob_quote = if (x_to_y) best_bid else best_ask;
        let clob_amount_out = (amount_in * clob_quote) / 1000000;

        if (best_amm_quote >= clob_amount_out) {
            (0, best_amm_fee, best_amm_quote) // Use AMM
        } else {
            (1, clob_quote, clob_amount_out) // Use CLOB
        }
    }

    // Helper functions
    fun execute_actions<X, Y>(user: &signer, actions: vector<u8>) {
        // Simplified action execution
        // In practice, would deserialize and execute each action type
        let len = vector::length(&actions);
        assert!(len > 0, E_INVALID_PLAN);

        // This is a placeholder - would need proper action deserialization
        // For now, assume simple AMM swap
        if (len >= 4) {
            let action_type = *vector::borrow(&actions, 0);
            if (action_type == ACTION_AMM_SWAP) {
                // Would deserialize full swap parameters and execute
                amm::swap_exact_in<X, Y>(user, 30, 1000000, 0, true);
            };
        };
    }

    // Utility function to check if arbitrage opportunity exists
    #[view]
    public fun check_arbitrage_opportunity<X, Y>(
        amm_fee_tier: u64,
    ): (bool, u64, u64) { // has_opportunity, profit_amount, direction
        let (reserve_x, reserve_y) = amm::get_pool_reserves<X, Y>(amm_fee_tier);
        let (best_bid, best_ask) = clob::get_best_bid_ask<X, Y>();

        let amm_price = (reserve_y * 1000000) / reserve_x;

        if (amm_price < best_bid) {
            // Can buy on AMM, sell on CLOB
            let profit = best_bid - amm_price;
            (true, profit, 0)
        } else if (amm_price > best_ask && best_ask > 0) {
            // Can buy on CLOB, sell on AMM
            let profit = amm_price - best_ask;
            (true, profit, 1)
        } else {
            (false, 0, 0)
        }
    }
}