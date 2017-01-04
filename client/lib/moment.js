import moment from 'moment';

moment.updateLocale('en', {
    calendar : {
        lastDay : '[Yesterday at] LT',
        sameDay : '[Today at] LT',
        nextDay : '[Tomorrow at] LT',
        lastWeek : 'dddd [at] LT',
        nextWeek : '[Next] dddd [at] LT',
        sameElse : 'L'
    }
});