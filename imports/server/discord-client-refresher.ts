import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Promise as MeteorPromise } from 'meteor/promise';
import Discord from 'discord.js';
import Flags from '../flags';
import FeatureFlags from '../lib/models/feature_flags';
import Settings from '../lib/models/settings';
import { SettingType } from '../lib/schemas/settings';
import Locks, { PREEMPT_TIMEOUT } from './models/lock';

class DiscordClientRefresher {
  public client?: Discord.Client;

  private botToken?: string;

  private botConfigCursor: Mongo.Cursor<SettingType>

  private botConfigObserveHandle: Meteor.LiveQueryHandle;

  private featureFlagObserveHandle: Meteor.LiveQueryHandle;

  private botRefreshResolve?: () => void;

  constructor() {
    this.client = undefined;
    this.botToken = undefined;
    this.botConfigCursor = Settings.find({ name: 'discord.bot' });
    this.botConfigObserveHandle = this.botConfigCursor.observe({
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

  destroy() {
    this.botConfigObserveHandle.stop();
    this.featureFlagObserveHandle.stop();
    this.clearBotConfig();
  }

  updateBotConfig(doc: SettingType) {
    if (doc.name !== 'discord.bot') {
      return; // this should be impossible
    }

    this.botToken = doc.value.token;
    this.refreshClient();
  }

  clearBotConfig() {
    this.botToken = undefined;
    this.refreshClient();
  }

  refreshClient() {
    if (this.client) {
      this.client.destroy();
      this.client = undefined;
    }

    if (this.botRefreshResolve) {
      this.botRefreshResolve();
      this.botRefreshResolve = undefined;
    }

    if (Flags.active('disable.discord')) {
      return;
    }

    if (this.botToken) {
      const client = new Discord.Client();
      // Setting the token makes this client usable for REST API calls, but
      // won't connect to the websocket gateway
      client.token = this.botToken;
      this.client = client;

      Meteor.defer(() => {
        Locks.withLock('discord-bot', (lock) => {
          // The token gets set to null when the gateway is destroyed. If it's
          // been destroyed, bail, since another defer process will have fired
          // up
          if (!client.token) {
            return;
          }

          // Otherwise, if we get the lock, we're responsible for opening the
          // websocket gateway connection
          const ready = new Promise<void>((r) => client.on('ready', r));
          client.login(this.botToken);
          MeteorPromise.await(ready);

          while (client.token !== null && client.ws.status === Discord.Constants.Status.READY) {
            Locks.renew(lock);
            MeteorPromise.await(new Promise<void>((r) => {
              // Allow the class to cancel the promise early
              this.botRefreshResolve = () => r();
              setTimeout(r, PREEMPT_TIMEOUT / 2);
            }));
          }
        });
      });
    }
  }
}

const globalClientHolder = new DiscordClientRefresher();
Meteor.startup(() => {
  process.on('SIGINT', Meteor.bindEnvironment(() => globalClientHolder.destroy()));
  process.on('SIGTERM', Meteor.bindEnvironment(() => globalClientHolder.destroy()));
});

export default globalClientHolder;
