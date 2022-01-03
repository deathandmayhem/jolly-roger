import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import BlobMappingSchema, { BlobMappingType } from '../schemas/blob_mapping';

const BlobMappings = new Mongo.Collection<BlobMappingType>('jr_blob_mappings');
BlobMappings.attachSchema(BlobMappingSchema);

let blobMappingsSub: Meteor.SubscriptionHandle | undefined;
if (Meteor.isClient) {
  blobMappingsSub = Meteor.subscribe('mongo.blob_mappings');
}

declare global {
  // eslint-disable-next-line camelcase,no-underscore-dangle
  const __meteor_runtime_config__: {
    blobMappings?: { [assetName: string]: string };
  };
}

// A convenience function for the most common usage pattern of looking up the
// url for a particular image asset. This always checks the Mongo record first
// (to create a reactive dependency for client-side rendering), but if we
// haven't fully loaded the subscription yet, we'll fall back to checking the
// runtime config embedded in the page load. Finally, if neither has a custom
// image mapping, fall back to the static default images.
export function lookupUrl(image: string) {
  let mapping = BlobMappings.findOne(image)?.blob;
  if (Meteor.isClient && !blobMappingsSub?.ready()) {
    mapping ||= __meteor_runtime_config__.blobMappings?.[image];
  }
  return mapping ? `/asset/${mapping}` : `/images/${image}`;
}

export default BlobMappings;
