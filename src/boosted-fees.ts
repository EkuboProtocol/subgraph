import { PoolBoosted as PoolBoostedEvent } from "../generated/BoostedFeesConcentrated/BoostedFees";
import { BoostedFeesPoolBoost } from "../generated/schema";
import { metaOfEvent, setEventFields } from "./event";
import { captureTopiclessLogs } from "./receipt";

export function handlePoolBoosted(event: PoolBoostedEvent): void {
  const meta = metaOfEvent(event);
  const entity = new BoostedFeesPoolBoost(meta.id);
  setEventFields(entity, meta);
  entity.poolId = event.params.poolId;
  entity.startTime = event.params.startTime;
  entity.endTime = event.params.endTime;
  entity.rate0 = event.params.rate0;
  entity.rate1 = event.params.rate1;
  entity.save();

  captureTopiclessLogs(event);
}
