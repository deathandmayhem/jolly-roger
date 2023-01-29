import Hunts from '../../lib/models/Hunts';
import huntsAll from '../../lib/publications/huntsAll';
import definePublication from './definePublication';

definePublication(huntsAll, {
  run() {
    if (!this.userId) {
      return [];
    }

    return Hunts.find();
  },
});
