import { z } from "zod";
import { nonEmptyString } from "./customTypes";

export const GoogleDocumentValueSchema = z.object({
  type: z.enum(["spreadsheet", "document", "drawing"]),
  id: nonEmptyString,
  folder: nonEmptyString.optional(),
});

export const GoogleProviderSchema = z.object({
  provider: z.literal("google"),
  value: GoogleDocumentValueSchema,
});