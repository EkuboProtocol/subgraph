import { Transfer as TransferEvent } from "../generated/Positions/ERC721";
import { NonfungibleTokenTransfer } from "../generated/schema";
import { metaOfEvent, setEventFields } from "./event";
import { captureTopiclessLogs } from "./receipt";

export function handleNonfungibleTokenTransfer(event: TransferEvent): void {
  const meta = metaOfEvent(event);
  const entity = new NonfungibleTokenTransfer(meta.id);
  setEventFields(entity, meta);
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.tokenId = event.params.id;
  entity.save();

  captureTopiclessLogs(event);
}
