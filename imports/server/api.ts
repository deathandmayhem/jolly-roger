import express from 'express';
import authenticator from './api/authenticator';
import users from './api/resources/users';

const app = express();
app.use(authenticator);
app.use('/users', users);

export default app;
