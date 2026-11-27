import type { Meteor } from "meteor/meteor";

declare module "meteor/ddp-server" {
  namespace DDPServer {
    class _WriteFence {
      armAndWait(): Promise<void>;
    }

    const _CurrentWriteFence: Meteor.EnvironmentVariable<_WriteFence | null>;
  }
}
