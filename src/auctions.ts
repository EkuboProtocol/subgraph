import {
  AuctionCompleted as AuctionCompletedEvent,
  AuctionFundsAdded as AuctionFundsAddedEvent,
  BoostStarted as BoostStartedEvent,
  CreatorProceedsCollected as CreatorProceedsCollectedEvent,
} from "../generated/Auctions/Auctions";
import {
  AuctionBoostStart,
  AuctionCompletion,
  AuctionCreatorProceedsCollection,
  AuctionFundsAddition,
} from "../generated/schema";
import { metaOfEvent, setEventFields } from "./event";
import { captureTopiclessLogs } from "./receipt";

export { handleNonfungibleTokenTransfer } from "./nft";

export function handleAuctionCompleted(event: AuctionCompletedEvent): void {
  const meta = metaOfEvent(event);
  const entity = new AuctionCompletion(meta.id);
  setEventFields(entity, meta);
  const key = event.params.auctionKey;
  entity.tokenId = event.params.tokenId;
  entity.token0 = key.token0;
  entity.token1 = key.token1;
  entity.config = key.config;
  entity.creatorAmount = event.params.creatorAmount;
  entity.boostAmount = event.params.boostAmount;
  entity.save();

  captureTopiclessLogs(event);
}

export function handleAuctionFundsAdded(event: AuctionFundsAddedEvent): void {
  const meta = metaOfEvent(event);
  const entity = new AuctionFundsAddition(meta.id);
  setEventFields(entity, meta);
  const key = event.params.auctionKey;
  entity.tokenId = event.params.tokenId;
  entity.token0 = key.token0;
  entity.token1 = key.token1;
  entity.config = key.config;
  entity.saleRate = event.params.saleRate;
  entity.save();

  captureTopiclessLogs(event);
}

export function handleBoostStarted(event: BoostStartedEvent): void {
  const meta = metaOfEvent(event);
  const entity = new AuctionBoostStart(meta.id);
  setEventFields(entity, meta);
  const key = event.params.auctionKey;
  entity.token0 = key.token0;
  entity.token1 = key.token1;
  entity.config = key.config;
  entity.boostRate = event.params.boostRate;
  entity.boostEndTime = event.params.boostEndTime;
  entity.save();

  captureTopiclessLogs(event);
}

export function handleCreatorProceedsCollected(
  event: CreatorProceedsCollectedEvent,
): void {
  const meta = metaOfEvent(event);
  const entity = new AuctionCreatorProceedsCollection(meta.id);
  setEventFields(entity, meta);
  const key = event.params.auctionKey;
  entity.tokenId = event.params.tokenId;
  entity.token0 = key.token0;
  entity.token1 = key.token1;
  entity.config = key.config;
  entity.recipient = event.params.recipient;
  entity.amount = event.params.amount;
  entity.save();

  captureTopiclessLogs(event);
}
