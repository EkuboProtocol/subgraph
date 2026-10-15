import { TokenWrapperDeployed as TokenWrapperDeployedEvent } from "../generated/TokenWrapperFactory/TokenWrapperFactory";
import { TokenWrapperDeployment } from "../generated/schema";
import { metaOfEvent, setEventFields } from "./event";
import { captureTopiclessLogs } from "./receipt";

export function handleTokenWrapperDeployed(
  event: TokenWrapperDeployedEvent,
): void {
  const meta = metaOfEvent(event);
  const entity = new TokenWrapperDeployment(meta.id);
  setEventFields(entity, meta);
  entity.underlyingToken = event.params.underlyingToken;
  entity.unlockTime = event.params.unlockTime;
  entity.tokenWrapper = event.params.tokenWrapper;
  entity.save();

  captureTopiclessLogs(event);
}
