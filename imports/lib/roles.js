import { Roles } from 'meteor/nicolaslopezj:roles';

Roles.registerAction('gdrive.credential', true);
Roles.registerAction('google.configureOAuth', true);
Roles.registerAction('hunt.join', true);
Roles.registerAction('slack.configureClient', true);
Roles.registerAction('users.makeOperator', true);

const InactiveOperatorRole = new Roles.Role('inactiveOperator');
InactiveOperatorRole.allow('users.makeOperator', () => true);
