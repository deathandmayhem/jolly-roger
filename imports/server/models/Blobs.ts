import { Mongo } from 'meteor/mongo';
import BlobSchema, { BlobType } from '../schemas/Blob';

const Blobs = new Mongo.Collection<BlobType>('jr_blobs');
Blobs.attachSchema(BlobSchema);

export default Blobs;
