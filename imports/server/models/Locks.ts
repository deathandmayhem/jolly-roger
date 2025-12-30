// Locks are a server-only class
import { z } from "zod";
import { createdTimestamp, nonEmptyString } from "../../lib/models/customTypes";
import type { ModelType } from "../../lib/models/Model";
import Model from "../../lib/models/Model";

export const Lock = z.object({
  name: nonEmptyString,
  // Both of these are initially populated as created timestamps, but renewing
  // the lock will update renewedAt (but not createdAt)
  createdAt: createdTimestamp,
  renewedAt: createdTimestamp,
});

const Locks = new Model("jr_locks", Lock);
Locks.addIndex({ name: 1 }, { unique: true });
export type LockType = ModelType<typeof Locks>;

export default Locks;
