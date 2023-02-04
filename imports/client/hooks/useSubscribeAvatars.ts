import { useSubscribe } from 'meteor/react-meteor-data';
import type { HuntId } from '../../lib/models/Hunts';

export default function useSubscribeAvatars(huntId: HuntId) {
  return useSubscribe('avatars', huntId);
}
