Meteor.startup(() => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  ReactDOM.render(<Routes/>, container);
});
