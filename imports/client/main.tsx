import { Meteor } from 'meteor/meteor';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { createGlobalStyle } from 'styled-components';
import Routes from './components/Routes';

// As recommended by Paul Irish: https://www.paulirish.com/2012/box-sizing-border-box-ftw/
const Reset = createGlobalStyle`
  html {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  *, *:before, *:after {
    box-sizing: inherit;
  }
`;

Meteor.startup(() => {
  const container = document.createElement('div');
  container.className = 'jolly-roger';
  document.body.appendChild(container);
  ReactDOM.render(
    <>
      <Reset />
      <BrowserRouter>
        <Routes />
      </BrowserRouter>
    </>,
    container
  );
});
