import { useSubscribe } from 'meteor/react-meteor-data';

export default function useSubscribeDisplayNames() {
  return useSubscribe('displayNames');
}
