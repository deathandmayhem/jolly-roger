import express from 'express';
import authenticator from './api/authenticator';
import users from './api/resources/users';

const api = express();
api.use(authenticator);
api.use('/users', users);

export default api;
