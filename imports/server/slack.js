import { HTTP } from 'meteor/http';
import Ansible from '../ansible.js';

function postSlackMessage(message, channel, username) {
  const config = ServiceConfiguration.configurations.findOne({ service: 'slack' });
  if (!config) {
    Ansible.log('Not notifying Slack because Slack is not configured');
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
        link_names: 1, // jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
        text: message,
      },
    });
  } catch (e) {
    ex = e;
  }

  if (ex || result.statusCode >= 400) {
    Ansible.log('Problem posting to Slack', { ex, content: result.content });
  }
}

// eslint-disable-next-line import/prefer-default-export
export { postSlackMessage };
