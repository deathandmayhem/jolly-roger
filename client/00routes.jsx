const {
  Router,
  Route,
  Redirect,
} = ReactRouter;

const history = ReactRouter.history.useQueries(ReactRouter.history.createHistory)();

AuthenticatedRoutes = React.createClass({
  render() {
    return (
      <Router history={history}>
        <Redirect from="/" to="hunts"/>
        <Route path="hunts" component={HuntList}/>
      </Router>
    );
  },
});

$(document).ready(function() {
  ReactDOM.render(<AuthenticatedRoutes/>, document.getElementById('jr-container'));
});
