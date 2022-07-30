import Ansible from '../Ansible';
import Tags from '../lib/models/Tags';

export default function getOrCreateTagByName(huntId: string, name: string): {
  _id: string,
  hunt: string,
  name: string,
} {
  const existingTag = Tags.findOne({ hunt: huntId, name });
  if (existingTag) {
    return existingTag;
  }

  Ansible.log('Creating a new tag', { hunt: huntId, name });
  const newTagId = Tags.insert({ hunt: huntId, name });
  return {
    _id: newTagId,
    hunt: huntId,
    name,
  };
}
