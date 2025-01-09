import express from "express";
import authenticator from "./api/authenticator";
import updatePuzzleNote from "./api/resources/updatePuzzleNote";
import users from "./api/resources/users";

const api = express();
api.use(authenticator);
api.use("/users", users);
api.use("/updatePuzzleNote", updatePuzzleNote);

export default api;
