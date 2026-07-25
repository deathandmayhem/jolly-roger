import { DDPServer } from "meteor/ddp-server";

// Runs fn inside a DDP write fence, then waits for every observer interested in
// those writes to process them. Uses the same mechanism that Meteor methods do,
// so even though it's using internals, should be somewhat robust to future
// observer implementation changes (e.g. switching from oplog to change streams)
export default async function withWriteFence(
  fn: () => Promise<void>,
): Promise<void> {
  const fence = new DDPServer._WriteFence();
  await DDPServer._CurrentWriteFence.withValue(fence, fn);
  await fence.armAndWait();
}
