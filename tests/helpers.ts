import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  ethereum,
} from "@graphprotocol/graph-ts"
import { newMockEvent } from "matchstick-as"
import { PoolInitialized as PoolInitializedEvent } from "../generated/Core/Core"

const DEFAULT_TX_HASH = Bytes.fromHexString(
  "0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
) as Bytes

export function buildPoolConfig(
  extension: Address,
  fee: u64,
  typeConfig: u32
): Bytes {
  const config = new Uint8Array(32)

  // First 20 bytes contain the extension address
  const extensionBytes = extension as Bytes
  for (let i = 0; i < 20; i++) {
    config[i] = extensionBytes[i]
  }

  // Next 8 bytes hold the fee in big-endian form
  const feeBytes = ByteArray.fromU64(fee).reverse()
  for (let i = 0; i < 8; i++) {
    config[20 + i] = feeBytes[i]
  }

  // Final 4 bytes encode the type config in big-endian form
  const typeConfigBytes = ByteArray.fromU32(typeConfig).reverse()
  for (let i = 0; i < 4; i++) {
    config[28 + i] = typeConfigBytes[i]
  }

  return Bytes.fromUint8Array(config)
}

export function createPoolInitializedEvent(
  poolId: Bytes,
  token0: Address,
  token1: Address,
  config: Bytes,
  tick: i32,
  sqrtRatio: BigInt,
  coreAddress: Address,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  txHash: Bytes = DEFAULT_TX_HASH
): PoolInitializedEvent {
  const event = changetype<PoolInitializedEvent>(newMockEvent())

  const poolKey = new ethereum.Tuple()
  poolKey.push(ethereum.Value.fromAddress(token0))
  poolKey.push(ethereum.Value.fromAddress(token1))
  poolKey.push(ethereum.Value.fromFixedBytes(config))

  event.parameters = new Array()
  event.parameters.push(
    new ethereum.EventParam("poolId", ethereum.Value.fromFixedBytes(poolId))
  )
  event.parameters.push(
    new ethereum.EventParam("poolKey", ethereum.Value.fromTuple(poolKey))
  )
  event.parameters.push(
    new ethereum.EventParam("tick", ethereum.Value.fromI32(tick))
  )
  event.parameters.push(
    new ethereum.EventParam(
      "sqrtRatio",
      ethereum.Value.fromUnsignedBigInt(sqrtRatio)
    )
  )

  event.address = coreAddress
  event.block.number = blockNumber
  event.block.timestamp = blockTimestamp
  event.transaction.hash = txHash
  event.logIndex = BigInt.zero()

  return event
}

export function getEntityId(event: PoolInitializedEvent): Bytes {
  return event.transaction.hash.concatI32(event.logIndex.toI32())
}
