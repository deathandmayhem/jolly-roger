const {Link} = ReactRouter;

HuntPage = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    const huntHandle = Meteor.subscribe('mongo.hunts', {_id: this.props.params.huntId});
    return {
      hunt: Models.Hunts.findOne(this.props.params.huntId),
    };
  },

  render() {
    const huntName = (this.data.hunt && this.data.hunt.name) || 'loading...';
    return (
      <div>
        <h1>{huntName}</h1>
        <ul>
          <li><Link to={`/hunts/${this.props.params.huntId}/puzzles`}>Puzzles</Link></li>
          <li><Link to={`/hunts/${this.props.params.huntId}/announcements`}>Announcements</Link></li>
          <li><Link to={`/hunts/${this.props.params.huntId}/guesses`}>Guess queue</Link></li>
        </ul>
      </div>
    );
  },
});
