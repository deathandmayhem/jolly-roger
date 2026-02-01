import { Meteor } from "meteor/meteor";
import Settings from "../lib/models/Settings";
import onExit from "./onExit";

export let serverLanguage = "en";
Meteor.startup(async () => {
  const observer = await Settings.find({
    name: "language",
  }).observeChangesAsync({
    added: (_id, doc) => {
      if (doc.name === "language") {
        serverLanguage = doc.value?.language ?? "en";
      }
    },
    changed: (_id, doc) => {
      if (doc.value && "language" in doc.value) {
        serverLanguage = doc.value.language ?? "en";
      }
    },
    removed: (_id) => {
      // fall back to en if there's no setting
      serverLanguage = "en";
    },
  });
  onExit(() => observer.stop());
});
