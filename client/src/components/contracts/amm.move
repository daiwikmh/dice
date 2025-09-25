module 0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56::amm {
    use std::signer;
    use std::type_info::{Self, TypeInfo};
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::object::{Self, Object, ObjectCore};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_std::table::{Self, Table};
    use aptos_std::math64;

    // Error codes
    const E_NOT_ADMIN: u64 = 1;
    const E_POOL_ALREADY_EXISTS: u64 = 2;
    const E_POOL_NOT_EXISTS: u64 = 3;
    const E_INSUFFICIENT_LIQUIDITY: u64 = 4;
    const E_INSUFFICIENT_AMOUNT: u64 = 5;
    const E_INVALID_FEE_TIER: u64 = 6;
    const E_SLIPPAGE_EXCEEDED: u64 = 7;
    const E_ZERO_AMOUNT: u64 = 8;

    // Fee tiers (in basis points)
    const FEE_TIER_005: u64 = 5;   // 0.05%
    const FEE_TIER_030: u64 = 30;  // 0.30%

    const MINIMUM_LIQUIDITY: u64 = 1000;
    const BASIS_POINTS: u64 = 10000;

    struct PoolKey has copy, drop, store {
        coin_x: TypeInfo,
        coin_y: TypeInfo,
        fee_tier: u64,
    }

    struct Pool<phantom X, phantom Y> has key {
        reserve_x: Coin<X>,
        reserve_y: Coin<Y>,
        fee_tier: u64,
        lp_token_supply: u64,
        sqrt_price: u128, // Q64.64 fixed point
        liquidity: u128,
    }

    struct LiquidityPosition has key, store {
        pool_address: address,
        liquidity: u64,
    }

    struct PoolRegistry has key {
        pools: Table<PoolKey, address>,
        admin: address,
    }

    // Events
    struct SwapEvent has drop, store {
        pool_address: address,
        user: address,
        amount_in: u64,
        amount_out: u64,
        is_x_to_y: bool,
    }

    struct AddLiquidityEvent has drop, store {
        pool_address: address,
        user: address,
        amount_x: u64,
        amount_y: u64,
        liquidity: u64,
    }

    struct RemoveLiquidityEvent has drop, store {
        pool_address: address,
        user: address,
        amount_x: u64,
        amount_y: u64,
        liquidity: u64,
    }

    struct GlobalEvents has key {
        swap_events: EventHandle<SwapEvent>,
        add_liquidity_events: EventHandle<AddLiquidityEvent>,
        remove_liquidity_events: EventHandle<RemoveLiquidityEvent>,
    }

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);

        move_to(admin, PoolRegistry {
            pools: table::new(),
            admin: admin_addr,
        });

        move_to(admin, GlobalEvents {
            swap_events: account::new_event_handle<SwapEvent>(admin),
            add_liquidity_events: account::new_event_handle<AddLiquidityEvent>(admin),
            remove_liquidity_events: account::new_event_handle<RemoveLiquidityEvent>(admin),
        });
    }

    public entry fun create_pool<X, Y>(
        admin: &signer,
        fee_tier: u64,
    ) acquires PoolRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<PoolRegistry>(admin_addr);
        assert!(admin_addr == registry.admin, E_NOT_ADMIN);
        assert!(fee_tier == FEE_TIER_005 || fee_tier == FEE_TIER_030, E_INVALID_FEE_TIER);

        let pool_key = PoolKey {
            coin_x: type_info::type_of<X>(),
            coin_y: type_info::type_of<Y>(),
            fee_tier,
        };

        assert!(!table::contains(&registry.pools, pool_key), E_POOL_ALREADY_EXISTS);

        let pool_signer = create_pool_account(admin);
        let pool_address = signer::address_of(&pool_signer);

        move_to(&pool_signer, Pool<X, Y> {
            reserve_x: coin::zero<X>(),
            reserve_y: coin::zero<Y>(),
            fee_tier,
            lp_token_supply: 0,
            sqrt_price: 0,
            liquidity: 0,
        });

        table::add(&mut registry.pools, pool_key, pool_address);
    }

    public entry fun add_liquidity<X, Y>(
        user: &signer,
        fee_tier: u64,
        amount_x: u64,
        amount_y: u64,
        min_liquidity: u64,
    ) acquires PoolRegistry, Pool, GlobalEvents,LiquidityPosition  {
        assert!(amount_x > 0 && amount_y > 0, E_ZERO_AMOUNT);

        let pool_address = get_pool_address<X, Y>(fee_tier);
        let pool = borrow_global_mut<Pool<X, Y>>(pool_address);
        let user_addr = signer::address_of(user);

        let coin_x = coin::withdraw<X>(user, amount_x);
        let coin_y = coin::withdraw<Y>(user, amount_y);

        let liquidity = if (pool.lp_token_supply == 0) {
            let initial_liquidity = math64::sqrt(amount_x * amount_y);
            assert!(initial_liquidity >= MINIMUM_LIQUIDITY, E_INSUFFICIENT_LIQUIDITY);
            initial_liquidity - MINIMUM_LIQUIDITY
        } else {
            let reserve_x = coin::value(&pool.reserve_x);
            let reserve_y = coin::value(&pool.reserve_y);

            let liquidity_x = (amount_x * pool.lp_token_supply) / reserve_x;
            let liquidity_y = (amount_y * pool.lp_token_supply) / reserve_y;

            if (liquidity_x < liquidity_y) liquidity_x else liquidity_y
        };

        assert!(liquidity >= min_liquidity, E_SLIPPAGE_EXCEEDED);

        coin::merge(&mut pool.reserve_x, coin_x);
        coin::merge(&mut pool.reserve_y, coin_y);
        pool.lp_token_supply = pool.lp_token_supply + liquidity;

        // Store liquidity position
        if (!exists<LiquidityPosition>(user_addr)) {
            move_to(user, LiquidityPosition {
                pool_address,
                liquidity,
            });
        } else {
            let position = borrow_global_mut<LiquidityPosition>(user_addr);
            position.liquidity = position.liquidity + liquidity;
        };

        // Emit event
        let events = borrow_global_mut<GlobalEvents>(@0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56);
        event::emit_event(&mut events.add_liquidity_events, AddLiquidityEvent {
            pool_address,
            user: user_addr,
            amount_x,
            amount_y,
            liquidity,
        });
    }

    public entry fun remove_liquidity<X, Y>(
        user: &signer,
        fee_tier: u64,
        liquidity: u64,
        min_amount_x: u64,
        min_amount_y: u64,
    ) acquires PoolRegistry, Pool, LiquidityPosition, GlobalEvents {
        let user_addr = signer::address_of(user);
        let pool_address = get_pool_address<X, Y>(fee_tier);
        let pool = borrow_global_mut<Pool<X, Y>>(pool_address);

        let position = borrow_global_mut<LiquidityPosition>(user_addr);
        assert!(position.liquidity >= liquidity, E_INSUFFICIENT_LIQUIDITY);

        let total_supply = pool.lp_token_supply;
        let reserve_x = coin::value(&pool.reserve_x);
        let reserve_y = coin::value(&pool.reserve_y);

        let amount_x = (liquidity * reserve_x) / total_supply;
        let amount_y = (liquidity * reserve_y) / total_supply;

        assert!(amount_x >= min_amount_x && amount_y >= min_amount_y, E_SLIPPAGE_EXCEEDED);

        let coin_x = coin::extract(&mut pool.reserve_x, amount_x);
        let coin_y = coin::extract(&mut pool.reserve_y, amount_y);

        coin::deposit(user_addr, coin_x);
        coin::deposit(user_addr, coin_y);

        pool.lp_token_supply = pool.lp_token_supply - liquidity;
        position.liquidity = position.liquidity - liquidity;

        // Emit event
        let events = borrow_global_mut<GlobalEvents>(@0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56);
        event::emit_event(&mut events.remove_liquidity_events, RemoveLiquidityEvent {
            pool_address,
            user: user_addr,
            amount_x,
            amount_y,
            liquidity,
        });
    }

    public entry fun swap_exact_in<X, Y>(
        user: &signer,
        fee_tier: u64,
        amount_in: u64,
        min_amount_out: u64,
        x_to_y: bool,
    ) acquires PoolRegistry, Pool, GlobalEvents {
        assert!(amount_in > 0, E_ZERO_AMOUNT);

        let pool_address = get_pool_address<X, Y>(fee_tier);
        let pool = borrow_global_mut<Pool<X, Y>>(pool_address);
        let user_addr = signer::address_of(user);

        let (amount_out, fee_amount) = if (x_to_y) {
            let coin_in = coin::withdraw<X>(user, amount_in);
            let reserve_x = coin::value(&pool.reserve_x);
            let reserve_y = coin::value(&pool.reserve_y);

            let amount_out = get_amount_out(amount_in, reserve_x, reserve_y, pool.fee_tier);
            assert!(amount_out >= min_amount_out, E_SLIPPAGE_EXCEEDED);

            let coin_out = coin::extract(&mut pool.reserve_y, amount_out);
            coin::merge(&mut pool.reserve_x, coin_in);
            coin::deposit(user_addr, coin_out);

            (amount_out, (amount_in * pool.fee_tier) / BASIS_POINTS)
        } else {
            let coin_in = coin::withdraw<Y>(user, amount_in);
            let reserve_x = coin::value(&pool.reserve_x);
            let reserve_y = coin::value(&pool.reserve_y);

            let amount_out = get_amount_out(amount_in, reserve_y, reserve_x, pool.fee_tier);
            assert!(amount_out >= min_amount_out, E_SLIPPAGE_EXCEEDED);

            let coin_out = coin::extract(&mut pool.reserve_x, amount_out);
            coin::merge(&mut pool.reserve_y, coin_in);
            coin::deposit(user_addr, coin_out);

            (amount_out, (amount_in * pool.fee_tier) / BASIS_POINTS)
        };

        // Emit event
        let events = borrow_global_mut<GlobalEvents>(@0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56);
        event::emit_event(&mut events.swap_events, SwapEvent {
            pool_address,
            user: user_addr,
            amount_in,
            amount_out,
            is_x_to_y: x_to_y,
        });
    }

    public entry fun swap_exact_out<X, Y>(
        user: &signer,
        fee_tier: u64,
        amount_out: u64,
        max_amount_in: u64,
        x_to_y: bool,
    ) acquires PoolRegistry, Pool, GlobalEvents {
        assert!(amount_out > 0, E_ZERO_AMOUNT);

        let pool_address = get_pool_address<X, Y>(fee_tier);
        let pool = borrow_global_mut<Pool<X, Y>>(pool_address);
        let user_addr = signer::address_of(user);

        let amount_in = if (x_to_y) {
            let reserve_x = coin::value(&pool.reserve_x);
            let reserve_y = coin::value(&pool.reserve_y);

            let amount_in = get_amount_in(amount_out, reserve_x, reserve_y, pool.fee_tier);
            assert!(amount_in <= max_amount_in, E_SLIPPAGE_EXCEEDED);

            let coin_in = coin::withdraw<X>(user, amount_in);
            let coin_out = coin::extract(&mut pool.reserve_y, amount_out);
            coin::merge(&mut pool.reserve_x, coin_in);
            coin::deposit(user_addr, coin_out);

            amount_in
        } else {
            let reserve_x = coin::value(&pool.reserve_x);
            let reserve_y = coin::value(&pool.reserve_y);

            let amount_in = get_amount_in(amount_out, reserve_y, reserve_x, pool.fee_tier);
            assert!(amount_in <= max_amount_in, E_SLIPPAGE_EXCEEDED);

            let coin_in = coin::withdraw<Y>(user, amount_in);
            let coin_out = coin::extract(&mut pool.reserve_x, amount_out);
            coin::merge(&mut pool.reserve_y, coin_in);
            coin::deposit(user_addr, coin_out);

            amount_in
        };

        // Emit event
        let events = borrow_global_mut<GlobalEvents>(@0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56);
        event::emit_event(&mut events.swap_events, SwapEvent {
            pool_address,
            user: user_addr,
            amount_in,
            amount_out,
            is_x_to_y: x_to_y,
        });
    }

    // View functions
    #[view]
    public fun get_pool_reserves<X, Y>(fee_tier: u64): (u64, u64) acquires PoolRegistry, Pool {
        let pool_address = get_pool_address<X, Y>(fee_tier);
        let pool = borrow_global<Pool<X, Y>>(pool_address);
        (coin::value(&pool.reserve_x), coin::value(&pool.reserve_y))
    }

    #[view]
    public fun quote_swap_exact_in<X, Y>(
        amount_in: u64,
        fee_tier: u64,
        x_to_y: bool,
    ): u64 acquires PoolRegistry, Pool {
        let pool_address = get_pool_address<X, Y>(fee_tier);
        let pool = borrow_global<Pool<X, Y>>(pool_address);

        if (x_to_y) {
            let reserve_x = coin::value(&pool.reserve_x);
            let reserve_y = coin::value(&pool.reserve_y);
            get_amount_out(amount_in, reserve_x, reserve_y, fee_tier)
        } else {
            let reserve_x = coin::value(&pool.reserve_x);
            let reserve_y = coin::value(&pool.reserve_y);
            get_amount_out(amount_in, reserve_y, reserve_x, fee_tier)
        }
    }

    // Helper functions
    fun get_pool_address<X, Y>(fee_tier: u64): address acquires PoolRegistry {
        let registry = borrow_global<PoolRegistry>(@0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56);
        let pool_key = PoolKey {
            coin_x: type_info::type_of<X>(),
            coin_y: type_info::type_of<Y>(),
            fee_tier,
        };
        assert!(table::contains(&registry.pools, pool_key), E_POOL_NOT_EXISTS);
        *table::borrow(&registry.pools, pool_key)
    }

    fun get_amount_out(amount_in: u64, reserve_in: u64, reserve_out: u64, fee_tier: u64): u64 {
        let amount_in_with_fee = amount_in * (BASIS_POINTS - fee_tier);
        let numerator = amount_in_with_fee * reserve_out;
        let denominator = (reserve_in * BASIS_POINTS) + amount_in_with_fee;
        numerator / denominator
    }

    fun get_amount_in(amount_out: u64, reserve_in: u64, reserve_out: u64, fee_tier: u64): u64 {
        let numerator = reserve_in * amount_out * BASIS_POINTS;
        let denominator = (reserve_out - amount_out) * (BASIS_POINTS - fee_tier);
        (numerator / denominator) + 1
    }

    fun create_pool_account(admin: &signer): signer {
        let constructor_ref = object::create_object(signer::address_of(admin));
        object::generate_signer(&constructor_ref)
    }
}