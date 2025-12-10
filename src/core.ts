import {
  ExtensionRegistered as ExtensionRegisteredEvent,
  FeesAccumulated as FeesAccumulatedEvent,
  PoolInitialized as PoolInitializedEvent,
  PositionFeesCollected as PositionFeesCollectedEvent,
  PositionUpdated as PositionUpdatedEvent
} from "../generated/Core/Core"
import {
  ExtensionRegistered,
  FeesAccumulated,
  PoolInitialized,
  PositionFeesCollected,
  PositionUpdated
} from "../generated/schema"

export function handleExtensionRegistered(
  event: ExtensionRegisteredEvent
): void {
  let entity = new ExtensionRegistered(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.extension = event.params.extension

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFeesAccumulated(event: FeesAccumulatedEvent): void {
  let entity = new FeesAccumulated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.poolId = event.params.poolId
  entity.amount0 = event.params.amount0
  entity.amount1 = event.params.amount1

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePoolInitialized(event: PoolInitializedEvent): void {
  let entity = new PoolInitialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.poolId = event.params.poolId
  entity.poolKey_token0 = event.params.poolKey.token0
  entity.poolKey_token1 = event.params.poolKey.token1
  entity.poolKey_config = event.params.poolKey.config
  entity.tick = event.params.tick
  entity.sqrtRatio = event.params.sqrtRatio

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePositionFeesCollected(
  event: PositionFeesCollectedEvent
): void {
  let entity = new PositionFeesCollected(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.locker = event.params.locker
  entity.poolId = event.params.poolId
  entity.positionId = event.params.positionId
  entity.amount0 = event.params.amount0
  entity.amount1 = event.params.amount1

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePositionUpdated(event: PositionUpdatedEvent): void {
  let entity = new PositionUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.locker = event.params.locker
  entity.poolId = event.params.poolId
  entity.positionId = event.params.positionId
  entity.liquidityDelta = event.params.liquidityDelta
  entity.balanceUpdate = event.params.balanceUpdate
  entity.stateAfter = event.params.stateAfter

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
