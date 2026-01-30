import type { Meteor } from "meteor/meteor";

declare module "meteor/ddp" {
  namespace DDP {
    interface PartialMethodInvocationOptions {
      userId?: string | null;
    }

    const _CurrentInvocation: Meteor.EnvironmentVariable<PartialMethodInvocationOptions>;
    const _CurrentMethodInvocation: Meteor.EnvironmentVariable<PartialMethodInvocationOptions>;
    const _CurrentPublicationInvocation: Meteor.EnvironmentVariable<PartialMethodInvocationOptions>;
  }
}
