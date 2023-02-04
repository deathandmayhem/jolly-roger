import { useSubscribe } from 'meteor/react-meteor-data';
import type { HuntId } from '../../lib/models/Hunts';

export default function useSubscribeDisplayNames(huntId: HuntId) {
  return useSubscribe('displayNames', huntId);
}
