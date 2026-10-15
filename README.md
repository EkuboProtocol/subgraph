# Ekubo v3 subgraph

A subgraph of every event emitted by the Ekubo v3 contracts on Ethereum and
Arbitrum One. Each entity is one onchain log, decoded and stored as emitted, so
the subgraph can be replayed to rebuild pool state, volumes, fees, positions,
TWAMM orders and the other data the Ekubo API serves.

## Coverage

| Contract                 | Entities                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Core                     | `PoolInitialization`, `Swap`, `PositionUpdate`, `PositionFeesCollection`, `FeesAccumulation`, `ExtensionRegistration`            |
| Oracle                   | `OracleSnapshot`                                                                                                                 |
| TWAMM (both deployments) | `TwammOrderUpdate`, `TwammOrderProceedsWithdrawal`, `TwammVirtualOrdersExecution`                                                |
| BoostedFees (both)       | `BoostedFeesPoolBoost`, `BoostedFeesDonation`                                                                                    |
| Positions, Orders (all)  | `NonfungibleTokenTransfer`                                                                                                       |
| Auctions                 | `AuctionCompletion`, `AuctionFundsAddition`, `AuctionBoostStart`, `AuctionCreatorProceedsCollection`, `NonfungibleTokenTransfer` |
| Incentives               | `IncentivesFunding`, `IncentivesRefund`                                                                                          |
| TokenWrapperFactory      | `TokenWrapperDeployment`                                                                                                         |

Every entity implements the `Event` interface. Its id is the block number
(8 bytes), the transaction index (4 bytes) and the log index within the block
(4 bytes), big-endian, so ordering any query by `id` returns events in chain
order. Querying `events(orderBy: id)` returns one ordered stream across all
types.

Square root prices are stored as 64.128 fixed point numbers, decoded from the
compact form the contracts emit. `PositionUpdate` also carries the pool's
price, tick and active liquidity after the update.

## Logs without topics

To save gas, the Core logs swaps, and the Oracle, TWAMM and BoostedFees
extensions log snapshots, virtual order executions and donations, without any
topic. graph-node only triggers handlers on logs with a topic, so these are read
from transaction receipts instead: every handler declares `receipt: true` and
stores the topic-less logs of its transaction (see `src/receipt.ts`). A
transaction is reached when it emits any other event this subgraph handles, or
transfers an ERC-20 token to or from the Core.

A transaction that does neither is missed. Over 14 days of chain data this was
0.32% of the transactions with topic-less Ekubo logs on Ethereum (1.0% of the
logs, mostly bots executing TWAMM orders and swapping through native token
pools) and none on Arbitrum. The next captured swap in a pool carries the pool's
price, tick and liquidity, so pool state recovers, but swap volume and TWAMM
execution history on Ethereum are short by that amount. Use the Ekubo indexer
where every swap is needed.

## Development

| Command                      | What it does                                                   |
| ---------------------------- | -------------------------------------------------------------- |
| `bun run codegen`            | Generates `generated/` from the schema and ABIs.               |
| `bun run test`               | matchstick tests (`graph test`; add `-- -d` to run in Docker). |
| `bun run build:mainnet`      | Builds for Ethereum with the addresses in `networks.json`.     |
| `bun run build:arbitrum-one` | Builds for Arbitrum One.                                       |

Mapping code must not build module-level values with host calls such as
`Address.fromString()`. Those initializers run before the AssemblyScript
allocator is set up, and graph-node then writes the result over the module's
static data, which breaks every handler of the data source.
