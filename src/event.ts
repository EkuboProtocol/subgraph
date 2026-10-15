import {
  BigInt,
  Bytes,
  Entity,
  Value,
  ethereum,
  log,
} from "@graphprotocol/graph-ts";

export function eventId(
  blockNumber: BigInt,
  transactionIndex: BigInt,
  eventIndex: BigInt,
): Bytes {
  const id = new Bytes(16);
  const view = new DataView(id.buffer);

  view.setUint64(0, blockNumber.toU64(), false);
  view.setUint32(8, transactionIndex.toU32(), false);
  view.setUint32(12, eventIndex.toU32(), false);

  return id;
}

export class EventMeta {
  id: Bytes;
  blockNumber: BigInt;
  transactionIndex: BigInt;
  eventIndex: BigInt;
  blockHash: Bytes;
  blockTimestamp: BigInt;
  transactionHash: Bytes;
  emitter: Bytes;

  constructor(event: ethereum.Event, eventIndex: BigInt, emitter: Bytes) {
    this.blockNumber = event.block.number;
    this.transactionIndex = event.transaction.index;
    this.eventIndex = eventIndex;
    this.blockHash = event.block.hash;
    this.blockTimestamp = event.block.timestamp;
    this.transactionHash = event.transaction.hash;
    this.emitter = emitter;
    this.id = eventId(this.blockNumber, this.transactionIndex, eventIndex);
  }
}

export function metaOfEvent(event: ethereum.Event): EventMeta {
  return new EventMeta(event, event.logIndex, event.address);
}

// A log read from the receipt of the transaction that emitted `event`.
export function metaOfReceiptLog(
  event: ethereum.Event,
  receiptLog: ethereum.Log,
): EventMeta {
  if (changetype<usize>(receiptLog.logIndex) == 0) {
    log.critical("Receipt log without a log index in transaction {}", [
      event.transaction.hash.toHexString(),
    ]);
  }
  return new EventMeta(event, receiptLog.logIndex, receiptLog.address);
}

export function setEventFields(entity: Entity, meta: EventMeta): void {
  entity.set("blockNumber", Value.fromBigInt(meta.blockNumber));
  entity.set("transactionIndex", Value.fromBigInt(meta.transactionIndex));
  entity.set("eventIndex", Value.fromBigInt(meta.eventIndex));
  entity.set("blockHash", Value.fromBytes(meta.blockHash));
  entity.set("blockTimestamp", Value.fromBigInt(meta.blockTimestamp));
  entity.set("transactionHash", Value.fromBytes(meta.transactionHash));
  entity.set("emitter", Value.fromBytes(meta.emitter));
}
