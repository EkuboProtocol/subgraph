# Ekubo v3 Substreams

A [Substreams](https://docs.substreams.dev) package that decodes every log
emitted by the Ekubo v3 contracts on Ethereum and Arbitrum One, in chain order.

Unlike the subgraph in the parent directory, it reads every block's receipts
directly, so it includes every swap, oracle snapshot, TWAMM virtual order
execution and BoostedFees donation. Those are logged without topics, and a
subgraph can only reach them through another event in the same transaction.

## Output

`map_events` outputs `ekubo.v3.Events` (see `proto/ekubo/v3/events.proto`): one
`Event` per log, with the block, transaction and log index, the emitting
contract, and one decoded payload:

| Contract            | Payloads                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Core                | `PoolInitialized`, `Swapped`, `PositionUpdated`, `PositionFeesCollected`, `FeesAccumulated`, `ExtensionRegistered`     |
| Oracle              | `OracleSnapshot`                                                                                                       |
| TWAMM (both)        | `OrderUpdated`, `OrderProceedsWithdrawn`, `VirtualOrdersExecuted`                                                      |
| BoostedFees (both)  | `PoolBoosted`, `FeesDonated`                                                                                           |
| Positions, Orders   | `NonfungibleTokenTransfer`                                                                                             |
| Auctions            | `NonfungibleTokenTransfer`, `AuctionCompleted`, `AuctionFundsAdded`, `AuctionBoostStarted`, `CreatorProceedsCollected` |
| Incentives          | `IncentivesFunded`, `IncentivesRefunded`                                                                               |
| TokenWrapperFactory | `TokenWrapperDeployed`                                                                                                 |

Integers that can exceed 64 bits are decimal strings. Square root prices are
64.128 fixed point numbers, decoded from the compact form the contracts emit.
`PositionUpdated` also carries the pool's price, tick and active liquidity
after the update. Blocks without a log from these contracts are skipped with
the `ethereum_common` event index.

## Build and run

Requires Rust with the `wasm32-unknown-unknown` target, `protoc`, and the
[`substreams` CLI](https://docs.substreams.dev/how-to-guides/installing-the-cli).

```sh
cargo build --target wasm32-unknown-unknown --release
substreams pack
# Needs a Substreams API key from https://thegraph.market
substreams run ekubo-v3-v0.1.0.spkg map_events -s 26198900 -t +200
substreams run ekubo-v3-v0.1.0.spkg map_events --network arbitrum-one -s 416469410 -t +1000
```

## Tests

```sh
cargo test
```

`tests/mainnet.rs` replays every log the contracts emitted on Ethereum in blocks
26198900 to 26199108 and checks the count of each event against an independent
count of the same range on Dune, including the one transaction in that range
that the subgraph cannot reach. Decoder tests compare against values from the
parsers of the Ekubo indexer.
