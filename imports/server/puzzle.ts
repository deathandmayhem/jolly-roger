import { Match, check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import Ansible from '../Ansible';
import Flags from '../Flags';
import Documents from '../lib/models/Documents';
import MeteorUsers from '../lib/models/MeteorUsers';
import Puzzles from '../lib/models/Puzzles';
import Tags from '../lib/models/Tags';
import { userMayWritePuzzlesForHunt } from '../lib/permission_stubs';
import GlobalHooks from './GlobalHooks';
import {
  ensureDocument,
  renameDocument,
  MimeTypes,
  ensureHuntFolderPermission,
  makeReadOnly,
  makeReadWrite,
} from './gdrive';
import DriveClient from './gdriveClientRefresher';
import getTeamName from './getTeamName';

function getOrCreateTagByName(huntId: string, name: string): {
  _id: string,
  hunt: string,
  name: string,
} {
  const existingTag = Tags.findOne({ hunt: huntId, name });
  if (existingTag) {
    return existingTag;
  }

  Ansible.log('Creating a new tag', { hunt: huntId, name });
  const newTagId = Tags.insert({ hunt: huntId, name });
  return {
    _id: newTagId,
    hunt: huntId,
    name,
  };
}

Meteor.methods({
  createPuzzle(puzzle: unknown, docType: unknown) {
    check(this.userId, String);
    check(puzzle, Match.ObjectIncluding({
      hunt: String,
      title: String,
      tags: [String],
      expectedAnswerCount: Number,
    }));
    check(docType, Match.OneOf(...Object.keys(MimeTypes) as (keyof typeof MimeTypes)[]));

    if (!userMayWritePuzzlesForHunt(this.userId, puzzle.hunt)) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not create new puzzles for hunt ${puzzle.hunt}`
      );
    }

    // Look up each tag by name and map them to tag IDs.
    const tagIds = puzzle.tags.map((tagName) => {
      return getOrCreateTagByName(puzzle.hunt, tagName)._id;
    });

    Ansible.log('Creating a new puzzle', {
      hunt: puzzle.hunt,
      title: puzzle.title,
      user: this.userId,
    });

    const fullPuzzle = {
      ...puzzle,
      _id: Random.id(),
      tags: [...new Set(tagIds)],
      answers: [],
    };

    // By creating the document before we save the puzzle, we make
    // sure nobody else has a chance to create a document with the
    // wrong config
    if (DriveClient.ready() && !Flags.active('disable.google')) {
      ensureDocument(fullPuzzle, docType);
    }

    Puzzles.insert(fullPuzzle);

    // Run any puzzle-creation hooks, like creating a default document
    // attachment or announcing the puzzle to Slack.
    Meteor.defer(Meteor.bindEnvironment(() => {
      GlobalHooks.runPuzzleCreatedHooks(fullPuzzle._id);
    }));

    return fullPuzzle._id;
  },

  updatePuzzle(puzzleId: unknown, puzzle: unknown) {
    check(this.userId, String);
    check(puzzleId, String);
    // Note: tags names, not tag IDs
    check(puzzle, Match.ObjectIncluding({
      hunt: String,
      title: String,
      tags: [String],
      expectedAnswerCount: Number,
    }));

    const oldPuzzle = Puzzles.findOneAllowingDeleted(puzzleId);
    if (!oldPuzzle) {
      throw new Meteor.Error(404, 'Unknown puzzle id');
    }
    if (!userMayWritePuzzlesForHunt(this.userId, oldPuzzle.hunt)) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not modify puzzles from hunt ${oldPuzzle.hunt}`
      );
    }
    if (oldPuzzle.hunt !== puzzle.hunt) {
      throw new Meteor.Error(400, 'Can not change the hunt of a puzzle. That would be weird');
    }

    // Look up each tag by name and map them to tag IDs.
    const tagIds = puzzle.tags.map((tagName) => {
      return getOrCreateTagByName(puzzle.hunt, tagName)._id;
    });

    Ansible.log('Updating a puzzle', {
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      title: puzzle.title,
      expectedAnswerCount: puzzle.expectedAnswerCount,
      user: this.userId,
    });
    Puzzles.update(
      puzzleId,
      { $set: { ...puzzle, tags: [...new Set(tagIds)] } },
    );

    if (oldPuzzle.title !== puzzle.title) {
      Meteor.defer(Meteor.bindEnvironment(() => {
        const doc = ensureDocument({ _id: puzzleId, ...puzzle });
        const teamName = getTeamName();
        renameDocument(doc.value.id, `${puzzle.title}: ${teamName}`);
      }));
    }
  },

  deletePuzzle(puzzleId: unknown, replacedBy: unknown) {
    check(this.userId, String);
    check(puzzleId, String);
    check(replacedBy, Match.Maybe(String));

    const puzzle = Puzzles.findOne(puzzleId);
    if (!puzzle) {
      throw new Meteor.Error(404, 'Unknown puzzle id');
    }
    if (!userMayWritePuzzlesForHunt(this.userId, puzzle.hunt)) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not modify puzzles from hunt ${puzzle.hunt}`
      );
    }

    if (replacedBy) {
      const replacedByPuzzle = Puzzles.findOne(replacedBy);
      if (!replacedByPuzzle || replacedByPuzzle.hunt !== puzzle.hunt) {
        throw new Meteor.Error(400, 'Invalid replacement puzzle');
      }
    }

    Puzzles.update(puzzleId, {
      $set: {
        replacedBy: replacedBy || undefined,
        deleted: true,
      },
    });

    if (Flags.active('disable.google')) {
      return;
    }

    if (Flags.active('disable.gdrive_permissions')) {
      return;
    }

    const document = Documents.findOne({ puzzle: puzzleId });

    if (document) {
      makeReadOnly(document.value.id);
    }
  },

  undeletePuzzle(puzzleId: unknown) {
    check(this.userId, String);
    check(puzzleId, String);

    const puzzle = Puzzles.findOneDeleted(puzzleId);
    if (!puzzle) {
      throw new Meteor.Error(404, 'Unknown puzzle id');
    }
    if (!userMayWritePuzzlesForHunt(this.userId, puzzle.hunt)) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not modify puzzles from hunt ${puzzle.hunt}`
      );
    }

    Puzzles.update(puzzleId, {
      $set: {
        deleted: false,
      },
      $unset: {
        replacedBy: 1,
      },
    });

    if (Flags.active('disable.google')) {
      return;
    }

    if (Flags.active('disable.gdrive_permissions')) {
      return;
    }

    const document = Documents.findOne({ puzzle: puzzleId });

    if (document) {
      makeReadWrite(document.value.id);
    }
  },

  addTagToPuzzle(puzzleId: unknown, newTagName: unknown) {
    // addTagToPuzzle takes a tag name, rather than a tag ID,
    // so we can avoid doing two round-trips for tag creation.
    check(this.userId, String);
    check(puzzleId, String);
    check(newTagName, String);

    // Look up which hunt the specified puzzle is from.
    const hunt = Puzzles.findOne({
      _id: puzzleId,
    }, {
      fields: {
        hunt: 1,
      },
    });
    const huntId = hunt && hunt.hunt;
    if (!huntId) throw new Error(`No puzzle known with id ${puzzleId}`);
    const tagId = getOrCreateTagByName(huntId, newTagName)._id;

    Ansible.log('Tagging puzzle', { puzzle: puzzleId, tag: newTagName });
    Puzzles.update({
      _id: puzzleId,
    }, {
      $addToSet: {
        tags: tagId,
      },
    });
  },

  removeTagFromPuzzle(puzzleId: unknown, tagId: unknown) {
    // Note that removeTagFromPuzzle takes a tagId rather than a tag name,
    // since the client should already know the tagId.
    check(this.userId, String);
    check(puzzleId, String);
    check(tagId, String);

    Ansible.log('Untagging puzzle', { puzzle: puzzleId, tag: tagId });
    Puzzles.update({
      _id: puzzleId,
    }, {
      $pull: {
        tags: tagId,
      },
    });
  },

  renameTag(tagId: unknown, newName: unknown) {
    check(this.userId, String);
    check(tagId, String);
    check(newName, String);

    const tag = Tags.findOne(tagId);
    if (tag) {
      Ansible.log('Renaming tag', { tag: tagId, newName });
      Tags.update({
        _id: tagId,
      }, {
        $set: {
          name: newName,
        },
      });
    }
  },

  ensureDocumentAndPermissions(puzzleId: unknown) {
    check(this.userId, String);
    check(puzzleId, String);

    const user = MeteorUsers.findOne(this.userId)!;
    const puzzle = Puzzles.findOne(puzzleId);
    if (!puzzle || !user.hunts?.includes(puzzle.hunt)) {
      throw new Meteor.Error(404, 'Unknown puzzle');
    }

    this.unblock();

    ensureDocument(puzzle);

    if (Flags.active('disable.google')) {
      return;
    }

    if (Flags.active('disable.gdrive_permissions')) {
      return;
    }

    if (user.profile?.googleAccount) {
      ensureHuntFolderPermission(puzzle.hunt, this.userId, user.profile.googleAccount);
    }
  },
});
