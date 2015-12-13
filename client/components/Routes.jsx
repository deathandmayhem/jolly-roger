const {
  IndexRedirect,
  Route,
  Router,
} = ReactRouter;

const history = ReactRouter.history.useQueries(ReactRouter.history.createHistory)();

Routes = React.createClass({
  render() {
    return (
      <Router history={history}>
        {/* Authenticated routes */}
        <Route path="/" component={Authenticator} authenticated={true}>
          <IndexRedirect to="hunts"/>
          <Route path="" component={App}>
            <Route path="hunts" component={HuntList}/>
            <Route path="users">
              <Route path="invite" component={UserInvite}/>
            </Route>
          </Route>
        </Route>
        {/* Unauthenticated routes */}
        <Route path="/" component={Authenticator} authenticated={false}>
          <Route path="login" component={AccountsForm}/>
          <Route path="reset-password/:token" component={AccountsForm} state="resetPwd"/>
          <Route path="enroll/:token" component={AccountsForm} state="enrollAccount"/>
        </Route>
        {/* Routes available to both authenticated and unauthenticated users */}
        <Route path="/uitest" component={UiTest}/>
      </Router>
    );
  },
});
