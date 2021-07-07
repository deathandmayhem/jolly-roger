import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import BlobMappingSchema, { BlobMappingType } from '../schemas/blob_mapping';

const BlobMappings = new Mongo.Collection<BlobMappingType>('jr_blob_mappings');
BlobMappings.attachSchema(BlobMappingSchema);

if (Meteor.isServer) {
  Meteor.publish('mongo.blob_mappings', () => {
    return BlobMappings.find({});
  });
}

// A convenience function for the most common usage pattern of looking up the url
// for a particular image asset, using the mapping if provided, and falling back
// to the file under public/images/ otherwise.
export function lookupUrl(image: string) {
  const mapping = BlobMappings.findOne(image);
  return mapping ? `/asset/${mapping.blob}` : `/images/${image}`;
}

export default BlobMappings;
