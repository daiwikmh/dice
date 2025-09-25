module 0x1bb7e129d639ef1ca7e0d66a8d9af8f4af3ac2c40e0e3132a19a18ad85469a56::custom_coin {
    use std::string;
    use std::signer;
    use aptos_framework::coin::{Self, Coin, MintCapability, BurnCapability, FreezeCapability};
    use aptos_framework::account;

    const E_NOT_ADMIN: u64 = 1;
    const E_INSUFFICIENT_PERMISSIONS: u64 = 2;
    const E_COIN_ALREADY_INITIALIZED: u64 = 3;

    struct CustomCoin has store, key {}

    struct CoinCapabilities<phantom CoinType> has key {
        mint_cap: MintCapability<CoinType>,
        burn_cap: BurnCapability<CoinType>,
        freeze_cap: FreezeCapability<CoinType>,
    }

    struct CoinInfo has key, store {
        name: string::String,
        symbol: string::String,
        decimals: u8,
        supply: u64,
        admin: address,
    }

    public entry fun initialize_coin<CoinType>(
        admin: &signer,
        name: vector<u8>,
        symbol: vector<u8>,
        decimals: u8,
        monitor_supply: bool,
    ) {
        let admin_addr = signer::address_of(admin);

        assert!(!exists<CoinCapabilities<CoinType>>(admin_addr), E_COIN_ALREADY_INITIALIZED);

        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<CoinType>(
            admin,
            string::utf8(name),
            string::utf8(symbol),
            decimals,
            monitor_supply,
        );

        move_to(admin, CoinCapabilities<CoinType> {
            mint_cap,
            burn_cap,
            freeze_cap,
        });

        move_to(admin, CoinInfo {
            name: string::utf8(name),
            symbol: string::utf8(symbol),
            decimals,
            supply: 0,
            admin: admin_addr,
        });
    }

    public entry fun mint<CoinType>(
        admin: &signer,
        to: address,
        amount: u64,
    ) acquires CoinCapabilities, CoinInfo {
        let admin_addr = signer::address_of(admin);
        let coin_info = borrow_global_mut<CoinInfo>(admin_addr);
        assert!(admin_addr == coin_info.admin, E_NOT_ADMIN);

        let capabilities = borrow_global<CoinCapabilities<CoinType>>(admin_addr);
        let coins = coin::mint<CoinType>(amount, &capabilities.mint_cap);
        coin::deposit<CoinType>(to, coins);

        coin_info.supply = coin_info.supply + amount;
    }

    public entry fun burn<CoinType>(
        admin: &signer,
        amount: u64,
    ) acquires CoinCapabilities, CoinInfo {
        let admin_addr = signer::address_of(admin);
        let coin_info = borrow_global_mut<CoinInfo>(admin_addr);
        assert!(admin_addr == coin_info.admin, E_NOT_ADMIN);

        let capabilities = borrow_global<CoinCapabilities<CoinType>>(admin_addr);
        let coins = coin::withdraw<CoinType>(admin, amount);
        coin::burn<CoinType>(coins, &capabilities.burn_cap);

        coin_info.supply = coin_info.supply - amount;
    }

    public entry fun freeze_account<CoinType>(
        admin: &signer,
        account: address,
    ) acquires CoinCapabilities, CoinInfo {
        let admin_addr = signer::address_of(admin);
        let coin_info = borrow_global<CoinInfo>(admin_addr);
        assert!(admin_addr == coin_info.admin, E_NOT_ADMIN);

        let capabilities = borrow_global<CoinCapabilities<CoinType>>(admin_addr);
        coin::freeze_coin_store<CoinType>(account, &capabilities.freeze_cap);
    }

    public entry fun unfreeze_account<CoinType>(
        admin: &signer,
        account: address,
    ) acquires CoinCapabilities, CoinInfo {
        let admin_addr = signer::address_of(admin);
        let coin_info = borrow_global<CoinInfo>(admin_addr);
        assert!(admin_addr == coin_info.admin, E_NOT_ADMIN);

        let capabilities = borrow_global<CoinCapabilities<CoinType>>(admin_addr);
        coin::unfreeze_coin_store<CoinType>(account, &capabilities.freeze_cap);
    }

    public entry fun register_coin<CoinType>(account: &signer) {
        coin::register<CoinType>(account);
    }

    public entry fun transfer<CoinType>(
        from: &signer,
        to: address,
        amount: u64,
    ) {
        coin::transfer<CoinType>(from, to, amount);
    }

    #[view]
    public fun get_coin_info(admin: address): (string::String, string::String, u8, u64) acquires CoinInfo {
        let coin_info = borrow_global<CoinInfo>(admin);
        (coin_info.name, coin_info.symbol, coin_info.decimals, coin_info.supply)
    }

    #[view]
    public fun get_balance<CoinType>(account: address): u64 {
        coin::balance<CoinType>(account)
    }

    #[view]
    public fun is_account_registered<CoinType>(account: address): bool {
        coin::is_account_registered<CoinType>(account)
    }

    #[view]
    public fun is_coin_initialized<CoinType>(admin: address): bool {
        exists<CoinCapabilities<CoinType>>(admin)
    }

    public entry fun mint_with_admin<CoinType>(
    admin: &signer,
    to: address,
    amount: u64
) acquires CoinCapabilities, CoinInfo {
    let admin_addr = signer::address_of(admin);
    let coin_info = borrow_global_mut<CoinInfo>(admin_addr);
    assert!(admin_addr == coin_info.admin, E_NOT_ADMIN);

    let capabilities = borrow_global<CoinCapabilities<CoinType>>(admin_addr);
    let coins = coin::mint<CoinType>(amount, &capabilities.mint_cap);
    coin::deposit<CoinType>(to, coins);

    coin_info.supply = coin_info.supply + amount;
}


   

    public fun mint_to<CoinType>(
        mint_cap: &MintCapability<CoinType>,
        amount: u64
    ): Coin<CoinType> {
        coin::mint<CoinType>(amount, mint_cap)
    }

    public fun burn_from<CoinType>(
        coin: Coin<CoinType>,
        burn_cap: &BurnCapability<CoinType>
    ) {
        coin::burn<CoinType>(coin, burn_cap)
    }
}