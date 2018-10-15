import express from 'express';
import authenticator from './api/authenticator.js';
import users from './api/resources/users.js';

const app = express();
app.use(authenticator);
app.use('/users', users);

export default app;
