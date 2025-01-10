import express from "express";
import authenticator from "./api/authenticator";
import updatePuzzleNote from "./api/resources/updatePuzzleNote";
import users from "./api/resources/users";

const api = express();

const publicApi = express.Router();
publicApi.use("/updatePuzzleNote", updatePuzzleNote);

api.use(publicApi);
api.use(authenticator);
api.use("/users", users);

export default api;
