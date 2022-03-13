import { useSubscribe } from 'meteor/react-meteor-data';

export default function useSubscribeAvatars(huntId: string) {
  return useSubscribe('avatars', huntId);
}
