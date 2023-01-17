import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import isAdmin from '../isAdmin';
import { SettingType } from '../schemas/Setting';
import Base, { FindOptions } from './Base';
import MeteorUsers from './MeteorUsers';

const Settings = new Base<SettingType>('settings');

// Publish manually instead of through Base.publish because we need to block the
// query for non-admins, and Base.publish doesn't support permission checks.
if (Meteor.isServer) {
  Meteor.publish(
    'mongo.settings',
    function (q: Mongo.Selector<SettingType> = {}, opts: FindOptions = {}) {
      check(q, Object);
      check(opts, {
        fields: Match.Maybe(Object),
        sort: Match.Maybe(Object),
        skip: Match.Maybe(Number),
        limit: Match.Maybe(Number),
      });

      // Only allow admins to pull down Settings.
      if (!this.userId || !isAdmin(MeteorUsers.findOne(this.userId))) {
        return [];
      }

      return Settings.find(q, opts);
    }
  );
}
export default Settings;
