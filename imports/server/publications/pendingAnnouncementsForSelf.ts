import Announcements from '../../lib/models/Announcements';
import MeteorUsers from '../../lib/models/MeteorUsers';
import PendingAnnouncements from '../../lib/models/PendingAnnouncements';
import pendingAnnouncementsForSelf from '../../lib/publications/pendingAnnouncementsForSelf';
import JoinPublisher from '../JoinPublisher';
import definePublication from './definePublication';

definePublication(pendingAnnouncementsForSelf, {
  run() {
    if (!this.userId) {
      return [];
    }

    const watcher = new JoinPublisher(this, {
      model: PendingAnnouncements,
      foreignKeys: [{
        field: 'announcement',
        join: {
          model: Announcements,
          foreignKeys: [{
            field: 'createdBy',
            join: {
              model: MeteorUsers,
              projection: { displayName: 1 },
            },
          }],
        },
      }],
    }, { user: this.userId });
    this.onStop(() => watcher.shutdown());

    return undefined;
  },
});
