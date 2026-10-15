import { Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
  BoostedFeesDonation,
  OracleSnapshot,
  Swap,
  TwammVirtualOrdersExecution,
} from "../generated/schema";
import {
  BOOSTED_FEES_CONCENTRATED,
  BOOSTED_FEES_STABLESWAP,
  CORE,
  LEGACY_TWAMM,
  ORACLE,
  TWAMM,
} from "./addresses";
import { bytesAt, floatSqrtRatioToFixed, intAt, i32At, uintAt } from "./bytes";
import { EventMeta, metaOfReceiptLog, setEventFields } from "./event";

// Swaps, oracle snapshots, TWAMM virtual order executions and BoostedFees
// donations are logged without topics to save gas. graph-node can only trigger
// handlers on logs with a topic, so every handler in this subgraph declares
// `receipt: true` and calls this function, which reads the topic-less logs from
// the receipt of the transaction. A transaction is reached when it emits any
// event this subgraph handles, or transfers an ERC-20 token to or from the Core.
// Several handlers can run for one transaction; entities that already exist are
// skipped, so each log is stored once.
export function captureTopiclessLogs(event: ethereum.Event): void {
  const receipt = event.receipt;
  if (receipt === null) {
    log.critical("Missing receipt for transaction {}", [
      event.transaction.hash.toHexString(),
    ]);
    return;
  }

  const logs = receipt.logs;
  for (let i = 0; i < logs.length; i++) {
    const receiptLog = logs[i];
    if (receiptLog.topics.length == 0) {
      captureTopiclessLog(event, receiptLog);
    }
  }
}

function captureTopiclessLog(
  event: ethereum.Event,
  receiptLog: ethereum.Log,
): void {
  const emitter = receiptLog.address.toHexString();
  if (emitter == CORE) {
    captureSwap(metaOfReceiptLog(event, receiptLog), receiptLog.data);
  } else if (emitter == ORACLE) {
    captureOracleSnapshot(metaOfReceiptLog(event, receiptLog), receiptLog.data);
  } else if (emitter == TWAMM || emitter == LEGACY_TWAMM) {
    captureVirtualOrdersExecution(
      metaOfReceiptLog(event, receiptLog),
      receiptLog.data,
    );
  } else if (
    emitter == BOOSTED_FEES_CONCENTRATED ||
    emitter == BOOSTED_FEES_STABLESWAP
  ) {
    captureDonation(metaOfReceiptLog(event, receiptLog), receiptLog.data);
  }
}

function requireLength(meta: EventMeta, data: Bytes, length: i32): void {
  if (data.length != length) {
    log.critical("Unexpected log data length {} (expected {}) in {}", [
      data.length.toString(),
      length.toString(),
      meta.transactionHash.toHexString(),
    ]);
  }
}

// locker (20) | poolId (32) | balance update (32) | pool state after (32)
function captureSwap(meta: EventMeta, data: Bytes): void {
  if (Swap.loadInBlock(meta.id) != null) return;
  requireLength(meta, data, 116);

  const swap = new Swap(meta.id);
  setEventFields(swap, meta);
  swap.locker = bytesAt(data, 0, 20);
  swap.poolId = bytesAt(data, 20, 52);
  swap.delta0 = intAt(data, 52, 68);
  swap.delta1 = intAt(data, 68, 84);
  swap.sqrtRatioAfter = floatSqrtRatioToFixed(uintAt(data, 84, 96));
  swap.tickAfter = i32At(data, 96);
  swap.liquidityAfter = uintAt(data, 100, 116);
  swap.save();
}

// token (20) | tick cumulative (8) | seconds per liquidity cumulative (20) | timestamp (4)
function captureOracleSnapshot(meta: EventMeta, data: Bytes): void {
  if (OracleSnapshot.loadInBlock(meta.id) != null) return;
  requireLength(meta, data, 52);

  const snapshot = new OracleSnapshot(meta.id);
  setEventFields(snapshot, meta);
  snapshot.token = bytesAt(data, 0, 20);
  snapshot.tickCumulative = intAt(data, 20, 28);
  snapshot.secondsPerLiquidityCumulative = uintAt(data, 28, 48);
  snapshot.timestamp = uintAt(data, 48, 52);
  snapshot.save();
}

// poolId (32) | sale rate of token0 (14) | sale rate of token1 (14)
function captureVirtualOrdersExecution(meta: EventMeta, data: Bytes): void {
  if (TwammVirtualOrdersExecution.loadInBlock(meta.id) != null) return;
  requireLength(meta, data, 60);

  const execution = new TwammVirtualOrdersExecution(meta.id);
  setEventFields(execution, meta);
  execution.poolId = bytesAt(data, 0, 32);
  execution.saleRateToken0 = uintAt(data, 32, 46);
  execution.saleRateToken1 = uintAt(data, 46, 60);
  execution.save();
}

// poolId (32) | donate rate of token0 (14) | donate rate of token1 (14)
function captureDonation(meta: EventMeta, data: Bytes): void {
  if (BoostedFeesDonation.loadInBlock(meta.id) != null) return;
  requireLength(meta, data, 60);

  const donation = new BoostedFeesDonation(meta.id);
  setEventFields(donation, meta);
  donation.poolId = bytesAt(data, 0, 32);
  donation.donateRate0 = uintAt(data, 32, 46);
  donation.donateRate1 = uintAt(data, 46, 60);
  donation.save();
}
