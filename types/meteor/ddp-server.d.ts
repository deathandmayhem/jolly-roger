declare module "meteor/ddp-server" {
  import type { Meteor } from "meteor/meteor";

  namespace DDPServer {
    class _WriteFence {
      armAndWait(): Promise<void>;
    }

    const _CurrentWriteFence: Meteor.EnvironmentVariable<_WriteFence | null>;
  }
}
