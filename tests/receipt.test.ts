import {
  afterEach,
  assert,
  clearStore,
  describe,
  test,
} from "matchstick-as/assembly/index";
import { Bytes, ethereum } from "@graphprotocol/graph-ts";
import { Transfer as TransferEvent } from "../generated/CoreTokenInflows/ERC20";
import { FeesAccumulated as FeesAccumulatedEvent } from "../generated/Core/Core";
import { handleCoreTokenTransfer } from "../src/core-token-transfers";
import { handleFeesAccumulated } from "../src/core";
import { bytes, eventFromData, eventId, receiptLog } from "./utils";

const CORE = "0x00000000000014aa86c5d3c41765bb24e11bd701";
const ORACLE = "0x517e506700271aea091b02f42756f5e174af5230";
const TWAMM = "0xd47f1b1edcfeabb08f6ebd8fc337c27e636c75ba";
const LEGACY_TWAMM = "0xd4f1060cb9c1a13e1d2d20379b8aa2cf7541ed9b";
const BOOSTED_FEES_STABLESWAP = "0x948b9c2c99718034954110cb61a6e08e107745f9";
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

// Logs emitted on Ethereum mainnet. Expected values were computed with the
// parsers of the Ekubo indexer (src/evm/swapEvent.ts, oracleEvent.ts and
// twammEvent.ts) from the same data.
const SWAP_DATA =
  "0x666fedd4cdd4e890a5ad20e7b60975409435a64a3318f31231b9e65a8e0bd41c42cc1b6982cc0bca516024f9c1a5af8bceb15101fffffffffffffffffffffffff930591f000000000000000631c858df4875b6d78003d0816188991bd3aa979801a59d45000000000000000a753627721d8ec859";
const ORACLE_DATA =
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48fffe4aa2f17f274c00000000000000a0c365ae9152028a95698af3fb6ad0ff3f";
const VIRTUAL_ORDERS_DATA =
  "0xedeaae143f233a3a5d4fabd3166afa0e2108fe7741489237274b939ca17fcff800000000003faeeb51ea7361a0230000000000000000000000000000";
const DONATION_DATA =
  "0xc7f619f69b7906da5454112580c7bea39ad875921a0a4710083cbd47561c4ddb" +
  "0000000000000000000000000001" +
  "0000000000000000000000000002";

const TRANSFER_TOPIC = bytes(
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
);

function transferToCore(logIndex: i32): TransferEvent {
  const data =
    "0x000000000000000000000000666fedd4cdd4e890a5ad20e7b60975409435a64a00000000000000000000000000000000000014aa86c5d3c41765bb24e11bd70100000000000000000000000000000000000000000000000000000000000f4240";
  return changetype<TransferEvent>(
    eventFromData(
      USDC,
      "(address,address,uint256)",
      ["from", "to", "value"],
      data,
      logIndex,
    ),
  );
}

function feesAccumulated(logIndex: i32): FeesAccumulatedEvent {
  return changetype<FeesAccumulatedEvent>(
    eventFromData(
      CORE,
      "(bytes32,uint128,uint128)",
      ["poolId", "amount0", "amount1"],
      "0x41b349297d536f7bf7beb64a6ee21472c0accf119554ce17062a0bec5759d6ef0000000000000000000000000000000000000000000000000000066f1fffb03d0000000000000000000000000000000000000000000000000000000000000000",
      logIndex,
    ),
  );
}

function withLogs(
  event: ethereum.Event,
  logs: Array<ethereum.Log>,
): ethereum.Event {
  event.receipt!.logs = logs;
  return event;
}

const NO_TOPICS = new Array<Bytes>();

describe("captureTopiclessLogs", () => {
  afterEach(() => {
    clearStore();
  });

  test("decodes a swap like the indexer", () => {
    const event = transferToCore(508);
    withLogs(event, [receiptLog(CORE, NO_TOPICS, SWAP_DATA, 507)]);
    handleCoreTokenTransfer(event);

    const id = eventId(507);
    assert.entityCount("Swap", 1);
    assert.fieldEquals("Swap", id, "emitter", CORE);
    assert.fieldEquals("Swap", id, "eventIndex", "507");
    assert.fieldEquals(
      "Swap",
      id,
      "locker",
      "0x666fedd4cdd4e890a5ad20e7b60975409435a64a",
    );
    assert.fieldEquals(
      "Swap",
      id,
      "poolId",
      "0x3318f31231b9e65a8e0bd41c42cc1b6982cc0bca516024f9c1a5af8bceb15101",
    );
    assert.fieldEquals("Swap", id, "delta0", "-114271969");
    assert.fieldEquals("Swap", id, "delta1", "114267679261474535127");
    assert.fieldEquals("Swap", id, "liquidityAfter", "192913422259351111769");
    assert.fieldEquals(
      "Swap",
      id,
      "sqrtRatioAfter",
      "340262468556416716095139455930203441398284288",
    );
    assert.fieldEquals("Swap", id, "tickAfter", "27630917");
  });

  test("decodes an oracle snapshot like the indexer", () => {
    const event = transferToCore(1);
    withLogs(event, [receiptLog(ORACLE, NO_TOPICS, ORACLE_DATA, 360)]);
    handleCoreTokenTransfer(event);

    const id = eventId(360);
    assert.entityCount("OracleSnapshot", 1);
    assert.fieldEquals("OracleSnapshot", id, "token", USDC);
    assert.fieldEquals("OracleSnapshot", id, "timestamp", "1792081727");
    assert.fieldEquals(
      "OracleSnapshot",
      id,
      "secondsPerLiquidityCumulative",
      "12736978505077692728956550837243",
    );
    assert.fieldEquals(
      "OracleSnapshot",
      id,
      "tickCumulative",
      "-480886256621748",
    );
  });

  test("decodes TWAMM virtual order executions from both TWAMMs", () => {
    const event = transferToCore(1);
    withLogs(event, [
      receiptLog(TWAMM, NO_TOPICS, VIRTUAL_ORDERS_DATA, 154),
      receiptLog(LEGACY_TWAMM, NO_TOPICS, VIRTUAL_ORDERS_DATA, 155),
    ]);
    handleCoreTokenTransfer(event);

    assert.entityCount("TwammVirtualOrdersExecution", 2);
    const id = eventId(154);
    assert.fieldEquals(
      "TwammVirtualOrdersExecution",
      id,
      "poolId",
      "0xedeaae143f233a3a5d4fabd3166afa0e2108fe7741489237274b939ca17fcff8",
    );
    assert.fieldEquals(
      "TwammVirtualOrdersExecution",
      id,
      "saleRateToken0",
      "1174749134693228191779",
    );
    assert.fieldEquals(
      "TwammVirtualOrdersExecution",
      id,
      "saleRateToken1",
      "0",
    );
    assert.fieldEquals(
      "TwammVirtualOrdersExecution",
      eventId(155),
      "emitter",
      LEGACY_TWAMM,
    );
  });

  test("decodes BoostedFees donations", () => {
    const event = transferToCore(1);
    withLogs(event, [
      receiptLog(BOOSTED_FEES_STABLESWAP, NO_TOPICS, DONATION_DATA, 372),
    ]);
    handleCoreTokenTransfer(event);

    const id = eventId(372);
    assert.fieldEquals(
      "BoostedFeesDonation",
      id,
      "poolId",
      "0xc7f619f69b7906da5454112580c7bea39ad875921a0a4710083cbd47561c4ddb",
    );
    assert.fieldEquals("BoostedFeesDonation", id, "donateRate0", "1");
    assert.fieldEquals("BoostedFeesDonation", id, "donateRate1", "2");
  });

  test("ignores logs with topics and logs from other contracts", () => {
    const event = transferToCore(1);
    withLogs(event, [
      receiptLog(CORE, [TRANSFER_TOPIC], SWAP_DATA, 2),
      receiptLog(USDC, NO_TOPICS, SWAP_DATA, 3),
    ]);
    handleCoreTokenTransfer(event);

    assert.entityCount("Swap", 0);
  });

  test("stores each log once when several anchors share a transaction", () => {
    const logs = [
      receiptLog(CORE, NO_TOPICS, SWAP_DATA, 10),
      receiptLog(ORACLE, NO_TOPICS, ORACLE_DATA, 11),
    ];
    const fees = feesAccumulated(9);
    withLogs(fees, logs);
    handleFeesAccumulated(fees);
    handleCoreTokenTransfer(
      changetype<TransferEvent>(withLogs(transferToCore(12), logs)),
    );
    handleCoreTokenTransfer(
      changetype<TransferEvent>(withLogs(transferToCore(13), logs)),
    );

    assert.entityCount("FeesAccumulation", 1);
    assert.entityCount("Swap", 1);
    assert.entityCount("OracleSnapshot", 1);
    assert.fieldEquals(
      "FeesAccumulation",
      eventId(9),
      "amount0",
      "7074347987005",
    );
  });
});
