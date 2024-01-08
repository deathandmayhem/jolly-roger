import Migrations from "./migrations/Migrations";
import runIfLatestBuild from "./runIfLatestBuild";

runIfLatestBuild(async () => {
  await Migrations.migrateToLatest();
});
