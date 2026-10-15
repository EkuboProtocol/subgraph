import { Transfer as TransferEvent } from "../generated/CoreTokenInflows/ERC20";
import { captureTopiclessLogs } from "./receipt";

// ERC-20 transfers to or from the Core are only anchors: they reach swaps in
// transactions that emit no other event this subgraph handles. See
// src/receipt.ts.
export function handleCoreTokenTransfer(event: TransferEvent): void {
  captureTopiclessLogs(event);
}
