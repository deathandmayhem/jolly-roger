import { Meteor } from 'meteor/meteor';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import Routes from './components/Routes';

Meteor.startup(() => {
  const container = document.createElement('div');
  container.className = 'jolly-roger';
  document.body.appendChild(container);
  ReactDOM.render(
    <BrowserRouter>
      <Routes />
    </BrowserRouter>,
    container
  );
});
