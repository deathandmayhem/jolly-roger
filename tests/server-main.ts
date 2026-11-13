import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { startupHooksComplete } from "../imports/server/runIfLatestBuild";

chai.use(chaiAsPromised);

import "./unit/imports/lib/calendarTimeFormat";
import "./unit/imports/lib/inferPuzzleTitle";
import "./unit/imports/lib/permission_stubs";
import "./unit/imports/lib/puzzle-sort-and-group";
import "./unit/imports/lib/relativeTimeFormat";
import "./unit/imports/lib/ValidateShape";
import "./unit/imports/methods/TypedMethod";

// Disable rate limiting
if (!Meteor.isAppTest) {
  throw new Meteor.Error(500, "This code must not run in production");
}

Accounts.removeDefaultRateLimit();

// The mocha driver runs the suite concurrently with Meteor's startup hooks, so
// wait for schema/index/migration setup before any test hits the database.
before(async function () {
  this.timeout(60000);
  await startupHooksComplete;
});

import "./unit/imports/server/attentionLog";
import "./unit/imports/server/attentionReducer";
import "./unit/imports/server/attentionReducerDaemon";
import "./unit/imports/server/Flags";
import "./unit/imports/server/MigrationRegistry";
import "./unit/imports/server/Model";
import "./unit/imports/server/publishJoinedQuery";
import "./unit/imports/server/validateSchema";
import "./unit/imports/server/mergeUsers";

import "./acceptance/attentionReporting";
import "./acceptance/authentication";
import "./acceptance/chatActions";
import "./acceptance/chatHooks";
import "./acceptance/emails";
import "./acceptance/profiles";
import "./acceptance/smoke";
