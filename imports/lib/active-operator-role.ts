import { Roles } from 'meteor/nicolaslopezj:roles';

const ActiveOperatorRole = new Roles.Role('operator');
ActiveOperatorRole.allow('discord.useBotAPIs', () => true);

export default ActiveOperatorRole;
