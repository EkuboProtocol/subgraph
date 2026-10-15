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
  ethereum,
  store,
} from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as";
import {
  ExtensionRegistered as ExtensionRegisteredEvent,
  PoolInitialized as PoolInitializedEvent,
  PositionFeesCollected as PositionFeesCollectedEvent,
  PositionUpdated as PositionUpdatedEvent,
} from "../generated/Core/Core";
import {
  handleExtensionRegistered,
  handlePoolInitialized,
  handlePositionFeesCollected,
  handlePositionUpdated,
} from "../src/core";
import { eventFromData, eventId } from "./utils";

const CORE = "0x00000000000014aa86c5d3c41765bb24e11bd701";
const TOKEN0 = "0x2000000000000000000000000000000000000000";
const TOKEN1 = "0x3000000000000000000000000000000000000000";
const POOL_ID =
  "0x000000000000000000000000000000000000000000000000000000000000c0de";

// extension | fee | type config, hex encoded
function config(typeConfig: string): string {
  return (
    "0x1000000000000000000000000000000000000001" +
    "0000000000000bb8" +
    typeConfig
  );
}

function poolInitialized(
  configHex: string,
  sqrtRatio: BigInt,
): PoolInitializedEvent {
  const event = changetype<PoolInitializedEvent>(newMockEvent());
  const poolKey = new ethereum.Tuple();
  poolKey.push(ethereum.Value.fromAddress(Address.fromString(TOKEN0)));
  poolKey.push(ethereum.Value.fromAddress(Address.fromString(TOKEN1)));
  poolKey.push(ethereum.Value.fromFixedBytes(Bytes.fromHexString(configHex)));

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      "poolId",
      ethereum.Value.fromFixedBytes(Bytes.fromHexString(POOL_ID)),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam("poolKey", ethereum.Value.fromTuple(poolKey)),
  );
  event.parameters.push(
    new ethereum.EventParam("tick", ethereum.Value.fromI32(-15)),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "sqrtRatio",
      ethereum.Value.fromUnsignedBigInt(sqrtRatio),
    ),
  );
  event.address = Address.fromString(CORE);
  event.block.number = BigInt.fromI32(500);
  event.transaction.index = BigInt.fromI32(7);
  event.logIndex = BigInt.fromI32(3);
  return event;
}

const POOL_INITIALIZATION_ID = "0x00000000000001f40000000700000003";

describe("handlePoolInitialized", () => {
  afterEach(() => {
    clearStore();
  });

  test("stores a concentrated pool and keeps the config as emitted", () => {
    const configHex = config("8000003c");
    handlePoolInitialized(poolInitialized(configHex, BigInt.fromI32(123456)));

    const id = POOL_INITIALIZATION_ID;
    assert.entityCount("PoolInitialization", 1);
    assert.fieldEquals("PoolInitialization", id, "config", configHex);
    assert.fieldEquals("PoolInitialization", id, "coreAddress", CORE);
    assert.fieldEquals("PoolInitialization", id, "emitter", CORE);
    assert.fieldEquals("PoolInitialization", id, "poolId", POOL_ID);
    assert.fieldEquals("PoolInitialization", id, "token0", TOKEN0);
    assert.fieldEquals("PoolInitialization", id, "token1", TOKEN1);
    assert.fieldEquals(
      "PoolInitialization",
      id,
      "extension",
      "0x1000000000000000000000000000000000000001",
    );
    assert.fieldEquals("PoolInitialization", id, "fee", "3000");
    assert.fieldEquals("PoolInitialization", id, "tickSpacing", "60");
    assert.fieldEquals("PoolInitialization", id, "tick", "-15");
    // 123456 << 2, the compact square root price as a 64.128 fixed point number
    assert.fieldEquals("PoolInitialization", id, "sqrtRatio", "493824");
    assert.fieldEquals("PoolInitialization", id, "blockNumber", "500");
    assert.fieldEquals("PoolInitialization", id, "transactionIndex", "7");
    assert.fieldEquals("PoolInitialization", id, "eventIndex", "3");
  });

  test("stores a stableswap pool", () => {
    // amplification 12, compressed center tick -2 (0xfffffe)
    const configHex = config("0cfffffe");
    // exponent bits 0b11 and mantissa 5
    const sqrtRatio = BigInt.fromI32(3).leftShift(94).plus(BigInt.fromI32(5));
    handlePoolInitialized(poolInitialized(configHex, sqrtRatio));

    const id = POOL_INITIALIZATION_ID;
    assert.fieldEquals("PoolInitialization", id, "config", configHex);
    assert.fieldEquals(
      "PoolInitialization",
      id,
      "stableswapAmplification",
      "12",
    );
    assert.fieldEquals("PoolInitialization", id, "stableswapCenterTick", "-32");
    assert.fieldEquals(
      "PoolInitialization",
      id,
      "sqrtRatio",
      "1584563250285286751870879006720",
    );
    const stored = store.get("PoolInitialization", id);
    assert.assertNotNull(stored);
    assert.assertNull(stored!.get("tickSpacing"));
  });
});

// Logs emitted on Ethereum mainnet in transaction
// 0x459aef621d85b4a4b6733f780da1164c0b964ca79ab35f5064ac6b79828280d7. Expected
// values were computed with the parsers of the Ekubo indexer from the same data.
describe("position events", () => {
  afterEach(() => {
    clearStore();
  });

  test("decodes PositionUpdated like the indexer, plus the pool state after", () => {
    const event = changetype<PositionUpdatedEvent>(
      eventFromData(
        CORE,
        "(address,bytes32,bytes32,int128,bytes32,bytes32)",
        [
          "locker",
          "poolId",
          "positionId",
          "liquidityDelta",
          "balanceUpdate",
          "stateAfter",
        ],
        "0x0000000000000000000000008e0a8e0cf1cde9845d426678e6139194fb442e6e6fde3244f6fa747ae318aba6e982a4281febad4d22e3b134aa299a83a951895d8be86847ad7570f6827683d5a92911cbae5d027e6abd5bd7000004b000000514ffffffffffffffffffffffffffffffffffffffffffffffffffffe6c79b29d50cffffffffffffffffffffffffad68eaea0000000000000000000000000000000080000000400765ddade1623000000386000000000000000000003467e4c26840",
        368,
      ),
    );
    handlePositionUpdated(event);

    const id = eventId(368);
    assert.fieldEquals(
      "PositionUpdate",
      id,
      "locker",
      "0x8e0a8e0cf1cde9845d426678e6139194fb442e6e",
    );
    assert.fieldEquals(
      "PositionUpdate",
      id,
      "poolId",
      "0x6fde3244f6fa747ae318aba6e982a4281febad4d22e3b134aa299a83a951895d",
    );
    assert.fieldEquals(
      "PositionUpdate",
      id,
      "salt",
      "3430530284004775188888215212345911956170291379026572172247",
    );
    assert.fieldEquals("PositionUpdate", id, "lowerTick", "1200");
    assert.fieldEquals("PositionUpdate", id, "upperTick", "1300");
    assert.fieldEquals(
      "PositionUpdate",
      id,
      "liquidityDelta",
      "-27730000620276",
    );
    assert.fieldEquals("PositionUpdate", id, "delta0", "-1385633046");
    assert.fieldEquals("PositionUpdate", id, "delta1", "0");
    assert.fieldEquals(
      "PositionUpdate",
      id,
      "liquidityAfter",
      "57620824221760",
    );
    assert.fieldEquals("PositionUpdate", id, "tickAfter", "902");
    assert.fieldEquals(
      "PositionUpdate",
      id,
      "sqrtRatioAfter",
      "340436015579406491264959269579299749888",
    );
  });

  test("decodes PositionFeesCollected", () => {
    const event = changetype<PositionFeesCollectedEvent>(
      eventFromData(
        CORE,
        "(address,bytes32,bytes32,uint128,uint128)",
        ["locker", "poolId", "positionId", "amount0", "amount1"],
        "0x0000000000000000000000008e0a8e0cf1cde9845d426678e6139194fb442e6e6fde3244f6fa747ae318aba6e982a4281febad4d22e3b134aa299a83a951895d8be86847ad7570f6827683d5a92911cbae5d027e6abd5bd7000004b000000514000000000000000000000000000000000000000000000000000000000003c661000000000000000000000000000000000000000000000000000000000003c3d1",
        367,
      ),
    );
    handlePositionFeesCollected(event);

    const id = eventId(367);
    assert.fieldEquals("PositionFeesCollection", id, "lowerTick", "1200");
    assert.fieldEquals("PositionFeesCollection", id, "upperTick", "1300");
    assert.fieldEquals("PositionFeesCollection", id, "amount0", "247393");
    assert.fieldEquals("PositionFeesCollection", id, "amount1", "246737");
  });

  test("decodes ExtensionRegistered", () => {
    const event = changetype<ExtensionRegisteredEvent>(
      eventFromData(
        CORE,
        "(address)",
        ["extension"],
        "0x000000000000000000000000d47f1b1edcfeabb08f6ebd8fc337c27e636c75ba",
        1,
      ),
    );
    handleExtensionRegistered(event);

    assert.fieldEquals(
      "ExtensionRegistration",
      eventId(1),
      "extension",
      "0xd47f1b1edcfeabb08f6ebd8fc337c27e636c75ba",
    );
  });
});
