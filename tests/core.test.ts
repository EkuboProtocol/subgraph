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
  Bytes,
  store as graphStore,
} from "@graphprotocol/graph-ts";
import { handlePoolInitialized, poolInitializationId } from "../src/core";
import { buildPoolConfig, createPoolInitializedEvent } from "./helpers";

describe("handlePoolInitialized", () => {
  afterEach(() => {
    clearStore();
  });

  test("stores concentrated pool fields", () => {
    const poolId = Bytes.fromHexString(
      "0x000000000000000000000000000000000000000000000000000000000000c0de",
    ) as Bytes;
    const token0 = Address.fromString(
      "0x2000000000000000000000000000000000000000",
    );
    const token1 = Address.fromString(
      "0x3000000000000000000000000000000000000000",
    );
    const core = Address.fromString(
      "0x4000000000000000000000000000000000000000",
    );
    const extension = Address.fromString(
      "0x1000000000000000000000000000000000000001",
    );

    const tickSpacing: u32 = 60;
    const typeConfig: u32 = 0x80000000 | tickSpacing;
    const fee: u64 = 3000;
    const config = buildPoolConfig(extension, fee, typeConfig);
    const tick = 15;
    const sqrtRatio = BigInt.fromI32(123456);
    const blockNumber = BigInt.fromI32(99);
    const timestamp = BigInt.fromI32(1234);

    const event = createPoolInitializedEvent(
      poolId,
      token0,
      token1,
      config,
      tick,
      sqrtRatio,
      core,
      blockNumber,
      timestamp,
    );

    handlePoolInitialized(event);

    const entityId = poolInitializationId(event).toHexString();

    assert.entityCount("PoolInitialization", 1);
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "coreAddress",
      core.toHexString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "poolId",
      poolId.toHexString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "token0",
      token0.toHexString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "token1",
      token1.toHexString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "config",
      config.toHexString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "extension",
      extension.toHexString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "fee",
      BigInt.fromU64(fee).toString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "tickSpacing",
      tickSpacing.toString(),
    );
    assert.fieldEquals("PoolInitialization", entityId, "tick", tick.toString());
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "sqrtRatio",
      sqrtRatio.toString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "blockNumber",
      blockNumber.toString(),
    );
    assert.fieldEquals("PoolInitialization", entityId, "transactionIndex", "0");
    assert.fieldEquals("PoolInitialization", entityId, "eventIndex", "0");
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "blockTimestamp",
      timestamp.toString(),
    );

    const stored = graphStore.get("PoolInitialization", entityId);
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

  test("stores stableswap pool fields", () => {
    const poolId = Bytes.fromHexString(
      "0x000000000000000000000000000000000000000000000000000000000000f00d",
    ) as Bytes;
    const token0 = Address.fromString(
      "0x5000000000000000000000000000000000000000",
    );
    const token1 = Address.fromString(
      "0x6000000000000000000000000000000000000000",
    );
    const core = Address.fromString(
      "0x7000000000000000000000000000000000000000",
    );
    const extension = Address.fromString(
      "0x9000000000000000000000000000000000000009",
    );

    const amplification: u32 = 12;
    const centerTick: u32 = 3456;
    const typeConfig: u32 = (amplification << 24) | centerTick;
    const fee: u64 = 1500;
    const config = buildPoolConfig(extension, fee, typeConfig);
    const tick = -42;
    const sqrtRatio = BigInt.fromI32(654321);
    const blockNumber = BigInt.fromI32(123);
    const timestamp = BigInt.fromI32(5678);

    const event = createPoolInitializedEvent(
      poolId,
      token0,
      token1,
      config,
      tick,
      sqrtRatio,
      core,
      blockNumber,
      timestamp,
    );

    handlePoolInitialized(event);

    const entityId = poolInitializationId(event).toHexString();

    assert.entityCount("PoolInitialization", 1);
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "coreAddress",
      core.toHexString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "poolId",
      poolId.toHexString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "token0",
      token0.toHexString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "token1",
      token1.toHexString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "config",
      config.toHexString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "extension",
      extension.toHexString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "fee",
      BigInt.fromU64(fee).toString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "stableswapAmplification",
      amplification.toString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "stableswapCenterTick",
      centerTick.toString(),
    );
    assert.fieldEquals("PoolInitialization", entityId, "tick", tick.toString());
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "sqrtRatio",
      sqrtRatio.toString(),
    );
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "blockNumber",
      blockNumber.toString(),
    );
    assert.fieldEquals("PoolInitialization", entityId, "transactionIndex", "0");
    assert.fieldEquals("PoolInitialization", entityId, "eventIndex", "0");
    assert.fieldEquals(
      "PoolInitialization",
      entityId,
      "blockTimestamp",
      timestamp.toString(),
    );

    const stored = graphStore.get("PoolInitialization", entityId);
    assert.assertNotNull(stored);
    assert.assertNull(
      stored!.get("tickSpacing"),
      "tickSpacing should not be set for stableswap pools",
    );
  });
});
