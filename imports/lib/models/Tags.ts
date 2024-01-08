import { z } from "zod";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import { foreignKey, nonEmptyString } from "./customTypes";
import withCommon from "./withCommon";

const Tag = withCommon(
  z.object({
    name: nonEmptyString,
    hunt: foreignKey,
  }),
);

const Tags = new SoftDeletedModel("jr_tags", Tag);
Tags.addIndex({ deleted: 1, hunt: 1, name: 1 });
export type TagType = ModelType<typeof Tags>;

export default Tags;
