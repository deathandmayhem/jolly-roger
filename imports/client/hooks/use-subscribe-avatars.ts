import { useSubscribe } from 'meteor/react-meteor-data';

export default function useSubscribeAvatars() {
  return useSubscribe('mongo.profiles', {}, {
    fields: { displayName: 1, discordAccount: 1 },
  });
}
