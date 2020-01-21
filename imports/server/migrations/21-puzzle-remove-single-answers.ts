import { Migrations } from 'meteor/percolate:migrations';
import Puzzles from '../../lib/models/puzzles';

Migrations.add({
  version: 21,
  name: 'Remove older answer field from puzzles',
  up() {
    Puzzles.update({}, {
      $unset: {
        answer: 1,
      },
    }, <any>{
      validate: false,
      getAutoValues: false,
    });
  },
});
