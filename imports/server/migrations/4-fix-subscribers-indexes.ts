import Subscribers from '../models/Subscribers';
import Migrations from './Migrations';

Migrations.add({
  version: 4,
  name: 'Fix indexes for subscriber tracking',
  up() {
    await Subscribers.dropIndexAsync('name_1');
    await Subscribers.createIndexAsync({ 'context.hunt': 1 });
  },
});
