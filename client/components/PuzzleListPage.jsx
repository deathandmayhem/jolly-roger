const BS = ReactBootstrap;

AddPuzzleForm = React.createClass({
  propTypes: {
    huntId: React.PropTypes.string.isRequired,
  },

  getInitialState() {
    return {
      title: '',
      url: '',
      tags: '',
      submitState: 'idle',
      errorMessage: '',
    };
  },

  showModal() {
    this.refs.form.show();
  },

  onTitleChange(event) {
    this.setState({
      title: event.target.value,
    });
  },

  onUrlChange(event) {
    this.setState({
      url: event.target.value,
    });
  },

  onTagsChange(event) {
    this.setState({
      tags: event.target.value,
    });
  },

  submitPuzzle() {
    const _this = this;

    // TODO: do something smarter with tags. really.  needs autocomplete, and ideally a preview of
    // what tags you're about to create, as seen by the tag system
    const tags = _.filter(this.state.tags.split(' '), (tag) => { return !!tag; });
    this.setState({
      submitState: 'submitting',
    });
    Meteor.call('createPuzzle', this.props.huntId, this.state.title, this.state.url, tags, (error) => {
      if (error) {
        _this.setState({
          submitState: 'failed',
          errorMessage: error.message,
        });
      } else {
        _this.setState({
          submitState: 'idle',
          title: '',
          url: '',
          tags: '',
        });
        _this.refs.form.close();
      }
    });
  },

  render() {
    const disableForm = this.state.submitState === 'submitting';
    /* TODO: Bootstrap does some really annoying things with the gutter here,
       by specifying matching padding and negative margin on all the inputs.
       The end result is that you cannot make the input fields line up with any other text.
       Furthermore, even React-Bootstrap's input labels do not use the <label> element,
       which is worse for accessibility and means you can't click on the label text and
       focus the desired input.  I am pretty close to throwing a bunch of this away and
       reimplementing it myself. */
    return (
      <div>
        <div style={{textAlign: 'right'}}>
          <BS.Button bsStyle="primary" onClick={this.showModal}>Add a puzzle</BS.Button>
        </div>
        <JRC.ModalForm ref="form"
                       title="Add puzzle"
                       onSubmit={this.submitPuzzle}
                       submitLabel="Add">
            <BS.Input ref="title"
                      type="text"
                      label="Title"
                      autoFocus="true"
                      disabled={disableForm}
                      onChange={this.onTitleChange}
                      value={this.state.title}/>
            <BS.Input ref="url"
                      type="text"
                      label="URL"
                      disabled={disableForm}
                      onChange={this.onUrlChange}
                      value={this.state.url}/>
            <BS.Input ref="tags"
                      type="text"
                      label="Tags"
                      disabled={disableForm}
                      onChange={this.onTagsChange}
                      value={this.state.tags}/>
            <div>Separate tags with spaces.</div>
            <div>TODO: show all existing tags here?  Clicking tag adds to list?</div>
            {this.state.submitState === 'failed' && <BS.Alert bsStyle="danger">{this.state.errorMessage}</BS.Alert>}
        </JRC.ModalForm>
      </div>
    );
  },
});

PuzzleListPage = React.createClass({
  mixins: [ReactMeteorData],
  getMeteorData() {
    if (_.has(huntFixtures, this.props.params.huntId)) {
      return {
        ready: true,
        allPuzzles: huntFixtures[this.props.params.huntId].puzzles,
        allTags: huntFixtures[this.props.params.huntId].tags,
      };
    }

    var puzzlesHandle = Meteor.subscribe('mongo.puzzles', {hunt: this.props.params.huntId});
    var tagsHandle = Meteor.subscribe('mongo.tags', {hunt: this.props.params.huntId});
    let ready = puzzlesHandle.ready() && tagsHandle.ready();
    if (!ready) {
      return {
        ready,
      };
    } else {
      return {
        ready,
        canAdd: Roles.userHasPermission(Meteor.userId(), 'mongo.puzzles.insert'),
        allPuzzles: Models.Puzzles.find({hunt: this.props.params.huntId}).fetch(),
        allTags: Models.Tags.find({hunt: this.props.params.huntId}).fetch(),
      };
    }
  },

  render() {
    if (!this.data.ready) {
      return <span>loading...</span>;
    } else {
      return (
        <div>
          {this.data.canAdd && <AddPuzzleForm huntId={this.props.params.huntId}/>}
          <FilteringPuzzleSet puzzles={this.data.allPuzzles} tags={this.data.allTags} />
        </div>
      );
    }
  },
});
