// Event emitter utility — call this anywhere in the system to push an event
// into the FlowLayer strip.
//
// TODO: wire to live sources:
//   - OpenClaw gateway  → emit on each routing decision + response
//   - Qdrant writes     → emit on each namespace write (:6333)
//   - Redis sessions    → emit on session open/close
//   - TrueRecall        → emit on recall + archive
//   - Task system       → emit on create / status change
//   - Blueprint inbox   → emit on submission + promotion

import { flowStore } from "./flow-store";
import { FlowEvent } from "./flow-types";

export function emitFlowEvent(
  event: Omit<FlowEvent, "id" | "timestamp">
): void {
  flowStore.addEvent({
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleTimeString([], {
      hour:   "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  });
}
