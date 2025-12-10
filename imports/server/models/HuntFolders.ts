import { z } from "zod";
import { nonEmptyString } from "../../lib/models/customTypes";
import type { ModelType } from "../../lib/models/Model";
import Model from "../../lib/models/Model";

// _id is Hunt ID
export const HuntFolder = z.object({
  folder: nonEmptyString,
});

const HuntFolders = new Model("jr_hunt_folders", HuntFolder);
export type HuntFolderType = ModelType<typeof HuntFolders>;

export default HuntFolders;
