import { Meteor } from 'meteor/meteor';
import React from 'react';
import ReactDOM from 'react-dom';
import Routes from './components/Routes.jsx';

Meteor.startup(() => {
  const container = document.createElement('div');
  container.className = 'jolly-roger';
  document.body.appendChild(container);
  ReactDOM.render(<Routes />, container);
});
