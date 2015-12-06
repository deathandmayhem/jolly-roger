const {Link} = ReactRouter;
const BS = ReactBootstrap;

const HuntFormModal = React.createClass({
  propTypes: {
    show: React.PropTypes.bool,
    hunt: React.PropTypes.instanceOf(Transforms.Hunt),
    onClose: React.PropTypes.func,
    onSubmit: React.PropTypes.func,
  },

  submit(e) {
    e.preventDefault();
    if (this.props.onSubmit) {
      this.props.onSubmit();
    }
  },

  render() {
    return (
      <BS.Modal show={this.props.show} onHide={this.props.onClose}>
        <form className="form-horizontal" onSubmit={this.submit}>
          <BS.Modal.Header closeButton>
            <BS.Modal.Title>
              {this.props.hunt ? 'Edit Hunt' : 'New Hunt'}
            </BS.Modal.Title>
          </BS.Modal.Header>
          <BS.Modal.Body>
            <BS.Input
                ref="input:name"
                type="text"
                label="Name"
                labelClassName="col-xs-2"
                wrapperClassName="col-xs-10"
                defaultValue={this.props.hunt && this.props.hunt.name}
                autoFocus="true"/>
          </BS.Modal.Body>
          <BS.Modal.Footer>
            <BS.Button bsStyle="default" onClick={this.props.onClose}>Close</BS.Button>
            <BS.Button bsStyle="primary" type="submit">Save</BS.Button>
          </BS.Modal.Footer>
        </form>
      </BS.Modal>
    );
  },
});

const AddHuntButton = React.createClass({
  getInitialState() {
    return {show: false};
  },

  open() {
    this.setState({show: true});
  },

  close() {
    this.setState({show: false});
  },

  submit() {
    Models.Hunts.insert({
      name: this.refs.modal.refs['input:name'].getValue(),
    });
    this.close();
  },

  render() {
    return (
      <div>
        <BS.Button onClick={this.open} bsStyle="success" bsSize="xs" title="Add new hunt...">
          <BS.Glyphicon glyph="plus"/>
        </BS.Button>

        <HuntFormModal
            ref="modal"
            show={this.state.show}
            onClose={this.close}
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

  getInitialState() {
    return {edit: false};
  },

  edit() {
    this.setState({edit: true});
  },

  close() {
    this.setState({edit: false});
  },

  onEdit() {
    Models.Hunts.update(
      {_id: this.props.hunt._id},
      {$set: {name: this.refs.modal.refs['input:name'].getValue()}},
    );
    this.close();
  },

  editButton() {
    if (Roles.userHasPermission(this.props.userId, 'mongo.hunts.update')) {
      return (
        <BS.Button onClick={this.edit} bsStyle="default" title="Edit hunt...">
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
            show={this.state.edit}
            onClose={this.close}
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
