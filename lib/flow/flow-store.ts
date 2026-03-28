// In-memory event store for FlowLayer.
// Singleton — all components subscribe to the same instance.
// TODO: replace with SSE or WebSocket stream from OpenClaw / gateway

import { FlowEvent } from "./flow-types";

type Listener = (events: FlowEvent[]) => void;

class FlowStore {
  private events: FlowEvent[] = [];
  private listeners = new Set<Listener>();
  private readonly maxEvents = 100;

  getEvents(): FlowEvent[] {
    return this.events;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.events);
    return () => this.listeners.delete(listener);
  }

  addEvent(event: FlowEvent): void {
    this.events = [...this.events, event].slice(-this.maxEvents);
    this.broadcast();
  }

  seed(events: FlowEvent[]): void {
    this.events = events.slice(-this.maxEvents);
    this.broadcast();
  }

  clear(): void {
    this.events = [];
    this.broadcast();
  }

  private broadcast(): void {
    this.listeners.forEach((fn) => fn(this.events));
  }
}

export const flowStore = new FlowStore();
