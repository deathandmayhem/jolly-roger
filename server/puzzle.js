import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { _ } from 'meteor/underscore';
import Ansible from '/imports/ansible.js';
import { ensureDocument, renameDocument } from '/imports/server/gdrive.js';
// TODO: gdrive, globalHooks

function getOrCreateTagByName(huntId, name) {
  const existingTag = Models.Tags.findOne({ hunt: huntId, name });
  if (existingTag) {
    return existingTag;
  }

  Ansible.log('Creating a new tag', { hunt: huntId, name });
  const newTagId = Models.Tags.insert({ hunt: huntId, name });
  return {
    _id: newTagId,
    hunt: huntId,
    name,
  };
}

Meteor.methods({
  createPuzzle(puzzle) {
    check(this.userId, String);
    // Note: tag names, not tag IDs. We don't need to validate other
    // fields because SimpleSchema will validate the rest
    //
    // eslint-disable-next-line new-cap
    check(puzzle, Match.ObjectIncluding({ hunt: String, tags: [String] }));

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
    const puzzleId = Models.Puzzles.insert(_.extend({}, puzzle, { tags: tagIds }));

    // TODO: run any puzzle-creation hooks, like creating a Slack channel, or creating a default
    // document attachment.
    // The Slack hook should add a Schemas.ChatMetadata with the appropriate slackChannel from the
    // response.
    // The websocket listening for Slack messages should subscribe to that channel.
    // For documents, we should have a documents collection, with a puzzleId, type, and
    // type-specific data.
    Meteor.defer(Meteor.bindEnvironment(() => {
      globalHooks.runPuzzleCreatedHooks(puzzleId, this.userId);
    }));

    return puzzleId;
  },

  updatePuzzle(puzzleId, puzzle) {
    check(this.userId, String);
    check(puzzleId, String);
    // Note: tags names, not tag IDs
    check(puzzle, Match.ObjectIncluding({ tags: [String] })); // eslint-disable-line new-cap

    Roles.checkPermission(this.userId, 'mongo.puzzles.update');

    const oldPuzzle = Models.Puzzles.findOne(puzzleId);
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
    Models.Puzzles.update(
      puzzleId,
      { $set: _.extend({}, puzzle, { tags: tagIds }) },
    );

    if (oldPuzzle.title !== puzzle.title) {
      Meteor.defer(Meteor.bindEnvironment(() => {
        const docId = ensureDocument(_.extend({ _id: puzzleId }, puzzle), this.userId);
        if (docId) {
          const doc = Models.Documents.findOne(docId);
          renameDocument(doc.value.id, `${puzzle.title}: Death and Mayhem`);
        }
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
    const hunt = Models.Puzzles.findOne({
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
    Models.Puzzles.update({
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
    Models.Puzzles.update({
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

    const tag = Models.Tags.findOne(tagId);
    if (tag) {
      Ansible.log('Renaming tag', { tag: tagId, newName });
      Models.Tags.update({
        _id: tagId,
      }, {
        $set: {
          name: newName,
        },
      });
    }
  },

  ensureDocument(puzzleId) {
    check(puzzleId, String);

    if (!this.userId && this.connection) {
      throw new Meteor.Error(401, 'You are not logged in');
    }

    const user = Meteor.users.findOne(this.userId);
    const puzzle = Models.Puzzles.findOne(puzzleId);
    if (!puzzle || !_.contains(user.hunts, puzzle.hunt)) {
      throw new Meteor.Error(404, 'Unknown puzzle');
    }

    this.unblock();
    return ensureDocument(puzzle, this.userId);
  },
});
