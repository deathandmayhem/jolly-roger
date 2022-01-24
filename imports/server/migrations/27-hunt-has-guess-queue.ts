import { Migrations } from 'meteor/percolate:migrations';
import Hunts from '../../lib/models/Hunts';

Migrations.add({
  version: 27,
  name: 'Add hasGuessQueue to Hunt model for whether to have a guess queue or direct answers',
  up() {
    Hunts.find({}).forEach((hunt) => {
      Hunts.update(hunt._id, {
        $set: { hasGuessQueue: true },
      }, <any>{
        validate: false,
      });
    });
  },
});
