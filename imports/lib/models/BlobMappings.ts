import { Mongo } from 'meteor/mongo';
import type { BlobMappingType } from '../schemas/BlobMapping';

const BlobMappings = new Mongo.Collection<BlobMappingType>('jr_blob_mappings');

export default BlobMappings;
