import { z } from "zod";
import { nonEmptyString } from "../../lib/typedModel/customTypes";
import type { ModelType } from "../../lib/typedModel/Model";
import Model from "../../lib/typedModel/Model";

// _id is Hunt ID
export const HuntFolder = z.object({
  folder: nonEmptyString,
});

const HuntFolders = new Model("jr_hunt_folders", HuntFolder);
export type HuntFolderType = ModelType<typeof HuntFolders>;

export default HuntFolders;
