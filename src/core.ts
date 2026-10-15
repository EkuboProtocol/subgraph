import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  ExtensionRegistered as ExtensionRegisteredEvent,
  FeesAccumulated as FeesAccumulatedEvent,
  PoolInitialized as PoolInitializedEvent,
  PositionFeesCollected as PositionFeesCollectedEvent,
  PositionUpdated as PositionUpdatedEvent,
} from "../generated/Core/Core";
import {
  ExtensionRegistration,
  FeesAccumulation,
  PoolInitialization,
  PositionFeesCollection,
  PositionUpdate,
} from "../generated/schema";
import {
  bytesAt,
  floatSqrtRatioToFixed,
  i32At,
  intAt,
  u32At,
  uintAt,
} from "./bytes";
import { metaOfEvent, setEventFields } from "./event";
import { captureTopiclessLogs } from "./receipt";

// Pool config: extension (20) | fee (8) | type config (4)
export function handlePoolInitialized(event: PoolInitializedEvent): void {
  const meta = metaOfEvent(event);
  const entity = new PoolInitialization(meta.id);
  setEventFields(entity, meta);

  entity.coreAddress = event.address;
  entity.poolId = event.params.poolId;

  const poolKey = event.params.poolKey;
  const config = poolKey.config;
  entity.token0 = poolKey.token0;
  entity.token1 = poolKey.token1;
  entity.config = config;
  entity.extension = bytesAt(config, 0, 20);
  entity.fee = uintAt(config, 20, 28);

  const typeConfig = u32At(config, 28);
  if ((typeConfig & 0x80000000) != 0) {
    entity.tickSpacing = (typeConfig & 0x7fffffff) as i32;
  } else {
    entity.stableswapAmplification = ((typeConfig >> 24) & 0x7f) as i32;
    const low24 = (typeConfig & 0x00ffffff) as i32;
    const centerTick24 = (low24 & 0x00800000) != 0 ? low24 - 0x01000000 : low24;
    entity.stableswapCenterTick = centerTick24 * 16;
  }

  entity.tick = event.params.tick;
  entity.sqrtRatio = floatSqrtRatioToFixed(event.params.sqrtRatio);
  entity.save();

  captureTopiclessLogs(event);
}

class PositionKey {
  salt: BigInt;
  lowerTick: i32;
  upperTick: i32;
}

// Position id: salt (24) | lower tick (4) | upper tick (4)
function parsePositionId(positionId: Bytes): PositionKey {
  return {
    salt: uintAt(positionId, 0, 24),
    lowerTick: i32At(positionId, 24),
    upperTick: i32At(positionId, 28),
  };
}

export function handlePositionUpdated(event: PositionUpdatedEvent): void {
  const meta = metaOfEvent(event);
  const entity = new PositionUpdate(meta.id);
  setEventFields(entity, meta);

  const positionId = event.params.positionId;
  const key = parsePositionId(positionId);
  entity.locker = event.params.locker;
  entity.poolId = event.params.poolId;
  entity.positionId = positionId;
  entity.salt = key.salt;
  entity.lowerTick = key.lowerTick;
  entity.upperTick = key.upperTick;
  entity.liquidityDelta = event.params.liquidityDelta;

  // Balance update: delta0 (16) | delta1 (16)
  const balanceUpdate = event.params.balanceUpdate;
  entity.delta0 = intAt(balanceUpdate, 0, 16);
  entity.delta1 = intAt(balanceUpdate, 16, 32);

  // Pool state: sqrt ratio (12) | tick (4) | liquidity (16)
  const stateAfter = event.params.stateAfter;
  entity.sqrtRatioAfter = floatSqrtRatioToFixed(uintAt(stateAfter, 0, 12));
  entity.tickAfter = i32At(stateAfter, 12);
  entity.liquidityAfter = uintAt(stateAfter, 16, 32);
  entity.save();

  captureTopiclessLogs(event);
}

export function handlePositionFeesCollected(
  event: PositionFeesCollectedEvent,
): void {
  const meta = metaOfEvent(event);
  const entity = new PositionFeesCollection(meta.id);
  setEventFields(entity, meta);

  const positionId = event.params.positionId;
  const key = parsePositionId(positionId);
  entity.locker = event.params.locker;
  entity.poolId = event.params.poolId;
  entity.positionId = positionId;
  entity.salt = key.salt;
  entity.lowerTick = key.lowerTick;
  entity.upperTick = key.upperTick;
  entity.amount0 = event.params.amount0;
  entity.amount1 = event.params.amount1;
  entity.save();

  captureTopiclessLogs(event);
}

export function handleFeesAccumulated(event: FeesAccumulatedEvent): void {
  const meta = metaOfEvent(event);
  const entity = new FeesAccumulation(meta.id);
  setEventFields(entity, meta);
  entity.poolId = event.params.poolId;
  entity.amount0 = event.params.amount0;
  entity.amount1 = event.params.amount1;
  entity.save();

  captureTopiclessLogs(event);
}

export function handleExtensionRegistered(
  event: ExtensionRegisteredEvent,
): void {
  const meta = metaOfEvent(event);
  const entity = new ExtensionRegistration(meta.id);
  setEventFields(entity, meta);
  entity.extension = event.params.extension;
  entity.save();

  captureTopiclessLogs(event);
}
