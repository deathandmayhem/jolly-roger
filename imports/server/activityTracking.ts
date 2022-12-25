import { Meteor } from 'meteor/meteor';
import { MongoInternals } from 'meteor/mongo';
import { Random } from 'meteor/random';
import Ansible from '../Ansible';
import { ACTIVITY_GRANULARITY } from '../lib/config/activityTracking';
import ConsolidatedActivities from './models/ConsolidatedActivities';
import RecentActivities from './models/RecentActivities';
import { RecentActivityType } from './schemas/RecentActivity';

interface ActivityKey {
  ts: Date;
  hunt: string;
  puzzle: string;
}

function serializeActivityKey({ ts, hunt, puzzle }: ActivityKey) {
  return `${ts.getTime()}-${hunt}-${puzzle}`;
}

function deserializeActivityKey(key: string) {
  const [ts, hunt, puzzle] = key.split('-');
  if (!ts || !hunt || !puzzle) {
    throw new Error(`Invalid activity key: ${key}`);
  }
  return { ts: new Date(parseInt(ts, 10)), hunt, puzzle };
}

async function fetchAndDeleteRecentActivity(
  cutoff: Date,
  session: InstanceType<typeof MongoInternals.NpmModules.mongodb.module.ClientSession>,
) {
  if (!session) {
    throw new Error('Must be called with a session');
  }

  const usersByKeyAndType = new Map<string, Map<RecentActivityType['type'], Set<string>>>();
  while (true) {
    /* eslint-disable no-await-in-loop */
    const recent = await RecentActivities.rawCollection().findOneAndDelete(
      { ts: { $lt: cutoff } } as any,
      { session }
    );
    if (!recent.value) {
      break;
    }

    const key = serializeActivityKey(recent.value);
    const usersByType = usersByKeyAndType.get(key) ?? new Map();
    const users = usersByType.get(recent.value.type) ?? new Set();
    users.add(recent.value.user);
    usersByType.set(recent.value.type, users);
    usersByKeyAndType.set(key, usersByType);
    /* eslint-enable no-await-in-loop */
  }

  return usersByKeyAndType;
}

async function consolidateRecentActivity() {
  const ageForConsolidation = ACTIVITY_GRANULARITY * 2;
  const cutoff = new Date(Date.now() - ageForConsolidation);

  // By using a transaction, we avoid races with other servers, since we only
  // count records that we delete (and if we fail to update the consolidated
  // counters, the deletions will be rolled back).
  //
  // However: note that using the raw collection bypasses our schema
  // enforcement, so we need to make sure of compliance
  const { client } = MongoInternals.defaultRemoteCollectionDriver().mongo;
  const session = client.startSession();
  await session.withTransaction(async () => {
    const usersByKeyAndType = await fetchAndDeleteRecentActivity(
      cutoff,
      session,
    );

    await [...usersByKeyAndType.entries()].reduce(async (p, [key, usersByType]) => {
      await p;

      const matcher = deserializeActivityKey(key);
      const increments = new Map<'total' | `components.${RecentActivityType['type']}`, number>();
      const allUsers = new Set<string>();
      [...usersByType.entries()].forEach(([type, users]) => {
        const incrementKey = `components.${type}` as const;
        increments.set(incrementKey, (increments.get(incrementKey) ?? 0) + users.size);
        users.forEach((user) => allUsers.add(user));
      });
      increments.set('total', allUsers.size);

      await ConsolidatedActivities.rawCollection().updateOne(
        { ...matcher },
        {
          $setOnInsert: {
            _id: Random.id(),
          },
          $inc: Object.fromEntries(increments),
        },
        { upsert: true, session },
      );
    }, Promise.resolve());
  });
}

function scheduleConsolidate() {
  // Consolidate recent activity every ACTIVITY_GRANULARITY / 2 milliseconds
  // plus or minus some jitter
  const jitter = Math.random() * ACTIVITY_GRANULARITY;
  setTimeout(() => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    void periodicConsolidate();
  }, ACTIVITY_GRANULARITY / 2 + jitter);
}

async function periodicConsolidate() {
  try {
    await consolidateRecentActivity();
  } catch (e) {
    Ansible.error('Error consolidating recent activity', { e });
  }
  scheduleConsolidate();
}

Meteor.startup(() => scheduleConsolidate());
