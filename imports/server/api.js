import express from 'express';
import authenticator from '/imports/server/api/authenticator.js';
import users from '/imports/server/api/resources/users.js';

const app = express();
app.use(authenticator);
app.use('/users', users);

export default app;
