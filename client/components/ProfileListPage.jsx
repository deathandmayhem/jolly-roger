const {Link} = ReactRouter;
const BS = ReactBootstrap;

UserProfile = React.createClass({
  propTypes: React.PropTypes.shape(Schemas.Profiles.asReactPropTypes()),
  render() {
    return (
      <div>{this.props.displayName}</div>
    );
  },
});

ProfileListPage = React.createClass({
  mixins: [ReactMeteorData],
  getInitialState() {
    return {
      searchString: '',
    };
  },

  getMeteorData() {
    var profilesHandle = Meteor.subscribe('mongo.profiles');
    return {
      ready: profilesHandle.ready(),
      profiles: Models.Profiles.find({}, {sort: {displayName: 1}}).fetch(),
    };
  },

  onSearchStringChange() {
    this.setState({
      searchString: this.refs.searchBar.getValue(),
    });
  },

  compileMatcher() {
    var searchKeys = this.state.searchString.split(' ');
    var toMatch = _.chain(searchKeys)
                   .filter(function(s) { return !!s;})
                   .map(function(s) { return s.toLowerCase(); })
                   .value();
    var isInteresting = (profile) => {
      for (var i = 0; i < toMatch.length; i++) {
        var searchKey = toMatch[i];
        if (profile.displayName.toLowerCase().indexOf(searchKey) === -1 &&
            profile.primaryEmail.toLowerCase().indexOf(searchKey) === -1 &&
            (!profile.slackHandle || profile.slackHandle.toLowerCase().indexOf(searchKey) === -1) &&
            (!profile.phoneNumber || profile.phoneNumber.toLowerCase().indexOf(searchKey) === -1))
          return false;
      }

      return true;
    };

    return isInteresting;
  },

  render() {
    console.log(this.data);
    if (!this.data.ready) return <div>loading...</div>;
    var profiles = _.filter(this.data.profiles, this.compileMatcher());
    return (
      <div>
        <h1>List of hunters</h1>
        <BS.Input type="text" label="Search" placeholder="search by name..."
                  value={this.state.searchString} ref="searchBar"
                  onChange={this.onSearchStringChange}/>
        <BS.ListGroup>
          <BS.ListGroupItem key="invite" href={'/users/invite'}><strong>Invite someone...</strong></BS.ListGroupItem>
          {profiles.map((profile) => (
             <BS.ListGroupItem key={profile._id} href={`/users/${profile._id}`}>
               {profile.displayName || '<no name provided>'}
             </BS.ListGroupItem>))}
        </BS.ListGroup>
      </div>
    );
  },
});
