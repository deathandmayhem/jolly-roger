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

const Hunt = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    return {
      canUpdate: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.update'),
      canRemove: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.remove'),
    };
  },

  propTypes: {
    hunt: React.PropTypes.instanceOf(Transforms.Hunt).isRequired,
  },

  showEditModal() {
    this.refs.editModal.refs.form.show();
  },

  showDeleteModal() {
    this.refs.deleteModal.show();
  },

  onEdit(callback) {
    Models.Hunts.update(
      {_id: this.props.hunt._id},
      {$set: {name: this.refs.editModal.refs['input:name'].getValue()}},
      callback
    );
  },

  onDelete(callback) {
    this.props.hunt.destroy(callback);
  },

  editButton() {
    if (this.data.canUpdate) {
      return (
        <BS.Button onClick={this.showEditModal} bsStyle="default" title="Edit hunt...">
          <BS.Glyphicon glyph="edit"/>
        </BS.Button>
      );
    }
  },

  deleteButton() {
    if (this.data.canRemove) {
      return (
        <BS.Button onClick={this.showDeleteModal} bsStyle="danger" title="Delete hunt...">
          <BS.Glyphicon glyph="remove"/>
        </BS.Button>
      );
    }
  },

  render() {
    const hunt = this.props.hunt;
    return (
      <li>
        <HuntFormModal
            ref="editModal"
            hunt={this.props.hunt}
            onSubmit={this.onEdit}/>
        <JRC.ModalForm
            ref="deleteModal"
            title="Delete Hunt"
            submitLabel="Delete"
            submitStyle="danger"
            onSubmit={this.onDelete}>
          Are you sure you want to delete "{this.props.hunt.name}"?
          This will additionally delete all puzzles and associated
          state.
        </JRC.ModalForm>
        <Link to={`/hunts/${hunt._id}`}>
          {hunt.name}
        </Link>
        <BS.ButtonGroup bsSize="xs">
          {this.editButton()}
          {this.deleteButton()}
        </BS.ButtonGroup>
      </li>
    );
  },
});

MockHunt = React.createClass({
  render() {
    return (
      <li>
        <Link to={'/hunts/2015'}>2015 (mock data)</Link>
      </li>
    );
  }
});

HuntList = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    Meteor.subscribe('mongo.hunts');
    return {
      canAdd: Roles.userHasPermission(Meteor.userId(), 'mongo.hunts.insert'),
      hunts: Models.Hunts.find().fetch(),
    };
  },

  showAddModal() {
    this.refs.addModal.refs.form.show();
  },

  onAdd(callback) {
    Models.Hunts.insert({
      name: this.refs.addModal.refs['input:name'].getValue(),
    }, callback);
  },

  addButton() {
    if (this.data.canAdd) {
      return (
        <BS.Button onClick={this.showAddModal} bsStyle="success" bsSize="xs" title="Add new hunt...">
          <BS.Glyphicon glyph="plus"/>
        </BS.Button>
      );
    }
  },

  render() {
    const hunts = this.data.hunts.map((hunt) => {
      return <Hunt key={hunt._id} hunt={hunt}/>;
    });
    // Insert mock data from 2015 hunt.
    hunts.push(<MockHunt key={2015} />);
    return (
      <div id="jr-hunts">
        <h1>Hunts</h1>
        <HuntFormModal
            ref="addModal"
            onSubmit={this.onAdd}/>
        {this.addButton()}
        <ul>
          {hunts}
        </ul>
      </div>
    );
  },
});
