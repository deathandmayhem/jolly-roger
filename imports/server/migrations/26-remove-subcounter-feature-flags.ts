import FeatureFlags from "../../lib/models/FeatureFlags";
import Migrations from "./Migrations";

Migrations.add({
  version: 26,
  name: "Remove subscription counter/watchers circuit breaker",
  async up() {
    await FeatureFlags.removeAsync({ name: "disable.subcounters" } as any);
    await FeatureFlags.removeAsync({ name: "disable.subfetches" } as any);
  },
});
