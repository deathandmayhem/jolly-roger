import Logger from '../Logger';
import type { HuntId } from '../lib/models/Hunts';
import Tags from '../lib/models/Tags';

export default async function getOrCreateTagByName(
  huntId: HuntId,
  name: string
): Promise<{
  _id: string,
  hunt: HuntId,
  name: string,
}> {
  const existingTag = await Tags.findOneAsync({ hunt: huntId, name });
  if (existingTag) {
    return existingTag;
  }

  Logger.info('Creating a new tag', { hunt: huntId, name });
  const newTagId = await Tags.insertAsync({ hunt: huntId, name });

  // When creating a `group:*` tag, also ensure a matching `meta-for:` tag exists.
  if (name.startsWith('group:')) {
    const groupName = name.slice('group:'.length);
    const metaTagName = `meta-for:${groupName}`;
    await getOrCreateTagByName(huntId, metaTagName);
  }

  return {
    _id: newTagId,
    hunt: huntId,
    name,
  };
}
