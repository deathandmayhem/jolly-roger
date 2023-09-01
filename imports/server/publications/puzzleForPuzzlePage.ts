import { check } from 'meteor/check';
import Bookmarks from '../../lib/models/Bookmarks';
import Documents from '../../lib/models/Documents';
import Guesses from '../../lib/models/Guesses';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import Tags from '../../lib/models/Tags';
import puzzleForPuzzlePage from '../../lib/publications/puzzleForPuzzlePage';
import PublicationMerger from '../PublicationMerger';
import publishJoinedQuery from '../publishJoinedQuery';
import definePublication from './definePublication';
import publishCursor from './publishCursor';

definePublication(puzzleForPuzzlePage, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      huntId: String,
    });
    return arg;
  },

  async run({ puzzleId, huntId }) {
    if (!this.userId) {
      return [];
    }

    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user?.hunts?.includes(huntId)) {
      return [];
    }

    const merger = new PublicationMerger(this);

    publishCursor(
      merger.newSub(),
      Documents.name,
      Documents.find({ hunt: huntId, puzzle: puzzleId })
    );
    publishCursor(merger.newSub(), Guesses.name, Guesses.find({ hunt: huntId, puzzle: puzzleId }));
    publishCursor(merger.newSub(), Tags.name, Tags.find({ hunt: huntId }));
    publishCursor(merger.newSub(), Puzzles.name, Puzzles.find({ hunt: huntId }));
    publishCursor(merger.newSub(), Bookmarks.name, Bookmarks.find({
      hunt: huntId,
      user: this.userId,
    }));

    // Also publish this puzzle, even if it's deleted, and its replacement
    publishJoinedQuery(merger.newSub(), {
      model: Puzzles,
      allowDeleted: true,
      foreignKeys: [{
        field: 'replacedBy',
        join: {
          model: Puzzles,
          allowDeleted: true,
        },
      }],
    }, { _id: puzzleId, hunt: huntId });

    this.ready();
    return undefined;
  },
});
