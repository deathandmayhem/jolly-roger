import Hunts from '../../lib/models/Hunts';
import Migrations from './Migrations';

Migrations.add({
  version: 27,
  name: 'Add hasGuessQueue to Hunt model for whether to have a guess queue or direct answers',
  up() {
    Hunts.find({}).forEach((hunt) => {
      await Hunts.updateAsync(hunt._id, {
        $set: { hasGuessQueue: true },
      }, <any>{
        validate: false,
      });
    });
  },
});
