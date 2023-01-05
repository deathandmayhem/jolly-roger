import BlobMappings from '../../lib/models/BlobMappings';
import blobMappingsAll from '../../lib/publications/blobMappingsAll';
import definePublication from './definePublication';

definePublication(blobMappingsAll, {
  run() {
    return BlobMappings.find({});
  },
});
