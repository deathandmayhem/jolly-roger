import { z } from "zod";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import { foreignKey } from "./customTypes";
import withCommon from "./withCommon";

const APIKey = withCommon(
  z.object({
    user: foreignKey,
    key: z.string().regex(/^[A-Za-z0-9]{32}$/),
  }),
);

const APIKeys = new SoftDeletedModel("jr_api_keys", APIKey);
APIKeys.addIndex({ key: 1 });
export type APIKeyType = ModelType<typeof APIKeys>;

export default APIKeys;
