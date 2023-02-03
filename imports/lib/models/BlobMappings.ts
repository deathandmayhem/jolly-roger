import BlobMapping from '../schemas/BlobMapping';
import { nonEmptyString } from '../schemas/customTypes';
import type { ModelType } from './Model';
import Model from './Model';

const BlobMappings = new Model('jr_blob_mappings', BlobMapping, nonEmptyString);
export type BlobMappingType = ModelType<typeof BlobMappings>;

export default BlobMappings;
