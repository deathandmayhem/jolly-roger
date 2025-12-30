import { z } from "zod";
import { foreignKey, nonEmptyString } from "../../lib/models/customTypes";
import type { ModelType } from "../../lib/models/Model";
import Model from "../../lib/models/Model";
import { Id } from "../../lib/models/regexes";
import withTimestamps from "../../lib/models/withTimestamps";

export const Subscriber = withTimestamps(
  z.object({
    server: foreignKey,
    // The connection ID is not technically a foreign key because it doesn't refer
    // to another database record
    connection: z.string().regex(Id),
    user: foreignKey,
    name: nonEmptyString,
    context: z.record(z.string(), z.union([nonEmptyString, z.boolean()])),
  }),
);

const Subscribers = new Model("jr_subscribers", Subscriber);
Subscribers.addIndex({ server: 1 });
Subscribers.addIndex({ "context.hunt": 1 });
Subscribers.addIndex({ name: 1 });
export type SubscriberType = ModelType<typeof Subscribers>;

export default Subscribers;
