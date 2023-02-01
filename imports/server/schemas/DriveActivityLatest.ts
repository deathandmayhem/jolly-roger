import { z } from 'zod';

// DriveActivityLatest captures the most recent timestamp we've seen from the
// Google Drive Activity API. It is a singleton collection, with _id "default"
const DriveActivityLatest = z.object({
  ts: z.date(),
});

export default DriveActivityLatest;
