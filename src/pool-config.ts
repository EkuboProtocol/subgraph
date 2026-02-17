import { BigInt, Bytes } from "@graphprotocol/graph-ts";

export const TYPE_CONFIG_OFFSET = 28;
export const FEE_OFFSET = 20;

export function parseExtension(config: Bytes): Bytes {
  return Bytes.fromUint8Array(config.subarray(0, FEE_OFFSET));
}

export function parseFee(config: Bytes): BigInt {
  return BigInt.fromUnsignedBytes(
    Bytes.fromUint8Array(
      config.subarray(FEE_OFFSET, TYPE_CONFIG_OFFSET).reverse(),
    ),
  );
}

export function parseTypeConfig(config: Bytes): u32 {
  return Bytes.fromUint8Array(
    config.subarray(TYPE_CONFIG_OFFSET).reverse(),
  ).toU32();
}
