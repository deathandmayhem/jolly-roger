Roles.registerAction('gdrive.credential', true);
Roles.registerAction('hunt.join', true);
Roles.registerAction('users.makeOperator', true);

const InactiveOperatorRole = new Roles.Role('inactiveOperator');
InactiveOperatorRole.allow('users.makeOperator', () => true);
