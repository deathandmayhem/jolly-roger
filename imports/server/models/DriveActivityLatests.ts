import { z } from 'zod';
import type { ModelType } from '../../lib/models/Model';
import Model from '../../lib/models/Model';
import DriveActivityLatest from '../schemas/DriveActivityLatest';

const DriveActivityLatests = new Model('jr_drive_activity_latests', DriveActivityLatest, z.literal('default'));
export type DriveActivityLatestType = ModelType<typeof DriveActivityLatests>;

export default DriveActivityLatests;
