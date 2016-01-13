function getOrCreateTagByName(huntId, name) {
  let existingTag = Models.Tags.findOne({hunt: huntId, name: name});
  if (existingTag) {
    return existingTag;
  }

  Ansible.log('Creating a new tag', {hunt: huntId, name});
  let newTagId = Models.Tags.insert({hunt: huntId, name: name});
  return {
    _id: newTagId,
    hunt: huntId,
    name: name,
  };
}

function createDocument(name, mimeType) {
  const template = Models.Settings.findOne({name: 'gdrive.template'});

  let file;
  if (template) {
    file = Meteor.wrapAsync(gdrive.files.copy)({
      fileId: template.value.id,
      resource: {name, mimeType},
    });
  } else {
    file = Meteor.wrapAsync(gdrive.files.create)({
      resource: {name, mimeType},
    });
  }

  const fileId = file.id;

  Meteor.wrapAsync(gdrive.permissions.create)({
    fileId,
    resource: {role: 'writer', type: 'anyone'},
  });
  return fileId;
}

Meteor.methods({
  createPuzzle(huntId, title, url, tags) {
    check(this.userId, String);
    check(huntId, String);
    check(title, String);
    check(url, String);
    check(tags, [String]); // Note: tag names, not tag IDs.

    Roles.checkPermission(this.userId, 'mongo.puzzles.insert');

    // Look up each tag by name and map them to tag IDs.
    tagIds = tags.map((tagName) => { return getOrCreateTagByName(huntId, tagName)._id; });

    Ansible.log('Creating a new puzzle', {hunt: huntId, title, user: this.userId});
    const puzzle = Models.Puzzles.insert({
      hunt: huntId,
      tags: tagIds,
      title: title,
      url: url,
    });

    // TODO: run any puzzle-creation hooks, like creating a Slack channel, or creating a default
    // document attachment.
    // The Slack hook should add a Schemas.ChatMetadata with the appropriate slackChannel from the
    // response.
    // The websocket listening for Slack messages should subscribe to that channel.
    // For documents, we should have a documents collection, with a puzzleId, type, and
    // type-specific data.
    globalHooks.runPuzzleCreatedHooks(puzzle);

    return puzzle;
  },

  addTagToPuzzle(puzzleId, newTagName) {
    // addTagToPuzzle takes a tag name, rather than a tag ID,
    // so we can avoid doing two round-trips for tag creation.
    check(this.userId, String);
    check(puzzleId, String);
    check(newTagName, String);

    // Look up which hunt the specified puzzle is from.
    hunt = Models.Puzzles.findOne({
      _id: puzzleId,
    }, {
      fields: {
        hunt: 1,
      },
    });
    let huntId = hunt && hunt.hunt;
    if (!huntId) throw new Error('No puzzle known with id ' + puzzleId);
    let tagId = getOrCreateTagByName(huntId, newTagName)._id;

    Ansible.log('Tagging puzzle', {puzzle: puzzleId, tag: newTagName});
    let changes = Models.Puzzles.update({
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

    Ansible.log('Untagging puzzle', {puzzle: puzzleId, tag: tagId});
    Models.Puzzles.update({
      _id: puzzleId,
    }, {
      $pull: {
        tags: tagId,
      },
    });
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
    let doc = Models.Documents.findOne({puzzle: puzzleId});
    if (!doc) {
      Models.Locks.withLock(`puzzle:${puzzleId}:documents`, () => {
        doc = Models.Documents.findOne({puzzle: puzzleId});
        if (!doc) {
          Ansible.log('Creating missing document for puzzle', {puzzle: puzzleId, user: this.userId});

          try {
            docId = createDocument(`${puzzle.title}: Death and Mayhem`, 'application/vnd.google-apps.spreadsheet');
            doc = {
              hunt: puzzle.hunt,
              puzzle: puzzleId,
              type: 'google-spreadsheet',
              value: {id: docId},
            };
            doc._id = Models.Documents.insert(doc);
          } catch (e) {
            // Don't totally explode if document creation fails
            Ansible.log('Failed to create a document!', {e});
          }
        }
      });
    }

    return doc._id;
  },
});
