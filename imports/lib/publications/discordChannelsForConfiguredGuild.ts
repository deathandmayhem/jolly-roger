import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "DiscordCache.publications.channelsForConfiguredGuild",
  z.tuple([]),
);
