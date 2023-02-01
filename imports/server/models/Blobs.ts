import { z } from 'zod';
import type { ModelType } from '../../lib/models/Model';
import Model from '../../lib/models/Model';
import Blob from '../schemas/Blob';

const Blobs = new Model('jr_blobs', Blob, z.string().regex(/^[a-fA-F0-9]{64}$/));
export type BlobType = ModelType<typeof Blobs>;

export default Blobs;
