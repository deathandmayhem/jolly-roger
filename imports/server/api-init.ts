import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import api from "./api";

WebApp.connectHandlers.use("/api", Meteor.bindEnvironment(api));
