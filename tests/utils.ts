import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as";

export const BLOCK_NUMBER = BigInt.fromI32(26199135);
export const TX_INDEX = BigInt.fromI32(42);
export const TX_HASH = Bytes.fromHexString(
  "0x9e02ae328ab0fad4ca226ada4deafa90f1a4dca29b7f4f50a95fae98ab064677",
);

export function bytes(hex: string): Bytes {
  return Bytes.fromHexString(hex);
}

// A mock event whose ABI-encoded data is decoded with `signature` into
// parameters named `names`, so tests can replay logs exactly as emitted onchain.
export function eventFromData(
  emitter: string,
  signature: string,
  names: Array<string>,
  data: string,
  logIndex: i32,
): ethereum.Event {
  const decoded = ethereum.decode(signature, bytes(data))!.toTuple();
  const event = newMockEvent();
  event.parameters = new Array();
  for (let i = 0; i < names.length; i++) {
    event.parameters.push(new ethereum.EventParam(names[i], decoded[i]));
  }
  event.address = Address.fromString(emitter);
  event.block.number = BLOCK_NUMBER;
  event.transaction.hash = TX_HASH;
  event.transaction.index = TX_INDEX;
  event.logIndex = BigInt.fromI32(logIndex);
  event.receipt!.logs = new Array();
  return event;
}

export function receiptLog(
  emitter: string,
  topics: Array<Bytes>,
  data: string,
  logIndex: i32,
): ethereum.Log {
  return new ethereum.Log(
    Address.fromString(emitter),
    topics,
    bytes(data),
    Bytes.empty(),
    Bytes.empty(),
    TX_HASH,
    TX_INDEX,
    BigInt.fromI32(logIndex),
    BigInt.zero(),
    "",
    null,
  );
}

export function eventId(logIndex: i32): string {
  const id = new Bytes(16);
  const view = new DataView(id.buffer);
  view.setUint64(0, BLOCK_NUMBER.toU64(), false);
  view.setUint32(8, TX_INDEX.toU32(), false);
  view.setUint32(12, logIndex as u32, false);
  return id.toHexString();
}
