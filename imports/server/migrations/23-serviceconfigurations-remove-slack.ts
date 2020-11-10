import { Migrations } from 'meteor/percolate:migrations';
import { ServiceConfiguration } from 'meteor/service-configuration';

Migrations.add({
  version: 23,
  name: 'Remove Slack from ServiceConfigurations',
  up() {
    ServiceConfiguration.configurations.remove({ service: 'slack' });
  },
});
