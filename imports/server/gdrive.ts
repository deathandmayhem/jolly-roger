import { Meteor } from "meteor/meteor";
import type { drive_v3 as drive } from "@googleapis/drive";
import Flags from "../Flags";
import Logger from "../Logger";
import type { GdriveMimeTypesType } from "../lib/GdriveMimeTypes";
import GdriveMimeTypes from "../lib/GdriveMimeTypes";
import Documents from "../lib/models/Documents";
import FolderPermissions from "../lib/models/FolderPermissions";
import Hunts from "../lib/models/Hunts";
import type { SettingType } from "../lib/models/Settings";
import Settings from "../lib/models/Settings";
import getTeamName from "./getTeamName";
import GoogleClient from "./googleClientRefresher";
import ignoringDuplicateKeyErrors from "./ignoringDuplicateKeyErrors";
import HuntFolders from "./models/HuntFolders";
import withLock from "./withLock";
import { PuzzleType } from "../lib/models/Puzzles";
import { createdTimestamp } from "../lib/models/customTypes";

async function checkClientOk() {
  if (!GoogleClient.ready()) {
    throw new Meteor.Error(500, "Google Drive client is not configured.");
  }

  if (await Flags.activeAsync("disable.google")) {
    throw new Meteor.Error(500, "Google integration is disabled.");
  }
}

async function createFolder(name: string, parentId?: string) {
  await checkClientOk();
  if (!GoogleClient.drive)
    throw new Meteor.Error(500, "Google integration is disabled");

  const mimeType = "application/vnd.google-apps.folder";
  const parents = parentId ? [parentId] : undefined;

  const folder = await GoogleClient.drive.files.create({
    requestBody: {
      name,
      mimeType,
      parents,
    },
  });

  return folder.data.id!;
}

async function createDocument(
  name: string,
  type: GdriveMimeTypesType,
  parentId?: string,
) {
  if (!Object.prototype.hasOwnProperty.call(GdriveMimeTypes, type)) {
    throw new Meteor.Error(400, `Invalid document type ${type}`);
  }
  await checkClientOk();
  if (!GoogleClient.drive)
    throw new Meteor.Error(500, "Google integration is disabled");

  const template = (await Settings.findOneAsync({
    name: `gdrive.template.${type}` as any,
  })) as
    | undefined
    | (SettingType &
        (
          | { name: "gdrive.template.document" }
          | { name: "gdrive.template.spreadsheet" }
        ));
  const mimeType = GdriveMimeTypes[type];
  const parents = parentId ? [parentId] : undefined;

  const file = await (template
    ? GoogleClient.drive.files.copy({
        fileId: template.value.id,
        requestBody: { name, mimeType, parents },
      })
    : GoogleClient.drive.files.create({
        requestBody: { name, mimeType, parents },
      }));

  const fileId = file.data.id!;

  await GoogleClient.drive.permissions.create({
    fileId,
    requestBody: { role: "writer", type: "anyone" },
  });
  return fileId;
}

async function deleteDocument(id: string) {
  await checkClientOk();
  if (!GoogleClient.drive)
    throw new Meteor.Error(500, "Google integration is disabled");

  await GoogleClient.drive.files.delete({
    fileId: id,
  });
}

export async function moveDocument(id: string, newParentId: string) {
  await checkClientOk();
  if (!GoogleClient.drive)
    throw new Meteor.Error(500, "Google integration is disabled");

  const parents =
    (
      await GoogleClient.drive.files.get({
        fileId: id,
        fields: "parents",
      })
    ).data.parents ?? [];

  await GoogleClient.drive.files.update({
    fileId: id,
    addParents: newParentId,
    removeParents: parents.join(","),
  });
}

export async function huntFolderName(huntName: string) {
  return `${huntName}: ${await getTeamName()}`;
}

export async function puzzleDocumentName(puzzleTitle: string) {
  return `${puzzleTitle}: ${await getTeamName()}`;
}

export async function renameDocument(id: string, name: string) {
  await checkClientOk();
  if (!GoogleClient.drive) return;
  // It's unclear if this can ever return an error
  await GoogleClient.drive.files.update({
    fileId: id,
    requestBody: { name },
  });
}

export async function grantPermission(
  id: string,
  email: string,
  permission: string,
) {
  await checkClientOk();
  if (!GoogleClient.drive) return;
  await GoogleClient.drive.permissions.create({
    fileId: id,
    sendNotificationEmail: false,
    requestBody: {
      type: "user",
      emailAddress: email,
      role: permission,
    },
  });
}

export async function makeReadOnly(fileId: string) {
  await checkClientOk();
  const client = GoogleClient.drive;
  if (!client) return;

  // Fetch all permissions so we can delete them
  const permissions = [] as NonNullable<
    drive.Schema$PermissionList["permissions"]
  >;
  let token: string | undefined;
  for (;;) {
    const response = await client.permissions.list({
      fileId,
      pageToken: token,
    });
    const page = response.data;
    if (page.permissions) {
      permissions.push(...page.permissions);
    }
    const nextToken = response.data.nextPageToken;
    if (!nextToken) break;
    token = nextToken;
  }

  // Leave everyone with read-only access
  await client.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  // Delete any editor permissions
  for (const permission of permissions) {
    if (permission.id && permission.role === "writer") {
      await client.permissions.delete({
        fileId,
        permissionId: permission.id,
      });
    }
  }
}

export async function makeReadWrite(fileId: string) {
  await checkClientOk();
  if (!GoogleClient.drive) return;

  await GoogleClient.drive.permissions.create({
    fileId,
    requestBody: { role: "writer", type: "anyone" },
  });
}

export async function ensureHuntFolder(hunt: { _id: string; name: string }) {
  let folder = await HuntFolders.findOneAsync(hunt._id);
  if (!folder) {
    await checkClientOk();

    folder = await withLock(`hunt:${hunt._id}:folder`, async () => {
      let lockedFolder = await HuntFolders.findOneAsync(hunt._id);
      if (!lockedFolder) {
        Logger.info("Creating missing folder for hunt", {
          huntId: hunt._id,
        });

        const root = (await Settings.findOneAsync({ name: "gdrive.root" })) as
          | undefined
          | (SettingType & { name: "gdrive.root" });
        const folderId = await createFolder(
          await huntFolderName(hunt.name),
          root?.value.id,
        );
        const huntFolderId = await HuntFolders.insertAsync({
          _id: hunt._id,
          folder: folderId,
        });
        lockedFolder = (await HuntFolders.findOneAsync(huntFolderId))!;
      }
      return lockedFolder;
    });
  }

  return folder.folder;
}

export async function ensureHuntFolderPermission(
  huntId: string,
  userId: string,
  googleAccount: string,
) {
  const hunt = await Hunts.findOneAllowingDeletedAsync(huntId);
  if (!hunt) return;

  const folder = await ensureHuntFolder(hunt);

  const perm = {
    folder,
    user: userId,
    googleAccount,
    permissionLevel: "commenter" as const,
  };
  if (await FolderPermissions.findOneAsync(perm)) {
    return;
  }

  Logger.info("Granting permissions to folder", perm);
  await grantPermission(folder, googleAccount, "commenter");
  await ignoringDuplicateKeyErrors(async () => {
    await FolderPermissions.insertAsync(perm);
  });
}

export async function ensureDocument(
  puzzle:
    | {
        _id: string;
        title: string;
        hunt: string;
      }
    | PuzzleType,
  type: GdriveMimeTypesType = "spreadsheet",
  additionalDocument = false,
) {
  const hunt = await Hunts.findOneAllowingDeletedAsync(puzzle.hunt);
  const folderId = hunt ? await ensureHuntFolder(hunt) : undefined;

  let doc = await Documents.findOneAsync({ puzzle: puzzle._id });
  if (!doc || (additionalDocument && doc.value.type !== type)) {
    await checkClientOk();

    await withLock(`puzzle:${puzzle._id}:documents`, async () => {
      doc = await Documents.findOneAsync({ puzzle: puzzle._id });
      if (!doc || (additionalDocument && doc.value.type !== type)) {
        Logger.info("Creating missing document for puzzle", {
          puzzle: puzzle._id,
        });

        const googleDocId = await createDocument(
          await puzzleDocumentName(puzzle.title),
          type,
          folderId,
        );
        const newDoc = {
          hunt: puzzle.hunt,
          puzzle: puzzle._id,
          provider: "google" as const,
          value: { type, id: googleDocId, folder: folderId },
        };
        const docId = await Documents.insertAsync(newDoc);
        doc = await Documents.findOneAsync(docId, {
          sort: { createdTimestamp: -1 },
        })!;
      }
    });
  }

  if (doc && folderId && doc.value.folder !== folderId) {
    await moveDocument(doc.value.id, folderId);
    await Documents.updateAsync(doc._id, {
      $set: { "value.folder": folderId },
    });
    doc = (await Documents.findOneAsync(doc._id))!;
  }

  return doc!;
}

export async function deleteUnusedDocument(puzzle: { _id: string }) {
  const doc = await Documents.findOneAsync({ puzzle: puzzle._id });
  if (!doc) {
    return;
  }

  await checkClientOk();
  await withLock(`puzzle:${puzzle._id}:documents`, async () => {
    await deleteDocument(doc.value.id);
    await Documents.removeAsync(doc._id);
  });
}
