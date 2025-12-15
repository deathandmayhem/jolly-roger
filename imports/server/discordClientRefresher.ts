import { Meteor } from "meteor/meteor";
import * as Discord from "discord.js";
import { Events, GatewayIntentBits } from "discord.js";
import Flags from "../Flags";
import DiscordCache from "../lib/models/DiscordCache";
import MeteorUsers from "../lib/models/MeteorUsers";
import type { SettingType } from "../lib/models/Settings";
import Settings from "../lib/models/Settings";
import onExit from "./onExit";
import withLock, { PREEMPT_TIMEOUT } from "./withLock";

class DiscordClientRefresher {
  public client?: Discord.Client;

  private token?: string;

  private configObserveHandle?: Meteor.LiveQueryHandle;

  private featureFlagObserveHandle?: Meteor.LiveQueryHandle;

  private wakeup?: () => void;

  constructor() {
    this.client = undefined;
    this.token = undefined;
  }

  async init() {
    const configCursor = Settings.find({ name: "discord.bot" });
    this.configObserveHandle = await configCursor.observeAsync({
      added: (doc) => this.updateBotConfig(doc),
      changed: (doc) => this.updateBotConfig(doc),
      removed: () => this.clearBotConfig(),
    });

    this.featureFlagObserveHandle = await Flags.observeChangesAsync(
      "disable.discord",
      () => {
        void this.refreshClient();
      },
    );
  }

  ready() {
    return !!this.client;
  }

  shutdown() {
    this.configObserveHandle?.stop();
    this.featureFlagObserveHandle?.stop();
    this.clearBotConfig();
  }

  updateBotConfig(doc: SettingType) {
    if (doc.name !== "discord.bot") {
      return; // this should be impossible
    }

    this.token = doc.value.token;
    void this.refreshClient();
  }

  clearBotConfig() {
    this.token = undefined;
    void this.refreshClient();
  }

  async refreshClient() {
    if (this.client) {
      this.client.destroy();
      this.client = undefined;
    }

    if (this.wakeup) {
      this.wakeup();
      this.wakeup = undefined;
    }

    if (await Flags.activeAsync("disable.discord")) {
      return;
    }

    if (this.token) {
      const client = new Discord.Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
      });
      // Setting the token makes this client usable for REST API calls, but
      // won't connect to the websocket gateway
      client.token = this.token;
      this.client = client;

      Meteor.defer(() => {
        void withLock("discord-bot", async (renew) => {
          // The token gets set to null when the gateway is destroyed. If it's
          // been destroyed, bail, since that means that the config changed and
          // another defer function will have been scheduled
          if (!client.token) {
            return;
          }

          // Start renewing the lock now in the background (remember -
          // "background" includes blocking on awaited promises)
          const renewInterval = Meteor.setInterval(async () => {
            try {
              await renew();
            } catch {
              // we must have lost the lock
              await this.refreshClient();
            }
          }, PREEMPT_TIMEOUT / 2);

          try {
            // If we get the lock, we're responsible for opening the websocket
            // gateway connection

            const unseen = new Map<
              string /* type */,
              Set<string /* snowflake */>
            >();
            for await (const doc of DiscordCache.find()) {
              if (!unseen.has(doc.type)) {
                unseen.set(doc.type, new Set());
              }
              unseen.get(doc.type)!.add(doc.snowflake);
            }

            client.on(Events.GuildAvailable, async (g) => {
              await cacheGuild(g, unseen);
            });
            client.on(Events.GuildCreate, async (g) => {
              await cacheGuild(g, unseen);
            });
            client.on(Events.GuildUpdate, async (_, g) => {
              await cacheGuild(g, unseen);
            });
            client.on(Events.GuildDelete, async (g) => {
              await cacheRemove("guild", g);
            });
            client.on(Events.ChannelCreate, async (c) => {
              await cacheAdd("channel", c, unseen.get("channel"));
            });
            client.on(Events.ChannelUpdate, async (_, c) => {
              await cacheAdd("channel", c, unseen.get("channel"));
            });
            client.on(Events.ChannelDelete, async (c) => {
              await cacheRemove("channel", c);
            });
            client.on(Events.GuildRoleCreate, async (r) => {
              await cacheAdd("role", r, unseen.get("role"));
            });
            client.on(Events.GuildRoleUpdate, async (_, r) => {
              await cacheAdd("role", r, unseen.get("role"));
            });
            client.on(Events.GuildRoleDelete, async (r) => {
              await cacheRemove("role", r);
            });
            client.on(Events.UserUpdate, async (_, u) => {
              await updateUser(u);
            });

            const ready = new Promise<void>((r) => {
              client.on(Events.ClientReady, () => r());
            });
            await client.login(this.token);
            await ready;

            // Now that we've gotten the initial dump on connection, remove
            // anything from the cache that we haven't seen (since it must have
            // been removed while we were offline)
            for (const [type, unseenSet] of unseen.entries()) {
              await DiscordCache.removeAsync({
                type,
                snowflake: { $in: Array.from(unseenSet) },
              });
            }
            // And empty out the map to free memory
            unseen.clear();

            const invalidated = new Promise<void>((r) => {
              client.on(Events.Invalidated, r);
            });
            const wakeup = new Promise<void>((r) => {
              this.wakeup = r;
            });

            const wokenUp = await Promise.race([
              wakeup.then(() => true),
              invalidated.then(() => false),
            ]);
            // if we were explicitly woken up, then another instance of
            // refreshClient fired off and we don't have to do anything;
            // otherwise we need to clean things up ourselves
            if (!wokenUp) {
              await this.refreshClient();
            }
          } finally {
            Meteor.clearInterval(renewInterval);
          }
        });
      });
    }
  }
}

const updateUser = async (u: Discord.User) => {
  await MeteorUsers.updateAsync(
    {
      "discordAccount.id": u.id,
    },
    {
      $set: {
        "discordAccount.username": u.username,
        ...(u.avatar ? { "discordAccount.avatar": u.avatar } : {}),
      },
      ...(u.avatar ? {} : { $unset: { "discordAccount.avatar": 1 } }),
    },
    {
      multi: true,
    },
  );
};

const cacheGuild = async (
  g: Discord.Guild,
  unseen?: Map<string, Set<string>>,
) => {
  await cacheAdd("guild", g, unseen?.get("guild"));
  for (const c of g.channels.cache.values()) {
    await cacheAdd("channel", c, unseen?.get("channel"));
  }
  for (const r of g.roles.cache.values()) {
    await cacheAdd("role", r, unseen?.get("role"));
  }
  for (const m of await g.members.fetch()) {
    await updateUser(m[1].user);
  }
};

const cacheAdd = async <T extends Discord.Base & { id: Discord.Snowflake }>(
  type: string,
  obj: T,
  unseen?: Set<string>,
) => {
  if (unseen) {
    unseen.delete(obj.id);
  }
  await DiscordCache.upsertAsync(
    {
      type,
      snowflake: obj.id,
    },
    {
      $set: {
        type,
        snowflake: obj.id,
        object: obj.toJSON() as any,
      },
    },
  );
};

const cacheRemove = async <T extends Discord.Base & { id: Discord.Snowflake }>(
  type: string,
  obj: T,
) => {
  await DiscordCache.removeAsync({
    type,
    snowflake: obj.id,
  });
};

const discordClientRefresher = new DiscordClientRefresher();
Meteor.startup(async () => {
  await discordClientRefresher.init();
  onExit(() => discordClientRefresher.shutdown());
});

export default discordClientRefresher;
