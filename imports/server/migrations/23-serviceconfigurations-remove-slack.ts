import { ServiceConfiguration } from "meteor/service-configuration";

import Migrations from "./Migrations";

Migrations.add({
  version: 23,
  name: "Remove Slack from ServiceConfigurations",
  async up() {
    await ServiceConfiguration.configurations.removeAsync({ service: "slack" });
  },
});
