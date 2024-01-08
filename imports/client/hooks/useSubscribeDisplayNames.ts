import { useSubscribe } from "meteor/react-meteor-data";

export default function useSubscribeDisplayNames(huntId: string) {
  return useSubscribe("displayNames", huntId);
}
