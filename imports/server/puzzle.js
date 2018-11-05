import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import Ansible from '../ansible.js';
import { ensureDocument, renameDocument, grantPermission } from './gdrive.js';
import DriveClient from './gdrive-client-refresher.js';
import Flags from '../flags.js';
import DocumentPermissions from '../lib/models/document_permissions.js';
import Profiles from '../lib/models/profiles.js';
import Puzzles from '../lib/models/puzzles.js';
import Tags from '../lib/models/tags.js';
import GlobalHooks from './global-hooks.js';

function getOrCreateTagByName(huntId, name) {
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
  createPuzzle(puzzle, docType) {
    check(this.userId, String);
    // Note: tag names, not tag IDs. We don't need to validate other
    // fields because SimpleSchema will validate the rest
    check(puzzle, Match.ObjectIncluding({ hunt: String, tags: [String] }));
    check(docType, String);

    Roles.checkPermission(this.userId, 'mongo.puzzles.insert');

    // Look up each tag by name and map them to tag IDs.
    const tagIds = puzzle.tags.map((tagName) => {
      return getOrCreateTagByName(puzzle.hunt, tagName)._id;
    });

    Ansible.log('Creating a new puzzle', {
      hunt: puzzle.hunt,
      title: puzzle.title,
      user: this.userId,
    });

    const fullPuzzle = _.extend({}, puzzle, { _id: Random.id(), tags: tagIds });

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
      GlobalHooks.runPuzzleCreatedHooks(fullPuzzle._id, this.userId);
    }));

    return fullPuzzle._id;
  },

  updatePuzzle(puzzleId, puzzle) {
    check(this.userId, String);
    check(puzzleId, String);
    // Note: tags names, not tag IDs
    check(puzzle, Match.ObjectIncluding({ tags: [String] }));

    Roles.checkPermission(this.userId, 'mongo.puzzles.update');

    const oldPuzzle = Puzzles.findOne(puzzleId);
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
      user: this.userId,
    });
    Puzzles.update(
      puzzleId,
      { $set: _.extend({}, puzzle, { tags: tagIds }) },
    );

    if (oldPuzzle.title !== puzzle.title) {
      Meteor.defer(Meteor.bindEnvironment(() => {
        const doc = ensureDocument(_.extend({ _id: puzzleId }, puzzle));
        renameDocument(doc.value.id, `${puzzle.title}: Death and Mayhem`);
      }));
    }
  },

  addTagToPuzzle(puzzleId, newTagName) {
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

  removeTagFromPuzzle(puzzleId, tagId) {
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

  renameTag(tagId, newName) {
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

  ensureDocumentAndPermissions(puzzleId) {
    check(this.userId, String);
    check(puzzleId, String);

    const user = Meteor.users.findOne(this.userId);
    const puzzle = Puzzles.findOne(puzzleId);
    if (!puzzle || !_.contains(user.hunts, puzzle.hunt)) {
      throw new Meteor.Error(404, 'Unknown puzzle');
    }

    this.unblock();

    const doc = ensureDocument(puzzle);

    if (Flags.active('disable.google')) {
      return;
    }

    if (Flags.active('disable.gdrive_permissions')) {
      return;
    }

    const profile = Profiles.findOne(this.userId);
    if (!profile.googleAccount) {
      return;
    }

    const perm = {
      document: doc._id,
      user: this.userId,
      googleAccount: profile.googleAccount,
    };
    if (DocumentPermissions.findOne(perm, { fields: { _id: 1 } })) {
      return;
    }

    Ansible.log('Granting permissions to document', perm);
    grantPermission(doc.value.id, profile.googleAccount, 'writer');

    try {
      DocumentPermissions.insert(perm);
    } catch (e) {
      // 11000 is a duplicate key error
      if (e.name !== 'MongoError' || e.code !== 11000) {
        throw e;
      }
    }
  },
});
