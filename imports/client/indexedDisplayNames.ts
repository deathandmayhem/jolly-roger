import MeteorUsers from "../lib/models/MeteorUsers";

export default function indexedDisplayNames(): Map<string, string> {
  const res = new Map<string, string>();
  MeteorUsers.find(
    {
      displayName: { $ne: undefined },
    },
    {
      projection: { displayName: 1 },
    },
  ).forEach((u) => res.set(u._id, u.displayName!));
  return res;
}
