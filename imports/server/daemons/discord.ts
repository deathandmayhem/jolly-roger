import { EventEmitter, once } from "node:events";
import { setTimeout } from "node:timers/promises";
import { Meteor } from "meteor/meteor";
import * as Discord from "discord.js";
import { Events, GatewayIntentBits } from "discord.js";
import Flags from "../../Flags";
import Logger from "../../Logger";
import DiscordCache from "../../lib/models/DiscordCache";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import onExit from "../onExit";
import withLock, { PREEMPT_TIMEOUT } from "../withLock";

interface DiscordDaemonEvents {
  restart: [];
}

class DiscordDaemon extends EventEmitter<DiscordDaemonEvents> {
  private cleanup?: DisposableStack;

  private disabled: boolean = false;
  private token?: string;

  private abort?: AbortController;

  dispose() {
    this.abort?.abort();
    this.cleanup?.dispose();
  }

  async init(): Promise<void> {
    using cleanup = new DisposableStack();
    cleanup.adopt(
      await Settings.find({ name: "discord.bot" }).observeAsync({
        added: (doc) => this.updateToken(doc.value.token),
        changed: (doc) => this.updateToken(doc.value.token),
        removed: () => this.updateToken(undefined),
      }),
      (h) => h.stop(),
    );
    cleanup.adopt(
      await Flags.observeChangesAsync("disable.discord", (disabled) => {
        this.updateDisabled(disabled);
      }),
      (h) => h.stop(),
    );

    this.addListener("restart", () => {
      this.abort?.abort();
      this.abort = new AbortController();
      this.run(this.abort.signal).catch(async (error) => {
        Logger.error("Error while running Discord client", { error });
        await setTimeout(10000);
        this.emit("restart");
      });
    });
    this.emit("restart");

    this.cleanup = cleanup.move();
  }

  updateToken(token?: string) {
    this.token = token;
    this.emit("restart");
  }

  updateDisabled(disabled: boolean) {
    this.disabled = disabled;
    this.emit("restart");
  }

  async run(abort: AbortSignal) {
    const token = this.token;
    const disabled = this.disabled;

    if (disabled || !token) {
      return;
    }

    const aborted = abort.aborted ? Promise.resolve() : once(abort, "abort");

    await withLock("discord-bot", async (renew) => {
      using cleanup = new DisposableStack();
      const renewalFailure = new Promise<void>((_, rej) => {
        cleanup.use(
          setInterval(() => {
            renew().catch(rej);
          }, PREEMPT_TIMEOUT / 2),
        );
      });

      await using client = new Discord.Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
      });

      const clientFailure = once(client, Events.Invalidated).then(() => {
        throw new Error("Discord client invalidated");
      });

      const unseen = new Map<string /* type */, Set<string /* snowflake */>>();
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

      const ready = once(client, Events.ClientReady);
      await client.login(token);

      // renewalFailure and clientFailure will reject, which will cause this to
      // throw, which means we won't continue anyway. We only need to handle
      // `aborted` specially, because that's a clean shutdown.
      const shouldContinue = await Promise.race([
        ready.then(() => true),
        aborted.then(() => false),
        renewalFailure,
        clientFailure,
      ]);
      if (!shouldContinue) return;

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

      // Now we just need to wait for something to abort us
      await Promise.race([aborted, renewalFailure, clientFailure]);
    });
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

const discordDaemon = new DiscordDaemon();
Meteor.startup(async () => {
  await discordDaemon.init();
  onExit(() => discordDaemon.dispose());
});
