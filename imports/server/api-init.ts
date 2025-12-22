import { WebApp } from "meteor/webapp";
import api from "./api";

WebApp.handlers.use("/api", api);
