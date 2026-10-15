import {
  Funded as FundedEvent,
  Refunded as RefundedEvent,
} from "../generated/Incentives/Incentives";
import { IncentivesFunding, IncentivesRefund } from "../generated/schema";
import { metaOfEvent, setEventFields } from "./event";
import { captureTopiclessLogs } from "./receipt";

export function handleFunded(event: FundedEvent): void {
  const meta = metaOfEvent(event);
  const entity = new IncentivesFunding(meta.id);
  setEventFields(entity, meta);
  const key = event.params.key;
  entity.owner = key.owner;
  entity.token = key.token;
  entity.root = key.root;
  entity.amountNext = event.params.amountNext;
  entity.save();

  captureTopiclessLogs(event);
}

export function handleRefunded(event: RefundedEvent): void {
  const meta = metaOfEvent(event);
  const entity = new IncentivesRefund(meta.id);
  setEventFields(entity, meta);
  const key = event.params.key;
  entity.owner = key.owner;
  entity.token = key.token;
  entity.root = key.root;
  entity.refundAmount = event.params.refundAmount;
  entity.save();

  captureTopiclessLogs(event);
}
