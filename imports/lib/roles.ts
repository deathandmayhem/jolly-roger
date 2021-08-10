import { Roles } from 'meteor/nicolaslopezj:roles';

Roles.registerAction('gdrive.credential', true);
Roles.registerAction('google.configureOAuth', true);
Roles.registerAction('discord.configureOAuth', true);
Roles.registerAction('discord.configureBot', true);
Roles.registerAction('discord.useBotAPIs', true);
Roles.registerAction('discord.updateRole', true);
Roles.registerAction('webrtc.configureServers', true);
Roles.registerAction('email.configureBranding', true);
Roles.registerAction('setTeamName', true);
Roles.registerAction('asset.upload', true);
