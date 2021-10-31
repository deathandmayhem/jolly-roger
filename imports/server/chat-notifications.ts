import { check } from 'meteor/check';
import { Meteor, Subscription } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import Flags from '../flags';
import ChatNotifications from '../lib/models/chat_notifications';
import Hunts from '../lib/models/hunts';
import Puzzles from '../lib/models/puzzles';
import { ChatNotificationType } from '../lib/schemas/chat_notification';
import { HuntType } from '../lib/schemas/hunt';
import { PuzzleType } from '../lib/schemas/puzzle';
import RefCountedObserverMap from './refcounted-observer-map';

class ChatNotificationWatcher {
  sub: Subscription

  chatNotifCursor: Mongo.Cursor<ChatNotificationType>

  chatNotifWatch: Meteor.LiveQueryHandle

  notifications: Record<string, ChatNotificationType>

  huntRefCounter: RefCountedObserverMap<HuntType>

  puzzleRefCounter: RefCountedObserverMap<PuzzleType>

  constructor(sub: Subscription) {
    this.sub = sub;
    this.chatNotifCursor = ChatNotifications.find({
      user: sub.userId,
    });
    this.notifications = {};
    this.huntRefCounter = new RefCountedObserverMap(sub, Hunts);
    this.puzzleRefCounter = new RefCountedObserverMap(sub, Puzzles);

    this.chatNotifWatch = this.chatNotifCursor.observeChanges({
      added: (id, fields) => {
        this.notifications[id] = { _id: id, ...fields } as ChatNotificationType;
        this.huntRefCounter.incref(fields.hunt!);
        this.puzzleRefCounter.incref(fields.puzzle!);
        this.sub.added(ChatNotifications.tableName, id, fields);
      },

      changed: (id, fields) => {
        const huntUpdated = Object.prototype.hasOwnProperty.call(fields, 'hunt');
        const puzzleUpdated = Object.prototype.hasOwnProperty.call(fields, 'puzzle');

        // Ordering here important to avoid transient inconsistencies.
        if (huntUpdated) {
          this.huntRefCounter.incref(fields.hunt!);
        }
        if (puzzleUpdated) {
          this.puzzleRefCounter.incref(fields.puzzle!);
        }
        this.sub.changed(ChatNotifications.tableName, id, fields);
        if (puzzleUpdated) {
          this.puzzleRefCounter.decref(this.notifications[id].puzzle);
        }
        if (huntUpdated) {
          this.huntRefCounter.decref(this.notifications[id].hunt);
        }

        this.notifications[id] = { ...this.notifications[id], ...fields };
      },

      removed: (id) => {
        this.sub.removed(ChatNotifications.tableName, id);
        this.puzzleRefCounter.decref(this.notifications[id].puzzle);
        this.huntRefCounter.decref(this.notifications[id].hunt);
      },
    });

    this.sub.ready();
  }

  shutdown() {
    this.chatNotifWatch.stop();
  }
}

Meteor.publish('chatNotifications', function () {
  if (!this.userId) {
    throw new Meteor.Error(401, 'Not logged in');
  }

  if (Flags.active('disable.dingwords')) {
    return;
  }

  const watcher = new ChatNotificationWatcher(this);
  this.onStop(() => watcher.shutdown());
});

Meteor.methods({
  dismissChatNotification(chatNotifId: unknown) {
    check(this.userId, String);
    check(chatNotifId, String);

    ChatNotifications.remove(chatNotifId);
  },
});
