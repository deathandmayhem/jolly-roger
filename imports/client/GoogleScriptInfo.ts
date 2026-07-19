import { Mongo } from "meteor/mongo";

// Pseudo-collection used for image insert info
const GoogleScriptInfo = new Mongo.Collection<{
  configured: boolean;

  /* only exposed to admins */
  outOfDate?: boolean;

  // Candidate URLs for the third-party cookie check; the client races them and
  // accepts whichever resolves. See googleScriptCookieCheckUrls in setup.ts.
  cookieCheckUrls?: string[];
}>("googleScriptInfo");

export default GoogleScriptInfo;
