import { Meteor } from "meteor/meteor";
import Logger from "../Logger";
import Tags from "../lib/models/Tags";

export default async function getOrCreateTagByName(
  userId: string,
  huntId: string,
  name: string,
): Promise<string> {
  const cleanName = name.trim().replace(/\s+/g, " ");

  if (!cleanName) {
    throw new Meteor.Error(400, "Tag name must not be empty");
  }

  const existingTag = await Tags.findOneAsync({
    hunt: huntId,
    $or: [
      { name: { $regex: new RegExp(`^${cleanName}$`, "i") } },
      { aliases: cleanName },
    ],
  });
  if (existingTag) {
    return existingTag._id;
  }

  Logger.info("Creating a new tag", { hunt: huntId, name: cleanName });
  const newTagId = await Tags.insertAsync({
    hunt: huntId,
    name: cleanName,
    createdBy: userId,
    aliases: [],
  });

  // When creating a `group:*` tag, also ensure a matching `meta-for:` tag exists.
  if (cleanName.startsWith("group:")) {
    const groupName = cleanName.slice("group:".length);
    const metaTagName = `meta-for:${groupName}`;
    await getOrCreateTagByName(userId, huntId, metaTagName);
  }

  return newTagId;
}
