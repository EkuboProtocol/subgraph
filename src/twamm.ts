import { Address, BigInt, Bytes, crypto } from "@graphprotocol/graph-ts";
import {
  OrderProceedsWithdrawn as OrderProceedsWithdrawnEvent,
  OrderUpdated as OrderUpdatedEvent,
} from "../generated/TWAMM/TWAMM";
import {
  TwammOrderProceedsWithdrawal,
  TwammOrderUpdate,
} from "../generated/schema";
import { encodePoolKey, uintAt } from "./bytes";
import { metaOfEvent, setEventFields } from "./event";
import { captureTopiclessLogs } from "./receipt";

class OrderKey {
  token0: Bytes;
  token1: Bytes;
  config: Bytes;
  fee: BigInt;
  isSellingToken1: boolean;
  sellToken: Bytes;
  buyToken: Bytes;
  startTime: BigInt;
  endTime: BigInt;
  poolId: Bytes;
}

// Order config: fee (8) | is token1 (1) | salt (7) | start time (8) | end time (8)
function parseOrderKey(
  token0: Address,
  token1: Address,
  config: Bytes,
  twamm: Address,
): OrderKey {
  const isSellingToken1 = config[8] != 0;
  return {
    token0,
    token1,
    config,
    fee: uintAt(config, 0, 8),
    isSellingToken1,
    sellToken: isSellingToken1 ? token1 : token0,
    buyToken: isSellingToken1 ? token0 : token1,
    startTime: uintAt(config, 16, 24),
    endTime: uintAt(config, 24, 32),
    poolId: twammPoolId(token0, token1, config, twamm),
  };
}

// The pool an order trades in: the TWAMM extension, the order's fee and a
// full range type config of zero.
function twammPoolId(
  token0: Address,
  token1: Address,
  orderConfig: Bytes,
  twamm: Address,
): Bytes {
  const poolConfig = new Bytes(32);
  for (let i = 0; i < 20; i++) poolConfig[i] = twamm[i];
  for (let i = 0; i < 8; i++) poolConfig[20 + i] = orderConfig[i];
  return Bytes.fromByteArray(
    crypto.keccak256(encodePoolKey(token0, token1, poolConfig)),
  );
}

export function handleOrderUpdated(event: OrderUpdatedEvent): void {
  const meta = metaOfEvent(event);
  const entity = new TwammOrderUpdate(meta.id);
  setEventFields(entity, meta);

  const orderKey = event.params.orderKey;
  const key = parseOrderKey(
    orderKey.token0,
    orderKey.token1,
    orderKey.config,
    event.address,
  );
  entity.owner = event.params.owner;
  entity.salt = event.params.salt;
  entity.token0 = key.token0;
  entity.token1 = key.token1;
  entity.config = key.config;
  entity.fee = key.fee;
  entity.isSellingToken1 = key.isSellingToken1;
  entity.sellToken = key.sellToken;
  entity.buyToken = key.buyToken;
  entity.startTime = key.startTime;
  entity.endTime = key.endTime;
  entity.poolId = key.poolId;
  entity.saleRateDelta = event.params.saleRateDelta;
  entity.save();

  captureTopiclessLogs(event);
}

export function handleOrderProceedsWithdrawn(
  event: OrderProceedsWithdrawnEvent,
): void {
  const meta = metaOfEvent(event);
  const entity = new TwammOrderProceedsWithdrawal(meta.id);
  setEventFields(entity, meta);

  const orderKey = event.params.orderKey;
  const key = parseOrderKey(
    orderKey.token0,
    orderKey.token1,
    orderKey.config,
    event.address,
  );
  entity.owner = event.params.owner;
  entity.salt = event.params.salt;
  entity.token0 = key.token0;
  entity.token1 = key.token1;
  entity.config = key.config;
  entity.fee = key.fee;
  entity.isSellingToken1 = key.isSellingToken1;
  entity.sellToken = key.sellToken;
  entity.buyToken = key.buyToken;
  entity.startTime = key.startTime;
  entity.endTime = key.endTime;
  entity.poolId = key.poolId;
  entity.amount = event.params.amount;
  entity.save();

  captureTopiclessLogs(event);
}
