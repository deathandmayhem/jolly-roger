import { z } from "zod";
import { foreignKey, nonEmptyString } from "../typedModel/customTypes";
import type { ModelType } from "../typedModel/Model";
import SoftDeletedModel from "../typedModel/SoftDeletedModel";
import withCommon from "../typedModel/withCommon";

const Tag = withCommon(
  z.object({
    name: nonEmptyString,
    hunt: foreignKey,
  }),
);

const Tags = new SoftDeletedModel("jr_tags", Tag);
Tags.addIndex({ deleted: 1, hunt: 1, name: 1 });
Tags.addIndex({ hunt: 1 });
export type TagType = ModelType<typeof Tags>;

export default Tags;
