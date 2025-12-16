import express from "express";
import authenticator from "./api/authenticator";
import hunts from "./api/resources/hunts";
import users from "./api/resources/users";

const api = express();
api.use(authenticator);
api.use("/users", users);
api.use("/hunts", hunts);

export default api;
