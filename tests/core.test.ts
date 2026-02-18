import {
  afterEach,
  assert,
  clearStore,
  describe,
  test,
} from "matchstick-as/assembly/index";
import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  ethereum,
  store as graphStore,
} from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as";
import { PoolInitialized as PoolInitializedEvent } from "../generated/Core/Core";
import { handlePoolInitialized, poolInitializationId } from "../src/core";

const ENTITY = "PoolInitialization";

const DEFAULT_TX_HASH = Bytes.fromHexString(
  "0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
) as Bytes;
const DEFAULT_TX_INDEX = BigInt.fromI32(7);
const DEFAULT_EVENT_INDEX = BigInt.fromI32(3);

const DEFAULT_POOL_ID = Bytes.fromHexString(
  "0x000000000000000000000000000000000000000000000000000000000000c0de",
) as Bytes;
const DEFAULT_TOKEN0 = Address.fromString(
  "0x2000000000000000000000000000000000000000",
);
const DEFAULT_TOKEN1 = Address.fromString(
  "0x3000000000000000000000000000000000000000",
);
const DEFAULT_CORE = Address.fromString(
  "0x4000000000000000000000000000000000000000",
);
const DEFAULT_EXTENSION = Address.fromString(
  "0x1000000000000000000000000000000000000001",
);

const DEFAULT_FEE: u64 = 3000;
const DEFAULT_TICK_SPACING: u32 = 60;
const DEFAULT_TYPE_CONFIG: u32 = 0x80000000 | DEFAULT_TICK_SPACING;
const DEFAULT_TICK = 15;
const DEFAULT_SQRT_RATIO = BigInt.fromI32(123456);
const DEFAULT_BLOCK_NUMBER = BigInt.fromI32(99);
const DEFAULT_TIMESTAMP = BigInt.fromI32(1234);

class EventOverrides {
  poolId: Bytes = DEFAULT_POOL_ID;
  token0: Address = DEFAULT_TOKEN0;
  token1: Address = DEFAULT_TOKEN1;
  core: Address = DEFAULT_CORE;
  extension: Address = DEFAULT_EXTENSION;
  fee: BigInt = BigInt.fromU64(DEFAULT_FEE);
  typeConfig: BigInt = BigInt.fromU32(DEFAULT_TYPE_CONFIG);
  tick: BigInt = BigInt.fromI32(DEFAULT_TICK);
  sqrtRatio: BigInt = DEFAULT_SQRT_RATIO;
  blockNumber: BigInt = DEFAULT_BLOCK_NUMBER;
  timestamp: BigInt = DEFAULT_TIMESTAMP;
  txHash: Bytes = DEFAULT_TX_HASH;
  txIndex: BigInt = DEFAULT_TX_INDEX;
  logIndex: BigInt = DEFAULT_EVENT_INDEX;
}

function createPoolInitializedEvent(
  overrides: EventOverrides = new EventOverrides(),
): PoolInitializedEvent {
  const poolId = overrides.poolId;
  const token0 = overrides.token0;
  const token1 = overrides.token1;
  const core = overrides.core;
  const extension = overrides.extension;

  const fee = overrides.fee.toU64();
  const typeConfig = overrides.typeConfig.toU32();

  const tick = overrides.tick.toI32();
  const sqrtRatio = overrides.sqrtRatio;
  const blockNumber = overrides.blockNumber;
  const timestamp = overrides.timestamp;
  const txHash = overrides.txHash;
  const txIndex = overrides.txIndex;
  const logIndex = overrides.logIndex;

  const config = new Uint8Array(32);
  const extensionBytes = extension as Bytes;
  for (let i = 0; i < 20; i++) {
    config[i] = extensionBytes[i];
  }

  const feeBytes = ByteArray.fromU64(fee).reverse();
  for (let i = 0; i < 8; i++) {
    config[20 + i] = feeBytes[i];
  }

  const typeConfigBytes = ByteArray.fromU32(typeConfig).reverse();
  for (let i = 0; i < 4; i++) {
    config[28 + i] = typeConfigBytes[i];
  }

  const event = changetype<PoolInitializedEvent>(newMockEvent());
  const poolKey = new ethereum.Tuple();
  poolKey.push(ethereum.Value.fromAddress(token0));
  poolKey.push(ethereum.Value.fromAddress(token1));
  poolKey.push(ethereum.Value.fromFixedBytes(Bytes.fromUint8Array(config)));

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("poolId", ethereum.Value.fromFixedBytes(poolId)),
  );
  event.parameters.push(
    new ethereum.EventParam("poolKey", ethereum.Value.fromTuple(poolKey)),
  );
  event.parameters.push(new ethereum.EventParam("tick", ethereum.Value.fromI32(tick)));
  event.parameters.push(
    new ethereum.EventParam(
      "sqrtRatio",
      ethereum.Value.fromUnsignedBigInt(sqrtRatio),
    ),
  );

  event.address = core;
  event.block.number = blockNumber;
  event.block.timestamp = timestamp;
  event.transaction.hash = txHash;
  event.transaction.index = txIndex;
  event.logIndex = logIndex;

  return event;
}

function assertCommonFields(entityId: string, config: Bytes): void {
  assert.entityCount(ENTITY, 1);
  assert.fieldEquals(ENTITY, entityId, "coreAddress", DEFAULT_CORE.toHexString());
  assert.fieldEquals(ENTITY, entityId, "poolId", DEFAULT_POOL_ID.toHexString());
  assert.fieldEquals(ENTITY, entityId, "token0", DEFAULT_TOKEN0.toHexString());
  assert.fieldEquals(ENTITY, entityId, "token1", DEFAULT_TOKEN1.toHexString());
  assert.fieldEquals(ENTITY, entityId, "config", config.toHexString());
  assert.fieldEquals(ENTITY, entityId, "extension", DEFAULT_EXTENSION.toHexString());
  assert.fieldEquals(ENTITY, entityId, "fee", BigInt.fromU64(DEFAULT_FEE).toString());
  assert.fieldEquals(
    ENTITY,
    entityId,
    "blockNumber",
    DEFAULT_BLOCK_NUMBER.toString(),
  );
  assert.fieldEquals(
    ENTITY,
    entityId,
    "transactionIndex",
    DEFAULT_TX_INDEX.toString(),
  );
  assert.fieldEquals(
    ENTITY,
    entityId,
    "eventIndex",
    DEFAULT_EVENT_INDEX.toString(),
  );
  assert.fieldEquals(
    ENTITY,
    entityId,
    "blockTimestamp",
    DEFAULT_TIMESTAMP.toString(),
  );
  assert.fieldEquals(ENTITY, entityId, "tick", DEFAULT_TICK.toString());
  assert.fieldEquals(
    ENTITY,
    entityId,
    "sqrtRatio",
    DEFAULT_SQRT_RATIO.toString(),
  );
}

describe("handlePoolInitialized", () => {
  afterEach(() => {
    clearStore();
  });

  test("stores concentrated pool fields", () => {
    const event = createPoolInitializedEvent();
    const config = event.params.poolKey.config;
    handlePoolInitialized(event);
    const entityId = poolInitializationId(event).toHexString();

    assertCommonFields(entityId, config);
    assert.fieldEquals(
      ENTITY,
      entityId,
      "tickSpacing",
      DEFAULT_TICK_SPACING.toString(),
    );

    const stored = graphStore.get(ENTITY, entityId);
    assert.assertNotNull(stored);
    assert.assertNull(
      stored!.get("stableswapAmplification"),
      "stableswapAmplification should not be set for concentrated pools",
    );
    assert.assertNull(
      stored!.get("stableswapCenterTick"),
      "stableswapCenterTick should not be set for concentrated pools",
    );
  });

  test("packs id as blockNumber + transactionIndex + eventIndex", () => {
    const overrides = new EventOverrides();
    overrides.blockNumber = BigInt.fromI32(500);
    overrides.txIndex = BigInt.fromI32(7);
    overrides.logIndex = BigInt.fromI32(3);

    const event = createPoolInitializedEvent(overrides);
    handlePoolInitialized(event);

    const entityId = "0x00000000000001f40000000700000003";
    const stored = graphStore.get(ENTITY, entityId);
    assert.assertNotNull(stored);
  });

  test("stores stableswap pool fields", () => {
    const amplification: u32 = 12;
    const centerTickCompressed: u32 = 3456;

    const overrides = new EventOverrides();
    overrides.typeConfig = BigInt.fromU32((amplification << 24) | centerTickCompressed);

    const event = createPoolInitializedEvent(overrides);
    const config = event.params.poolKey.config;
    handlePoolInitialized(event);
    const entityId = poolInitializationId(event).toHexString();

    assertCommonFields(entityId, config);
    assert.fieldEquals(
      ENTITY,
      entityId,
      "stableswapAmplification",
      amplification.toString(),
    );
    assert.fieldEquals(
      ENTITY,
      entityId,
      "stableswapCenterTick",
      (centerTickCompressed * 16).toString(),
    );

    const stored = graphStore.get(ENTITY, entityId);
    assert.assertNotNull(stored);
    assert.assertNull(
      stored!.get("tickSpacing"),
      "tickSpacing should not be set for stableswap pools",
    );
  });
});
