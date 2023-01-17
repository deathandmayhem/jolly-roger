import { Mongo } from 'meteor/mongo';
import { BlobType } from '../schemas/Blob';

const Blobs = new Mongo.Collection<BlobType>('jr_blobs');

export default Blobs;
