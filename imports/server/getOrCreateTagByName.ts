import Logger from "../Logger";
import Tags from "../lib/models/Tags";

export default async function getOrCreateTagByName(
  userId: string,
  huntId: string,
  name: string,
): Promise<string> {
  const existingTag = await Tags.findOneAsync({ hunt: huntId, name });
  if (existingTag) {
    return existingTag._id;
  }

  Logger.info("Creating a new tag", { hunt: huntId, name });
  const newTagId = await Tags.insertAsync({
    hunt: huntId,
    name,
    createdBy: userId,
  });

  // When creating a `group:*` tag, also ensure a matching `meta-for:` tag exists.
  if (name.startsWith("group:")) {
    const groupName = name.slice("group:".length);
    const metaTagName = `meta-for:${groupName}`;
    await getOrCreateTagByName(userId, huntId, metaTagName);
  }

  return newTagId;
}
