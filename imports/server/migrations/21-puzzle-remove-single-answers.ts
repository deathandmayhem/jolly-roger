import Puzzles from '../../lib/models/Puzzles';
import Migrations from './Migrations';

Migrations.add({
  version: 21,
  name: 'Remove older answer field from puzzles',
  up() {
    await Puzzles.updateAsync({}, {
      $unset: {
        answer: 1,
      },
    }, <any>{
      validate: false,
      getAutoValues: false,
    });
  },
});
