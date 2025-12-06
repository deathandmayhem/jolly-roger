import BlobMappings from "../lib/models/BlobMappings";
import blobMappingsAll from "../lib/publications/blobMappingsAll";
import typedSubscribe from "./typedSubscribe";

const blobMappingsSub = typedSubscribe(blobMappingsAll);

// A convenience function for the most common usage pattern of looking up the
// url for a particular image asset. This always checks the Mongo record first
// (to create a reactive dependency), but if we haven't fully loaded the
// subscription yet, we'll fall back to checking the runtime config embedded in
// the page load. Finally, if neither has a custom image mapping, fall back to
// the static default images.
export default function lookupUrl(image: string) {
  let mapping = BlobMappings.findOne(image)?.blob;
  if (!blobMappingsSub.ready()) {
    mapping ??= __meteor_runtime_config__.blobMappings?.[image];
  }
  mapping ??= __meteor_runtime_config__.defaultBlobMappings[image];
  return `/asset/${mapping}`;
}
