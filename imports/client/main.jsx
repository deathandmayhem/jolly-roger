import { Meteor } from 'meteor/meteor';
import React from 'react';
import { Routes } from '/imports/client/components/Routes.jsx';

Meteor.startup(async () => {
  const ReactDOM = await import('react-dom');
  const container = document.createElement('div');
  document.body.appendChild(container);
  ReactDOM.render(<Routes />, container);
});
