import { useSubscribe } from 'meteor/react-meteor-data';

export default function useSubscribeDisplayNames() {
  return useSubscribe('mongo.profiles', {}, { fields: { displayName: 1 } });
}
