const {
  IndexRoute,
  IndexRedirect,
  Redirect,
  Route,
  Router,
} = ReactRouter;

const history = ReactRouter.history.useQueries(ReactRouter.history.createHistory)();

Routes = React.createClass({
  childContextTypes: {
    subs: JRPropTypes.subs,
  },

  getChildContext() {
    if (!this.subs) {
      this.subs = new SubsManager({cacheLimit: 20, expireIn: 1});
    }

    return {subs: this.subs};
  },

  render() {
    return (
      <Router history={history}>
        {/* Authenticated routes */}
        <Route path="/" component={Authenticator} authenticated={true}>
          <IndexRedirect to="hunts"/>
          <Route path="" component={App}>
            <Route path="hunts/:huntId" component={HuntApp}>
              <Route path="announcements" component={AnnouncementsPage}/>
              <Route path="guesses" component={GuessQueuePage}/>
              <Route path="puzzles/:puzzleId" component={PuzzlePage}/>
              <Route path="puzzles" component={PuzzleListPage}/>
              <IndexRoute component={HuntPage}/>
            </Route>
            <Route path="hunts" component={HuntList}/>
            <Route path="users/invite" component={UserInvite}/>
            <Route path="users/:userId" component={ProfilePage}/>
            <Route path="users" component={ProfileListPage}/>
            <Route path="setup" component={Setup}/>
          </Route>
        </Route>
        {/* Unauthenticated routes */}
        <Route path="/" component={Authenticator} authenticated={false}>
          <Route path="" component={SplashPage}>
            <Route path="login" component={LoginForm}/>
            <Route path="reset-password/:token" component={PasswordResetForm}/>
            <Route path="enroll/:token" component={EnrollForm}/>
          </Route>
        </Route>
        {/* Routes available to both authenticated and unauthenticated users */}
      </Router>
    );
  },
});
