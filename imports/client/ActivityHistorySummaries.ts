import { Mongo } from "meteor/mongo";

const ACTIVITY_GRAPH_COLLECTION = "activityHistorySummaries";
export interface AggregatedActivityDataPoint {
  _id: string;
  huntId: string;
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  hour: number;
  type: "Call" | "Chat" | "Document";
  count: number;
}

export default new Mongo.Collection<AggregatedActivityDataPoint>(
  ACTIVITY_GRAPH_COLLECTION,
);
