import { Meteor } from 'meteor/meteor';
import React from 'react';
import ReactDOM from 'react-dom';

Meteor.startup(() => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  ReactDOM.render(<Routes/>, container);
});
