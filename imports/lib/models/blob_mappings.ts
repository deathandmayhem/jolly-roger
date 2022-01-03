import { Mongo } from 'meteor/mongo';
import BlobMappingSchema, { BlobMappingType } from '../schemas/blob_mapping';

const BlobMappings = new Mongo.Collection<BlobMappingType>('jr_blob_mappings');
BlobMappings.attachSchema(BlobMappingSchema);

export default BlobMappings;
