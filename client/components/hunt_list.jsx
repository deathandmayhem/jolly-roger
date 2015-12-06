const {Link} = ReactRouter;
const BS = ReactBootstrap;

const HuntFormModal = React.createClass({
  propTypes: {
    hunt: React.PropTypes.instanceOf(Transforms.Hunt),
    onSubmit: React.PropTypes.func,
  },

  render() {
    return (
      <JRC.ModalForm
          ref="form"
          title={this.props.hunt ? 'Edit Hunt' : 'New Hunt'}
          onSubmit={this.props.onSubmit}>
        <BS.Input
            ref="input:name"
            type="text"
            label="Name"
            labelClassName="col-xs-2"
            wrapperClassName="col-xs-10"
            defaultValue={this.props.hunt && this.props.hunt.name}
            autoFocus="true"/>
      </JRC.ModalForm>
    );
  },
});

const AddHuntButton = React.createClass({
  submit(callback) {
    Models.Hunts.insert({
      name: this.refs.modal.refs['input:name'].getValue(),
    }, callback);
  },

  showModal() {
    this.refs.modal.refs.form.show();
  },

  render() {
    return (
      <div>
        <BS.Button onClick={this.showModal} bsStyle="success" bsSize="xs" title="Add new hunt...">
          <BS.Glyphicon glyph="plus"/>
        </BS.Button>

        <HuntFormModal
            ref="modal"
            onSubmit={this.submit}/>
      </div>
    );
  },
});

const Hunt = React.createClass({
  propTypes: {
    userId: React.PropTypes.string.isRequired,
    hunt: React.PropTypes.instanceOf(Transforms.Hunt).isRequired,
  },

  showModal() {
    this.refs.modal.refs.form.show();
  },

  onEdit(callback) {
    Models.Hunts.update(
      {_id: this.props.hunt._id},
      {$set: {name: this.refs.modal.refs['input:name'].getValue()}},
      callback
    );
  },

  editButton() {
    if (Roles.userHasPermission(this.props.userId, 'mongo.hunts.update')) {
      return (
        <BS.Button onClick={this.showModal} bsStyle="default" title="Edit hunt...">
          <BS.Glyphicon glyph="edit"/>
        </BS.Button>
      );
    }
  },

  render() {
    const hunt = this.props.hunt;
    return (
      <li>
        <HuntFormModal
            ref="modal"
            hunt={this.props.hunt}
            onSubmit={this.onEdit}/>
        <Link to={`/hunts/${hunt._id}`}>
          {hunt.name}
        </Link>
        <BS.ButtonGroup bsSize="xs">
          {this.editButton()}
        </BS.ButtonGroup>
      </li>
    );
  },
});

HuntList = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    Meteor.subscribe('mongo.hunts');
    return {
      userId: Meteor.userId(),
      hunts: Models.Hunts.find().fetch(),
    };
  },

  addButton() {
    if (Roles.userHasPermission(this.data.userId, 'mongo.hunts.insert')) {
      return <AddHuntButton/>;
    }
  },

  render() {
    const hunts = this.data.hunts.map((hunt) => {
      return <Hunt key={hunt._id} userId={this.data.userId} hunt={hunt}/>;
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
