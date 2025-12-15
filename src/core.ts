import {
  PoolInitialized as PoolInitializedEvent,
} from "../generated/Core/Core"
import {
  PoolInitialization,
} from "../generated/schema"
import {
  parseExtension,
  parseFee,
  parseTypeConfig,
} from "./pool-config"

export function handlePoolInitialized(event: PoolInitializedEvent): void {
  const entity = new PoolInitialization(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.coreAddress = event.address
  entity.poolId = event.params.poolId

  entity.token0 = event.params.poolKey.token0
  entity.token1 = event.params.poolKey.token1
  entity.config = event.params.poolKey.config

  entity.extension = parseExtension(event.params.poolKey.config)
  entity.fee = parseFee(event.params.poolKey.config)

  const raw = parseTypeConfig(event.params.poolKey.config)

  const isConcentrated = (raw & 0x80000000) != 0
  if (isConcentrated) {
    entity.tickSpacing = raw & 0x7fffffff
  } else {
    entity.stableswapAmplification = (raw >> 24) as u8
    entity.stableswapCenterTick = raw & 0x00ffffff
  }

  entity.tick = event.params.tick
  entity.sqrtRatio = event.params.sqrtRatio

  entity.save()
}
