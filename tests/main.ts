import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

import "./unit/imports/lib/calendarTimeFormat";
import "./unit/imports/lib/puzzle-sort-and-group";
import "./unit/imports/lib/relativeTimeFormat";
import "./unit/imports/lib/ValidateShape";

if (Meteor.isServer) {
  // Disable rate limiting
  if (!Meteor.isAppTest) {
    throw new Meteor.Error(500, "This code must not run in production");
  }

  Accounts.removeDefaultRateLimit();

  require("./unit/imports/server/Flags");
  require("./unit/imports/server/generateJsonSchema");
  require("./unit/imports/server/MigrationRegistry");
  require("./unit/imports/server/Model");
  require("./unit/imports/server/publishJoinedQuery");
  require("./unit/imports/server/validateSchema");
}

import "./acceptance/authentication";
import "./acceptance/chatHooks";
import "./acceptance/profiles";
import "./acceptance/smoke";
