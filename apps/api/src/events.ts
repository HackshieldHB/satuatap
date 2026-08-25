import { EventEmitter } from "node:events";

export type AppEvent = {
  event: string;
  homeId: string;
  deviceId?: string;
  data: Record<string, unknown>;
  ts: string;
};

class Hub extends EventEmitter {
  publish(evt: AppEvent) {
    this.emit(`home:${evt.homeId}`, evt);
    this.emit("all", evt);
  }
}

export const hub = new Hub();
hub.setMaxListeners(100);
