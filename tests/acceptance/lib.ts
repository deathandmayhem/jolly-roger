import { Meteor } from 'meteor/meteor';
import { Migrations } from 'meteor/percolate:migrations';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

configure({ adapter: new Adapter() });

if (Meteor.isServer) {
  Meteor.methods({
    'test.resetDatabase': function () {
      resetDatabase();
      Migrations.migrateTo('latest');
    },
  });
}
