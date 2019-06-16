import { HTTP } from 'meteor/http';
import { ServiceConfiguration } from 'meteor/service-configuration';
import Ansible from '../ansible';
import Flags from '../flags';

function postSlackMessage(message: string, channel: string, username: string): void {
  const config = ServiceConfiguration.configurations.findOne({ service: 'slack' });
  if (!config) {
    Ansible.log('Not notifying Slack because Slack is not configured');
    return;
  }

  if (Flags.active('disable.slack')) {
    Ansible.log('Not notifying Slack because disable.slack circuit breaker is active');
    return;
  }

  let result;
  let ex;
  try {
    result = HTTP.post('https://slack.com/api/chat.postMessage', {
      params: {
        token: config.secret,
        channel,
        username,
        link_names: '1', // jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
        text: message,
      },
    });
  } catch (e) {
    ex = e;
  }

  if (ex) {
    Ansible.log('Problem posting to Slack', { ex });
  } else if (result && result.statusCode && result.statusCode >= 400) {
    Ansible.log('Problem posting to Slack', { ex, content: result.content });
  }
}

// eslint-disable-next-line import/prefer-default-export
export { postSlackMessage };
