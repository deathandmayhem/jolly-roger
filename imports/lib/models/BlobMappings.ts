import { Mongo } from 'meteor/mongo';
import BlobMappingSchema, { BlobMappingType } from '../schemas/BlobMapping';

const BlobMappings = new Mongo.Collection<BlobMappingType>('jr_blob_mappings');
BlobMappings.attachSchema(BlobMappingSchema);

export default BlobMappings;
