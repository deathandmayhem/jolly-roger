const {Link} = ReactRouter;

const AddButton = React.createClass({
  render() {
    return <div>Hello</div>;
  },
});

const Hunt = React.createClass({
  propTypes: {
    hunt: React.PropTypes.object.isRequired,
  },

  render() {
    const hunt = this.props.hunt;
    return (
      <li>
        <Link to={`/hunts/${hunt._id}`}>
          {hunt.name}
        </Link>
      </li>
    );
  },
});

HuntList = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    Meteor.subscribe('mongo.hunts');
    return {
      user: Meteor.user(),
      hunts: Models.Hunts.find().fetch(),
    };
  },

  addButton() {
    if (Roles.userHasPermission(this.data.user._id, 'mongo.hunts.insert')) {
      return <AddButton/>;
    }
  },

  render() {
    const hunts = this.data.hunts.map((hunt) => {
      return <Hunt key={hunt._id} hunt={hunt}/>;
    });
    return (
      <div id="jr-hunts">
        <h1>Hunts</h1>
        {this.addButton()}
        <ul>
          {hunts}
        </ul>
      </div>
    );
  },
});
