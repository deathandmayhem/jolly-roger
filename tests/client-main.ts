import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

import "./unit/imports/client/components/InsertImage";
import "./unit/imports/lib/calendarTimeFormat";
import "./unit/imports/lib/inferPuzzleTitle";
import "./unit/imports/lib/permission_stubs";
import "./unit/imports/lib/puzzle-sort-and-group";
import "./unit/imports/lib/relativeTimeFormat";
import "./unit/imports/lib/ValidateShape";
import "./unit/imports/methods/TypedMethod";

import "./unit/imports/client/useAttentionSignal";

import "./acceptance/attentionReporting";
import "./acceptance/authentication";
import "./acceptance/chatActions";
import "./acceptance/chatHooks";
import "./acceptance/emails";
import "./acceptance/profiles";
import "./acceptance/smoke";
