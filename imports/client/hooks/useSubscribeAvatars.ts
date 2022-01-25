import { useSubscribe } from 'meteor/react-meteor-data';

export default function useSubscribeAvatars() {
  return useSubscribe('avatars');
}
