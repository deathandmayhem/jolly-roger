import { ACTIVITY_GRANULARITY } from "../lib/config/activityTracking";
import roundedTime from "../lib/roundedTime";
import ignoringDuplicateKeyErrors from "./ignoringDuplicateKeyErrors";
import CallActivities from "./models/CallActivities";

// We insert-and-ignore-duplicates rather than upsert so we never clobber a
// speaking record
export default async function recordCallPresence({
  hunt,
  call,
  user,
  ts = roundedTime(ACTIVITY_GRANULARITY),
}: {
  hunt: string;
  call: string;
  user: string;
  ts?: Date;
}): Promise<void> {
  await ignoringDuplicateKeyErrors(async () => {
    await CallActivities.insertAsync({
      hunt,
      call,
      user,
      ts,
      speaking: false,
    });
  });
}
