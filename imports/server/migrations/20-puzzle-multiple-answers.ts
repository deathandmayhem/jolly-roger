import { Migrations } from 'meteor/percolate:migrations';
import Puzzles from '../../lib/models/puzzles';

Migrations.add({
  version: 20,
  name: 'Backfill multiple answer support onto puzzles',
  up() {
    Puzzles.find().forEach((p: any) => {
      if (p.answers) return; // already migrated

      const answers = [];
      if (p.answer) {
        answers.push(p.answer);
      }

      Puzzles.update(p._id, {
        $set: {
          expectedAnswerCount: 1,
          answers,
        },
      }, <any>{
        validate: false,
        getAutoValues: false,
      });
    });
  },
});
