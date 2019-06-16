import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { _ } from 'meteor/underscore';
import * as logfmt from 'logfmt';
import Ansible from '../ansible';
import Hunts from '../lib/models/hunts';

type LoginInfo = {
  type: string,
  allowed: boolean,
  error?: Meteor.Error,
  user?: Meteor.User,
  connection: Meteor.Connection,
  methodName: string,
  methodArguments: any[],
};

const summaryFromLoginInfo = function (info: LoginInfo) {
  switch (info.methodName) {
    case 'login': {
      const email = info.methodArguments &&
        info.methodArguments[0] &&
        info.methodArguments[0].user &&
        info.methodArguments[0].user.email;
      return {
        msg: 'User logged in',
        email,
      };
    }
    case 'resetPassword':
      /* We can't tell if this is a reset or an enrollment, because the
         user object already reflects the changed state. Womp womp */
      return {
        msg: 'User reset password and logged in',
        email: info.user && info.user.emails && info.user.emails[0].address,
      };
    default:
      Ansible.warn('Received login hook from unknown method', { method: info.methodName });
      return {
        msg: 'User logged in by unknown method',
        email: info.user && info.user.emails && info.user.emails[0].address,
        method: info.methodName,
      };
  }
};

Accounts.onLogin((info: LoginInfo) => {
  if (!info.user || !info.user._id) throw new Meteor.Error(500, 'Something has gone horribly wrong');
  // Capture login time
  Meteor.users.update(info.user._id, { $set: { lastLogin: new Date() } });

  if (info.type === 'resume') {
    return;
  }

  const summary = _.extend(summaryFromLoginInfo(info), {
    user: info.user._id,
    ip: info.connection.clientAddress,
  });

  Ansible.log(summary.msg, _.omit(summary, 'msg'));
});

Accounts.onLoginFailure((info: LoginInfo) => {
  const email = info.methodArguments &&
    info.methodArguments[0] &&
    info.methodArguments[0].user &&
    info.methodArguments[0].user.email;
  const data = {
    user: info.user && info.user._id,
    email,
    ip: info.connection.clientAddress,
    error: info.error && info.error.reason,
  };
  // eslint-disable-next-line no-console
  console.log(`Failed login attempt: ${logfmt.stringify(data)}`);
});

Accounts.urls.enrollAccount = token => Meteor.absoluteUrl(`enroll/${token}`);
Accounts.urls.resetPassword = token => Meteor.absoluteUrl(`reset-password/${token}`);

Accounts.emailTemplates.from = 'above@mit.edu';
Accounts.emailTemplates.enrollAccount.subject = () => {
  return `[jolly-roger] You're invited to ${Accounts.emailTemplates.siteName}`;
};

Accounts.emailTemplates.enrollAccount.text = (user, url: string) => {
  const hunts = Hunts.find({ _id: { $in: (<Meteor.User>user).hunts } }).fetch();
  const email = user && user.emails && user.emails[0] && user.emails[0].address;
  const huntNames = _.pluck(hunts, 'name');
  const huntLists = _.chain(hunts)
    .pluck('mailingLists')
    .flatten()
    .uniq()
    .value();
  const huntExcerpt = 'Once you register your account, you\'ll also be signed up for these ' +
    'specific hunts:\n' +
    '\n' +
    `${huntNames.join(', ')}\n` +
    '\n';
  const listExcerpt = 'You\'ve also been put onto a handful of mailing lists for communication ' +
    'about these and future hunts:\n' +
    '\n' +
    `${huntLists.join(', ')}\n` +
    '\n';

  return 'Hiya!\n' +
    '\n' +
    'Someone on Death and Mayhem has invited you to join our internal team website and ' +
    `virtual headquarters, ${Accounts.emailTemplates.siteName}, so that you can join us for the ` +
    'MIT Mystery Hunt.\n' +
    '\n' +
    'To create your account, simply click the link below, fill out a few details for us, and ' +
    'click "Register".\n' +
    '\n' +
    `${url}\n` +
    '\n' +
    `${huntNames.length !== 0 ? huntExcerpt : ''}` +
    `${huntLists.length !== 0 ? listExcerpt : ''}` +
    'After you\'ve registered your account, you can keep it permanently. We\'ll use it if you ' +
    'hunt with us again.\n' +
    '\n' +
    'The site itself is under pretty active construction, so expect quite a few changes in the ' +
    'next few days, but let us know if you run into any major bugs at dfa-web@mit.edu.\n' +
    '\n' +
    'Happy Puzzling,\n' +
    '- The Jolly Roger Web Team\n' +
    '\n' +
    `This message was sent to ${email}`;
};
