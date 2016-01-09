Migrations.add({
  version: 1,
  name: 'Add basic indexes to collections',
  up() {
    Models.Announcements._ensureIndex({deleted: 1, hunt: 1, createdAt: -1});
    Models.ChatMessages._ensureIndex({puzzleId: 1, timestamp: -1});
    Models.Guesses._ensureIndex({deleted: 1, hunt: 1, puzzle: 1});
    Models.Profiles._ensureIndex({deleted: 1, displayName: 1});
    Models.Puzzles._ensureIndex({deleted: 1, hunt: 1});
    Models.Tags._ensureIndex({deleted: 1, hunt: 1});
  },
});
