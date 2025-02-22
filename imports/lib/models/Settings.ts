import { z } from "zod";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import { nonEmptyString } from "./customTypes";
import withCommon from "./withCommon";

const SettingDiscriminatedUnion = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("gdrive.credential"),
    value: z.object({
      refreshToken: nonEmptyString,
      email: nonEmptyString,
      id: nonEmptyString.optional(),
    }),
  }),
  z.object({
    name: z.literal("gdrive.root"),
    value: z.object({ id: nonEmptyString }),
  }),
  z.object({
    name: z.literal("gdrive.template.document"),
    value: z.object({ id: nonEmptyString }),
  }),
  z.object({
    name: z.literal("gdrive.template.spreadsheet"),
    value: z.object({ id: nonEmptyString }),
  }),
  z.object({
    name: z.literal("discord.bot"),
    value: z.object({ token: nonEmptyString }),
  }),
  z.object({
    name: z.literal("discord.guild"),
    value: z.object({
      guild: z.object({ id: nonEmptyString, name: nonEmptyString }),
    }),
  }),
  z.object({
    name: z.literal("email.branding"),
    value: z.object({
      from: nonEmptyString.optional(),
      enrollAccountMessageSubjectTemplate: nonEmptyString.optional(),
      enrollAccountMessageTemplate: nonEmptyString.optional(),
      existingJoinMessageSubjectTemplate: nonEmptyString.optional(),
      existingJoinMessageTemplate: nonEmptyString.optional(),
    }),
  }),
  z.object({
    name: z.literal("teamname"),
    value: z.object({ teamName: nonEmptyString }),
  }),
  z.object({
    name: z.literal("google.script"),
    value: z.object({
      sharedSecret: nonEmptyString,
      scriptId: nonEmptyString,
      contentHash: nonEmptyString,
      endpointUrl: nonEmptyString.optional(),
    }),
  }),
  z.object({
    name: z.literal("s3.image_bucket"),
    value: z.object({
      bucketName: nonEmptyString,
      bucketRegion: nonEmptyString,
    }),
  }),
  z.object({
    name: z.literal("server.settings"),
    value: z.object({
      defaultHuntTags: nonEmptyString.optional(),
    }),
  }),
]);

const Setting = withCommon(SettingDiscriminatedUnion);

export const SettingNames = SettingDiscriminatedUnion.options.map((option) => {
  return option.shape.name.value;
});
export type SettingNameType = (typeof SettingNames)[number];

const Settings = new SoftDeletedModel("jr_settings", Setting);
Settings.addIndex({ name: 1 }, { unique: true });
export type SettingType = ModelType<typeof Settings>;

export default Settings;
