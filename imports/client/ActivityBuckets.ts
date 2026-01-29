import { Mongo } from "meteor/mongo";

import type { PublishedBucket } from "../lib/config/activityTracking";
import { ACTIVITY_COLLECTION } from "../lib/config/activityTracking";

export default new Mongo.Collection<PublishedBucket>(ACTIVITY_COLLECTION);
