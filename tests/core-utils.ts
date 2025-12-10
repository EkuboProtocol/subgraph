import { newMockEvent } from "matchstick-as"
import { ethereum, Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import {
  ExtensionRegistered,
  FeesAccumulated,
  PoolInitialized,
  PositionFeesCollected,
  PositionUpdated
} from "../generated/Core/Core"

export function createExtensionRegisteredEvent(
  extension: Address
): ExtensionRegistered {
  let extensionRegisteredEvent = changetype<ExtensionRegistered>(newMockEvent())

  extensionRegisteredEvent.parameters = new Array()

  extensionRegisteredEvent.parameters.push(
    new ethereum.EventParam("extension", ethereum.Value.fromAddress(extension))
  )

  return extensionRegisteredEvent
}

export function createFeesAccumulatedEvent(
  poolId: Bytes,
  amount0: BigInt,
  amount1: BigInt
): FeesAccumulated {
  let feesAccumulatedEvent = changetype<FeesAccumulated>(newMockEvent())

  feesAccumulatedEvent.parameters = new Array()

  feesAccumulatedEvent.parameters.push(
    new ethereum.EventParam("poolId", ethereum.Value.fromFixedBytes(poolId))
  )
  feesAccumulatedEvent.parameters.push(
    new ethereum.EventParam(
      "amount0",
      ethereum.Value.fromUnsignedBigInt(amount0)
    )
  )
  feesAccumulatedEvent.parameters.push(
    new ethereum.EventParam(
      "amount1",
      ethereum.Value.fromUnsignedBigInt(amount1)
    )
  )

  return feesAccumulatedEvent
}

export function createPoolInitializedEvent(
  poolId: Bytes,
  poolKey: ethereum.Tuple,
  tick: i32,
  sqrtRatio: BigInt
): PoolInitialized {
  let poolInitializedEvent = changetype<PoolInitialized>(newMockEvent())

  poolInitializedEvent.parameters = new Array()

  poolInitializedEvent.parameters.push(
    new ethereum.EventParam("poolId", ethereum.Value.fromFixedBytes(poolId))
  )
  poolInitializedEvent.parameters.push(
    new ethereum.EventParam("poolKey", ethereum.Value.fromTuple(poolKey))
  )
  poolInitializedEvent.parameters.push(
    new ethereum.EventParam("tick", ethereum.Value.fromI32(tick))
  )
  poolInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "sqrtRatio",
      ethereum.Value.fromUnsignedBigInt(sqrtRatio)
    )
  )

  return poolInitializedEvent
}

export function createPositionFeesCollectedEvent(
  locker: Address,
  poolId: Bytes,
  positionId: Bytes,
  amount0: BigInt,
  amount1: BigInt
): PositionFeesCollected {
  let positionFeesCollectedEvent =
    changetype<PositionFeesCollected>(newMockEvent())

  positionFeesCollectedEvent.parameters = new Array()

  positionFeesCollectedEvent.parameters.push(
    new ethereum.EventParam("locker", ethereum.Value.fromAddress(locker))
  )
  positionFeesCollectedEvent.parameters.push(
    new ethereum.EventParam("poolId", ethereum.Value.fromFixedBytes(poolId))
  )
  positionFeesCollectedEvent.parameters.push(
    new ethereum.EventParam(
      "positionId",
      ethereum.Value.fromFixedBytes(positionId)
    )
  )
  positionFeesCollectedEvent.parameters.push(
    new ethereum.EventParam(
      "amount0",
      ethereum.Value.fromUnsignedBigInt(amount0)
    )
  )
  positionFeesCollectedEvent.parameters.push(
    new ethereum.EventParam(
      "amount1",
      ethereum.Value.fromUnsignedBigInt(amount1)
    )
  )

  return positionFeesCollectedEvent
}

export function createPositionUpdatedEvent(
  locker: Address,
  poolId: Bytes,
  positionId: Bytes,
  liquidityDelta: BigInt,
  balanceUpdate: Bytes,
  stateAfter: Bytes
): PositionUpdated {
  let positionUpdatedEvent = changetype<PositionUpdated>(newMockEvent())

  positionUpdatedEvent.parameters = new Array()

  positionUpdatedEvent.parameters.push(
    new ethereum.EventParam("locker", ethereum.Value.fromAddress(locker))
  )
  positionUpdatedEvent.parameters.push(
    new ethereum.EventParam("poolId", ethereum.Value.fromFixedBytes(poolId))
  )
  positionUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "positionId",
      ethereum.Value.fromFixedBytes(positionId)
    )
  )
  positionUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "liquidityDelta",
      ethereum.Value.fromSignedBigInt(liquidityDelta)
    )
  )
  positionUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "balanceUpdate",
      ethereum.Value.fromFixedBytes(balanceUpdate)
    )
  )
  positionUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "stateAfter",
      ethereum.Value.fromFixedBytes(stateAfter)
    )
  )

  return positionUpdatedEvent
}
