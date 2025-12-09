import { z } from "zod";
import { foreignKey } from "./customTypes";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import withCommon from "./withCommon";

const APIKey = withCommon(
  z.object({
    user: foreignKey,
    key: z.string().regex(/^[A-Za-z0-9]{32}$/),
    lastUsedAt: z.date().optional(),
  }),
);

const APIKeys = new SoftDeletedModel("jr_api_keys", APIKey);
APIKeys.addIndex({ key: 1 }, { unique: true });
export type APIKeyType = ModelType<typeof APIKeys>;

export default APIKeys;
