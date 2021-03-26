import { Mongo } from 'meteor/mongo';
import BlobSchema, { BlobType } from '../schemas/blob';

const Blobs = new Mongo.Collection<BlobType>('jr_blobs');
Blobs.attachSchema(BlobSchema);

export default Blobs;
