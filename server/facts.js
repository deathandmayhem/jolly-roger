Roles.registerAction('facts.view', true);

Facts.setUserIdFilter((uid) => Roles.userHasPermission(uid, 'facts.view'));
