import { Meteor } from 'meteor/meteor';

Meteor.startup(async () => {
  const moment = await import('moment');
  moment.updateLocale('en', {
    calendar: {
      lastDay: 'dddd [at] LT',
      sameDay: '[Today at] LT',
      nextDay: '[Next] dddd [at] LT',
      lastWeek: 'dddd [at] LT',
      nextWeek: '[Next] dddd [at] LT',
      sameElse: 'L [at] LT',
    },
  });
});
