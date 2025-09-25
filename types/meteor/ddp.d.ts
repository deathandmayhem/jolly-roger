import type { Meteor } from "meteor/meteor";

declare module "meteor/ddp" {
  namespace DDP {
    interface PartialMethodInvocationOptions {
      userId?: string | null;
    }

    const _CurrentInvocation: Meteor.EnvironmentVariable<PartialMethodInvocationOptions>;
  }
}
