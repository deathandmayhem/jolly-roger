import { Meteor } from 'meteor/meteor';
import React from 'react';
import ReactDOM from 'react-dom';
import Routes from './components/Routes.jsx';

Meteor.startup(() => {
  // Set up some meta elements previously from head.html
  // <meta charset="utf-8">
  const metaCharset = document.createElement('meta');
  metaCharset.setAttribute('charset', 'utf-8');
  // <meta http-equiv="X-UA-Compatible" content="IE=edge">
  const metaIEEdge = document.createElement('meta');
  metaIEEdge.setAttribute('http-equiv', 'X-UA-Compatible');
  metaIEEdge.setAttribute('content', 'IE=edge');
  // <meta name="viewport" content="width=device-width, initial-scale=1">
  const metaViewport = document.createElement('meta');
  metaViewport.setAttribute('name', 'viewport');
  metaViewport.setAttribute('content', 'width=device-width, initial-scale=1');
  document.head.appendChild(metaCharset);
  document.head.appendChild(metaIEEdge);
  document.head.appendChild(metaViewport);

  // Add a div under <body> and mount all the React stuff upon it.
  const container = document.createElement('div');
  document.body.appendChild(container);
  ReactDOM.render(<Routes />, container);
});
