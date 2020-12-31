import { Mongo } from 'meteor/mongo';
import { Promise as MeteorPromise } from 'meteor/promise';
import Discord from 'discord.js';
import Settings from '../lib/models/settings';
import { SettingType } from '../lib/schemas/settings';

class DiscordClientRefresher {
  public client?: Discord.Client;

  private botToken?: string;

  private botConfigCursor: Mongo.Cursor<SettingType>

  constructor() {
    this.client = undefined;
    this.botToken = undefined;
    this.botConfigCursor = Settings.find({ name: 'discord.bot' });
    this.botConfigCursor.observe({
      added: (doc) => this.updateBotConfig(doc),
      changed: (doc) => this.updateBotConfig(doc),
      removed: () => this.clearBotConfig(),
    });
  }

  ready() {
    return !!this.client;
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

    if (this.botToken) {
      this.client = new Discord.Client();
      MeteorPromise.await(this.client.login(this.botToken));
    }
  }
}

const globalClientHolder = new DiscordClientRefresher();

export default globalClientHolder;
