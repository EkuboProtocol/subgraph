import { BigInt, Bytes } from "@graphprotocol/graph-ts";

// Every reader copies the bytes it decodes. Bytes.subarray() returns a view, and
// reversing a view in place would corrupt the event data that is also stored.

export function bytesAt(data: Bytes, start: i32, end: i32): Bytes {
  return Bytes.fromUint8Array(data.slice(start, end));
}

export function uintAt(data: Bytes, start: i32, end: i32): BigInt {
  return BigInt.fromUnsignedBytes(
    Bytes.fromUint8Array(data.slice(start, end).reverse()),
  );
}

export function intAt(data: Bytes, start: i32, end: i32): BigInt {
  return BigInt.fromSignedBytes(
    Bytes.fromUint8Array(data.slice(start, end).reverse()),
  );
}

export function u32At(data: Bytes, start: i32): u32 {
  return (
    ((data[start] as u32) << 24) |
    ((data[start + 1] as u32) << 16) |
    ((data[start + 2] as u32) << 8) |
    (data[start + 3] as u32)
  );
}

export function i32At(data: Bytes, start: i32): i32 {
  return u32At(data, start) as i32;
}

// The Core packs a square root price into 96 bits: 2 exponent bits and a
// 94 bit mantissa. The fixed point 64.128 value is the mantissa shifted left by
// 2 + 32 * exponent.
export function floatSqrtRatioToFixed(compact: BigInt): BigInt {
  const exponent = compact.rightShift(94).toI32();
  const mantissaMask = BigInt.fromI32(1).leftShift(94).minus(BigInt.fromI32(1));
  return compact.bitAnd(mantissaMask).leftShift((2 + exponent * 32) as u8);
}

// abi.encode(address, address, bytes32)
export function encodePoolKey(
  token0: Bytes,
  token1: Bytes,
  config: Bytes,
): Bytes {
  const encoded = new Bytes(96);
  for (let i = 0; i < 20; i++) {
    encoded[12 + i] = token0[i];
    encoded[44 + i] = token1[i];
  }
  for (let i = 0; i < 32; i++) {
    encoded[64 + i] = config[i];
  }
  return encoded;
}
