const {
  Router,
  Route,
  Redirect,
} = ReactRouter;

const history = ReactRouter.history.useQueries(ReactRouter.history.createHistory)();

class Routes extends React.Component {
  render() {
    return (
      <Router history={history}>
        <Redirect from="/" to="hunts"/>
        <Route path="hunts" component={HuntList}/>
      </Router>
    );
  }
}

$(document).ready(function() {
  ReactDOM.render(<Routes/>, document.getElementById('jr-container'));
});
