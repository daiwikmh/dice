module 0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56::clob {
    use std::signer;
    use std::type_info::{Self, TypeInfo};
    use std::vector;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::account;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};

    // Error codes
    const E_NOT_ADMIN: u64 = 1;
    const E_MARKET_NOT_EXISTS: u64 = 2;
    const E_MARKET_ALREADY_EXISTS: u64 = 3;
    const E_ORDER_NOT_EXISTS: u64 = 4;
    const E_INSUFFICIENT_BALANCE: u64 = 5;
    const E_INVALID_SIDE: u64 = 6;
    const E_INVALID_PRICE: u64 = 7;
    const E_INVALID_SIZE: u64 = 8;
    const E_ORDER_CANNOT_BE_CANCELLED: u64 = 9;

    // Order sides
    const SIDE_BUY: u8 = 0;
    const SIDE_SELL: u8 = 1;

    // Price scaling
    const PRICE_MULTIPLIER: u64 = 1000000; // 6 decimal places

    struct MarketId has copy, drop, store {
        base_coin: TypeInfo,
        quote_coin: TypeInfo,
    }

    struct Order has store, drop, copy {
        order_id: u64,
        user: address,
        side: u8,
        price: u64,
        size: u64,
        filled_size: u64,
        timestamp: u64,
    }

    struct Market<phantom BaseCoin, phantom QuoteCoin> has key {
        market_id: MarketId,
        bids: vector<Order>, // Simple vector for orders
        asks: vector<Order>, // Simple vector for orders
        best_bid: u64,
        best_ask: u64,
        next_order_id: u64,
        base_vault: Coin<BaseCoin>,
        quote_vault: Coin<QuoteCoin>,
        tick_size: u64,
        lot_size: u64,
    }

    struct UserOrders has key {
        orders: vector<Order>,
    }

    struct MarketRegistry has key {
        markets: Table<MarketId, address>,
        admin: address,
    }

    // Events
    struct OrderPlacedEvent has drop, store {
        market_address: address,
        order_id: u64,
        user: address,
        side: u8,
        price: u64,
        size: u64,
        timestamp: u64,
    }

    struct OrderCancelledEvent has drop, store {
        market_address: address,
        order_id: u64,
        user: address,
    }

    struct OrderFilledEvent has drop, store {
        market_address: address,
        taker_order_id: u64,
        maker_order_id: u64,
        taker: address,
        maker: address,
        price: u64,
        size: u64,
        timestamp: u64,
    }

    struct GlobalEvents has key {
        order_placed_events: EventHandle<OrderPlacedEvent>,
        order_cancelled_events: EventHandle<OrderCancelledEvent>,
        order_filled_events: EventHandle<OrderFilledEvent>,
    }

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);

        move_to(admin, MarketRegistry {
            markets: table::new(),
            admin: admin_addr,
        });

        move_to(admin, GlobalEvents {
            order_placed_events: account::new_event_handle<OrderPlacedEvent>(admin),
            order_cancelled_events: account::new_event_handle<OrderCancelledEvent>(admin),
            order_filled_events: account::new_event_handle<OrderFilledEvent>(admin),
        });
    }

    public entry fun create_market<BaseCoin, QuoteCoin>(
        admin: &signer,
        tick_size: u64,
        lot_size: u64,
    ) acquires MarketRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<MarketRegistry>(admin_addr);
        assert!(admin_addr == registry.admin, E_NOT_ADMIN);

        let market_id = MarketId {
            base_coin: type_info::type_of<BaseCoin>(),
            quote_coin: type_info::type_of<QuoteCoin>(),
        };

        assert!(!table::contains(&registry.markets, market_id), E_MARKET_ALREADY_EXISTS);

        let market_signer = create_market_account(admin);
        let market_address = signer::address_of(&market_signer);

        move_to(&market_signer, Market<BaseCoin, QuoteCoin> {
            market_id,
            bids: vector::empty<Order>(),
            asks: vector::empty<Order>(),
            best_bid: 0,
            best_ask: 0,
            next_order_id: 1,
            base_vault: coin::zero<BaseCoin>(),
            quote_vault: coin::zero<QuoteCoin>(),
            tick_size,
            lot_size,
        });

        table::add(&mut registry.markets, market_id, market_address);
    }

    public entry fun place_limit_order<BaseCoin, QuoteCoin>(
        user: &signer,
        side: u8,
        price: u64,
        size: u64,
    ) acquires MarketRegistry, Market, UserOrders, GlobalEvents {
        assert!(side == SIDE_BUY || side == SIDE_SELL, E_INVALID_SIDE);
        assert!(price > 0, E_INVALID_PRICE);
        assert!(size > 0, E_INVALID_SIZE);

        let user_addr = signer::address_of(user);
        let market_address = get_market_address<BaseCoin, QuoteCoin>();
        let market = borrow_global_mut<Market<BaseCoin, QuoteCoin>>(market_address);

        // Validate price and size increments
        assert!(price % market.tick_size == 0, E_INVALID_PRICE);
        assert!(size % market.lot_size == 0, E_INVALID_SIZE);

        let order_id = market.next_order_id;
        market.next_order_id = market.next_order_id + 1;

        let order = Order {
            order_id,
            user: user_addr,
            side,
            price,
            size,
            filled_size: 0,
            timestamp: timestamp::now_microseconds(),
        };

        // Lock user funds
        if (side == SIDE_BUY) {
            let quote_needed = (price * size) / PRICE_MULTIPLIER;
            let quote_coin = coin::withdraw<QuoteCoin>(user, quote_needed);
            coin::merge(&mut market.quote_vault, quote_coin);
        } else {
            let base_coin = coin::withdraw<BaseCoin>(user, size);
            coin::merge(&mut market.base_vault, base_coin);
        };

        // Simple order matching - try to match with best opposite side
        let filled_size = try_fill_order(market, &order);
        let remaining_order = Order {
            order_id: order.order_id,
            user: order.user,
            side: order.side,
            price: order.price,
            size: order.size,
            filled_size,
            timestamp: order.timestamp,
        };

        // Add remaining order to book if not fully filled
        if (remaining_order.size > remaining_order.filled_size) {
            add_order_to_book(market, remaining_order);

            // Store order in user's orders
            if (!exists<UserOrders>(user_addr)) {
                move_to(user, UserOrders {
                    orders: vector::empty<Order>(),
                });
            };
            let user_orders = borrow_global_mut<UserOrders>(user_addr);
            vector::push_back(&mut user_orders.orders, remaining_order);
        };

        // Emit event
        let events = borrow_global_mut<GlobalEvents>(@0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56);
        event::emit_event(&mut events.order_placed_events, OrderPlacedEvent {
            market_address,
            order_id,
            user: user_addr,
            side,
            price,
            size,
            timestamp: order.timestamp,
        });
    }

    public entry fun cancel_order<BaseCoin, QuoteCoin>(
        user: &signer,
        order_id: u64,
    ) acquires MarketRegistry, Market, UserOrders, GlobalEvents {
        let user_addr = signer::address_of(user);
        let market_address = get_market_address<BaseCoin, QuoteCoin>();
        let market = borrow_global_mut<Market<BaseCoin, QuoteCoin>>(market_address);

        assert!(exists<UserOrders>(user_addr), E_ORDER_NOT_EXISTS);
        let user_orders = borrow_global_mut<UserOrders>(user_addr);

        let (order, order_index) = find_and_remove_user_order(&mut user_orders.orders, order_id);
        assert!(order.user == user_addr, E_ORDER_CANNOT_BE_CANCELLED);

        // Remove order from book
        remove_order_from_book(market, &order);

        // Refund locked funds
        let unfilled_size = order.size - order.filled_size;
        if (order.side == SIDE_BUY) {
            let quote_to_refund = (order.price * unfilled_size) / PRICE_MULTIPLIER;
            let refund_coin = coin::extract(&mut market.quote_vault, quote_to_refund);
            coin::deposit(user_addr, refund_coin);
        } else {
            let refund_coin = coin::extract(&mut market.base_vault, unfilled_size);
            coin::deposit(user_addr, refund_coin);
        };

        // Emit event
        let events = borrow_global_mut<GlobalEvents>(@0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56);
        event::emit_event(&mut events.order_cancelled_events, OrderCancelledEvent {
            market_address,
            order_id,
            user: user_addr,
        });
    }

    public entry fun place_market_order<BaseCoin, QuoteCoin>(
        user: &signer,
        side: u8,
        size: u64,
    ) acquires MarketRegistry, Market {
        assert!(side == SIDE_BUY || side == SIDE_SELL, E_INVALID_SIDE);
        assert!(size > 0, E_INVALID_SIZE);

        let user_addr = signer::address_of(user);
        let market_address = get_market_address<BaseCoin, QuoteCoin>();
        let market = borrow_global_mut<Market<BaseCoin, QuoteCoin>>(market_address);

        let order_id = market.next_order_id;
        market.next_order_id = market.next_order_id + 1;

        // For market orders, execute immediately against best available prices
        if (side == SIDE_BUY) {
            // Buy market order - match against asks
            execute_market_buy<BaseCoin, QuoteCoin>(user, market, size, order_id);
        } else {
            // Sell market order - match against bids
            execute_market_sell<BaseCoin, QuoteCoin>(user, market, size, order_id);
        };
    }

    // View functions
    #[view]
    public fun get_best_bid_ask<BaseCoin, QuoteCoin>(): (u64, u64) acquires MarketRegistry, Market {
        let market_address = get_market_address<BaseCoin, QuoteCoin>();
        let market = borrow_global<Market<BaseCoin, QuoteCoin>>(market_address);
        (market.best_bid, market.best_ask)
    }

    #[view]
    public fun get_order_book_depth<BaseCoin, QuoteCoin>(levels: u64): (vector<u64>, vector<u64>, vector<u64>, vector<u64>)
        acquires MarketRegistry, Market {
        let market_address = get_market_address<BaseCoin, QuoteCoin>();
        let market = borrow_global<Market<BaseCoin, QuoteCoin>>(market_address);

        let bid_prices = vector::empty<u64>();
        let bid_sizes = vector::empty<u64>();
        let ask_prices = vector::empty<u64>();
        let ask_sizes = vector::empty<u64>();

        // Simple implementation - get first few orders from each side
        let i = 0;
        let bid_len = vector::length(&market.bids);
        while (i < levels && i < bid_len) {
            let order = vector::borrow(&market.bids, i);
            vector::push_back(&mut bid_prices, order.price);
            vector::push_back(&mut bid_sizes, order.size - order.filled_size);
            i = i + 1;
        };

        let i = 0;
        let ask_len = vector::length(&market.asks);
        while (i < levels && i < ask_len) {
            let order = vector::borrow(&market.asks, i);
            vector::push_back(&mut ask_prices, order.price);
            vector::push_back(&mut ask_sizes, order.size - order.filled_size);
            i = i + 1;
        };

        (bid_prices, bid_sizes, ask_prices, ask_sizes)
    }

    // Helper functions
    fun get_market_address<BaseCoin, QuoteCoin>(): address acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(@0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56);
        let market_id = MarketId {
            base_coin: type_info::type_of<BaseCoin>(),
            quote_coin: type_info::type_of<QuoteCoin>(),
        };
        assert!(table::contains(&registry.markets, market_id), E_MARKET_NOT_EXISTS);
        *table::borrow(&registry.markets, market_id)
    }

    fun try_fill_order<BaseCoin, QuoteCoin>(
        market: &mut Market<BaseCoin, QuoteCoin>,
        order: &Order
    ): u64 {
        // Simple matching - try to fill against best price on opposite side
        let opposite_orders = if (order.side == SIDE_BUY) &mut market.asks else &mut market.bids;

        if (vector::is_empty(opposite_orders)) {
            return 0
        };

        // Find best matching order
        let best_order = vector::borrow_mut(opposite_orders, 0);
        if (can_match_orders(order, best_order)) {
            let fill_size = if (order.size <= best_order.size - best_order.filled_size) {
                order.size
            } else {
                best_order.size - best_order.filled_size
            };

            best_order.filled_size = best_order.filled_size + fill_size;

            // Remove fully filled orders
            if (best_order.filled_size >= best_order.size) {
                vector::remove(opposite_orders, 0);
            };

            fill_size
        } else {
            0
        }
    }

    fun can_match_orders(taker_order: &Order, maker_order: &Order): bool {
        if (taker_order.side == SIDE_BUY) {
            taker_order.price >= maker_order.price
        } else {
            taker_order.price <= maker_order.price
        }
    }

    fun add_order_to_book<BaseCoin, QuoteCoin>(market: &mut Market<BaseCoin, QuoteCoin>, order: Order) {
        let book_side = if (order.side == SIDE_BUY) &mut market.bids else &mut market.asks;

        // Insert order in price-sorted position (simplified)
        vector::push_back(book_side, order);

        // Update best bid/ask
        update_best_prices(market);
    }

    fun remove_order_from_book<BaseCoin, QuoteCoin>(market: &mut Market<BaseCoin, QuoteCoin>, order: &Order) {
        let book_side = if (order.side == SIDE_BUY) &mut market.bids else &mut market.asks;

        let i = 0;
        let len = vector::length(book_side);
        while (i < len) {
            let book_order = vector::borrow(book_side, i);
            if (book_order.order_id == order.order_id) {
                vector::remove(book_side, i);
                break
            };
            i = i + 1;
        };

        update_best_prices(market);
    }

    fun update_best_prices<BaseCoin, QuoteCoin>(market: &mut Market<BaseCoin, QuoteCoin>) {
        // Update best bid
        market.best_bid = 0;
        let i = 0;
        let bid_len = vector::length(&market.bids);
        while (i < bid_len) {
            let order = vector::borrow(&market.bids, i);
            if (order.price > market.best_bid) {
                market.best_bid = order.price;
            };
            i = i + 1;
        };

        // Update best ask
        market.best_ask = 0;
        let i = 0;
        let ask_len = vector::length(&market.asks);
        while (i < ask_len) {
            let order = vector::borrow(&market.asks, i);
            if (market.best_ask == 0 || order.price < market.best_ask) {
                market.best_ask = order.price;
            };
            i = i + 1;
        };
    }

    fun find_and_remove_user_order(orders: &mut vector<Order>, order_id: u64): (Order, u64) {
        let i = 0;
        let len = vector::length(orders);
        while (i < len) {
            let order = vector::borrow(orders, i);
            if (order.order_id == order_id) {
                let found_order = vector::remove(orders, i);
                return (found_order, i)
            };
            i = i + 1;
        };
        abort E_ORDER_NOT_EXISTS
    }

    fun execute_market_buy<BaseCoin, QuoteCoin>(
        user: &signer,
        market: &mut Market<BaseCoin, QuoteCoin>,
        size: u64,
        order_id: u64,
    ) {
        // Simple market buy - take from asks at market price
        let user_addr = signer::address_of(user);
        let remaining_size = size;

        while (remaining_size > 0 && !vector::is_empty(&market.asks)) {
            let ask_order = vector::borrow_mut(&mut market.asks, 0);
            let available_size = ask_order.size - ask_order.filled_size;
            let fill_size = if (remaining_size <= available_size) remaining_size else available_size;

            // Execute fill
            let quote_needed = (ask_order.price * fill_size) / PRICE_MULTIPLIER;
            let quote_coin = coin::withdraw<QuoteCoin>(user, quote_needed);
            let base_coin = coin::extract(&mut market.base_vault, fill_size);

            coin::merge(&mut market.quote_vault, quote_coin);
            coin::deposit(user_addr, base_coin);

            ask_order.filled_size = ask_order.filled_size + fill_size;
            remaining_size = remaining_size - fill_size;

            if (ask_order.filled_size >= ask_order.size) {
                vector::remove(&mut market.asks, 0);
            };
        };
    }

    fun execute_market_sell<BaseCoin, QuoteCoin>(
        user: &signer,
        market: &mut Market<BaseCoin, QuoteCoin>,
        size: u64,
        order_id: u64,
    ) {
        // Simple market sell - take from bids at market price
        let user_addr = signer::address_of(user);
        let remaining_size = size;

        while (remaining_size > 0 && !vector::is_empty(&market.bids)) {
            let bid_order = vector::borrow_mut(&mut market.bids, 0);
            let available_size = bid_order.size - bid_order.filled_size;
            let fill_size = if (remaining_size <= available_size) remaining_size else available_size;

            // Execute fill
            let base_coin = coin::withdraw<BaseCoin>(user, fill_size);
            let quote_value = (bid_order.price * fill_size) / PRICE_MULTIPLIER;
            let quote_coin = coin::extract(&mut market.quote_vault, quote_value);

            coin::merge(&mut market.base_vault, base_coin);
            coin::deposit(user_addr, quote_coin);

            bid_order.filled_size = bid_order.filled_size + fill_size;
            remaining_size = remaining_size - fill_size;

            if (bid_order.filled_size >= bid_order.size) {
                vector::remove(&mut market.bids, 0);
            };
        };
    }

    fun create_market_account(admin: &signer): signer {
        let constructor_ref = aptos_framework::object::create_object(signer::address_of(admin));
        aptos_framework::object::generate_signer(&constructor_ref)
    }
}