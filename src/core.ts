import { PoolInitialized as PoolInitializedEvent } from "../generated/Core/Core";
import { PoolInitialization } from "../generated/schema";
import { Bytes } from "@graphprotocol/graph-ts";
import { parseExtension, parseFee, parseTypeConfig } from "./pool-config";

export function poolInitializationId(event: PoolInitializedEvent): Bytes {
  const id = new Bytes(16);
  const view = new DataView(id.buffer);

  view.setUint64(0, event.block.number.toU64(), false);
  view.setUint32(8, event.transaction.index.toU32(), false);
  view.setUint32(12, event.logIndex.toU32(), false);

  return id;
}

export function handlePoolInitialized(event: PoolInitializedEvent): void {
  const entity = new PoolInitialization(poolInitializationId(event));

  entity.blockNumber = event.block.number;
  entity.transactionIndex = event.transaction.index;
  entity.eventIndex = event.logIndex;
  entity.blockHash = event.block.hash;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.coreAddress = event.address;
  entity.poolId = event.params.poolId;

  const pk = event.params.poolKey;
  const config = pk.config;

  entity.token0 = pk.token0;
  entity.token1 = pk.token1;
  entity.config = config;

  entity.extension = parseExtension(config);
  entity.fee = parseFee(config);

  const raw = parseTypeConfig(config);

  const isConcentrated = (raw & 0x80000000) != 0;
  if (isConcentrated) {
    entity.tickSpacing = raw & 0x7fffffff;
  } else {
    entity.stableswapAmplification = (raw >> 24) as u8;
    const low24 = raw & 0x00ffffff;
    const signed24 = (low24 & 0x00800000) != 0 ? low24 - 0x01000000 : low24;
    entity.stableswapCenterTick = signed24 * 16;
  }

  entity.tick = event.params.tick;
  entity.sqrtRatio = event.params.sqrtRatio;

  entity.save();
}
