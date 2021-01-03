import { Meteor } from 'meteor/meteor';
import { Promise as MeteorPromise } from 'meteor/promise';
import Discord from 'discord.js';
import Flags from '../flags';
import FeatureFlags from '../lib/models/feature_flags';
import Settings from '../lib/models/settings';
import { SettingType } from '../lib/schemas/settings';
import Locks, { PREEMPT_TIMEOUT } from './models/lock';

class DiscordClientRefresher {
  public client?: Discord.Client;

  private token?: string;

  private configObserveHandle: Meteor.LiveQueryHandle;

  private featureFlagObserveHandle: Meteor.LiveQueryHandle;

  private wakeup?: () => void;

  constructor() {
    this.client = undefined;
    this.token = undefined;

    const configCursor = Settings.find({ name: 'discord.bot' });
    this.configObserveHandle = configCursor.observe({
      added: (doc) => this.updateBotConfig(doc),
      changed: (doc) => this.updateBotConfig(doc),
      removed: () => this.clearBotConfig(),
    });

    this.featureFlagObserveHandle = FeatureFlags.find({ name: 'disable.discord' }).observe({
      added: () => this.refreshClient(),
      changed: () => this.refreshClient(),
      removed: () => this.refreshClient(),
    });
  }

  ready() {
    return !!this.client;
  }

  shutdown() {
    this.configObserveHandle.stop();
    this.featureFlagObserveHandle.stop();
    this.clearBotConfig();
  }

  updateBotConfig(doc: SettingType) {
    if (doc.name !== 'discord.bot') {
      return; // this should be impossible
    }

    this.token = doc.value.token;
    this.refreshClient();
  }

  clearBotConfig() {
    this.token = undefined;
    this.refreshClient();
  }

  refreshClient() {
    if (this.client) {
      this.client.destroy();
      this.client = undefined;
    }

    if (this.wakeup) {
      this.wakeup();
      this.wakeup = undefined;
    }

    if (Flags.active('disable.discord')) {
      return;
    }

    if (this.token) {
      const client = new Discord.Client();
      // Setting the token makes this client usable for REST API calls, but
      // won't connect to the websocket gateway
      client.token = this.token;
      this.client = client;

      Meteor.defer(() => {
        Locks.withLock('discord-bot', (lock) => {
          // The token gets set to null when the gateway is destroyed. If it's
          // been destroyed, bail, since that means that the config changed and
          // another defer function will have been scheduled
          if (!client.token) {
            return;
          }

          // Start renewing the lock now in the background (remember -
          // "background" includes calls to MeteorPromise.await)
          const renew = Meteor.setInterval(() => {
            try {
              Locks.renew(lock);
            } catch {
              // we must have lost the lock
              this.refreshClient();
            }
          }, PREEMPT_TIMEOUT / 2);

          try {
            // If we get the lock, we're responsible for opening the websocket
            // gateway connection
            const ready = new Promise<void>((r) => client.on('ready', r));
            client.login(this.token);
            MeteorPromise.await(ready);

            const invalidated = new Promise<void>((r) => client.on('invalidated', r));
            const wakeup = new Promise<void>((r) => {
              this.wakeup = r;
            });

            const wokenUp = MeteorPromise.await(Promise.race([
              wakeup.then(() => true),
              invalidated.then(() => false),
            ]));
            // if we were explicitly woken up, then another instance of
            // refreshClient fired off and we don't have to do anything;
            // otherwise we need to clean things up ourselves
            if (!wokenUp) {
              this.refreshClient();
            }
          } finally {
            Meteor.clearInterval(renew);
          }
        });
      });
    }
  }
}

const globalClientHolder = new DiscordClientRefresher();
Meteor.startup(() => {
  process.on('SIGINT', Meteor.bindEnvironment(() => globalClientHolder.shutdown()));
  process.on('SIGTERM', Meteor.bindEnvironment(() => globalClientHolder.shutdown()));
});

export default globalClientHolder;
