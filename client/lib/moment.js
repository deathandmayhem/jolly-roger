import moment from 'moment';

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
