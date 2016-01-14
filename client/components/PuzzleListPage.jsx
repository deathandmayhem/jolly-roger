const BS = ReactBootstrap;

AddPuzzleForm = React.createClass({
  propTypes: {
    huntId: React.PropTypes.string.isRequired,
    tags: React.PropTypes.arrayOf(
      React.PropTypes.shape(Schemas.Tags.asReactPropTypes()).isRequired,
    ).isRequired,
  },

  getInitialState() {
    return {
      title: '',
      url: '',
      tags: [],
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
      tags: $(event.target).val(),
    });
  },

  submitPuzzle() {
    const _this = this;

    this.setState({
      submitState: 'submitting',
    });
    Meteor.call('createPuzzle', this.props.huntId, this.state.title, this.state.url, this.state.tags, (error) => {
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
          tags: [],
        });
        _this.refs.form.close();
      }
    });
  },

  render() {
    const disableForm = this.state.submitState === 'submitting';

    const allTags = _.compact(_.union(this.props.tags.map((t) => t.name), this.state.tags));

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
                      id="jr-new-puzzle-title"
                      type="text"
                      label="Title"
                      labelClassName="col-xs-3"
                      wrapperClassName="col-xs-9"
                      autoFocus="true"
                      disabled={disableForm}
                      onChange={this.onTitleChange}
                      value={this.state.title}/>
            <BS.Input ref="url"
                      id="jr-new-puzzle-url"
                      type="text"
                      label="URL"
                      labelClassName="col-xs-3"
                      wrapperClassName="col-xs-9"
                      disabled={disableForm}
                      onChange={this.onUrlChange}
                      value={this.state.url}/>
            <BS.Input id="jr-new-puzzle-tags"
                      label="Tags"
                      labelClassName="col-xs-3"
                      wrapperClassName="col-xs-9">
              <ReactSelect2
                  ref="tags"
                  id="jr-new-puzzle-tags"
                  data={allTags}
                  multiple
                  disabled={disableForm}
                  onChange={this.onTagsChange}
                  value={this.state.tags}
                  options={{tags: true, tokenSeparators: [',', ' ']}}
                  style={{width: '100%'}}/>
            </BS.Input>
            {this.state.submitState === 'failed' && <BS.Alert bsStyle="danger">{this.state.errorMessage}</BS.Alert>}
        </JRC.ModalForm>
      </div>
    );
  },
});

PuzzleListView = React.createClass({
  displayName: 'PuzzleListView',
  propTypes: {
    huntId: React.PropTypes.string.isRequired,
    canAdd: React.PropTypes.bool.isRequired,
    puzzles: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Puzzles.asReactPropTypes()
      )
    ).isRequired,
    tags: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Tags.asReactPropTypes()
      )
    ).isRequired,
  },

  getInitialState() {
    return {
      displayMode: 'group', // One of ['group', 'unlock']
      showSolved: true,
      searchString: '',
    };
  },

  onSearchStringChange() {
    const newString = this.refs.searchBar.getValue();
    this.setState({searchString: newString});
  },

  compileMatcher(searchKeys) {
    const tagNames = _.indexBy(this.props.tags, '_id');
    return function(puzzle) {
      // for key in searchKeys:
      //   if key in title or key in answer:
      //     return true
      //   if key is a substring of a tag:
      //     return true
      // return false
      for (let i = 0; i < searchKeys.length; i++) {
        const key = searchKeys[i].toLowerCase();
        if (puzzle.title.toLowerCase().indexOf(key) !== -1 ||
            (puzzle.answer && (puzzle.answer.toLowerCase().indexOf(key) !== -1))) {
          return true;
        }

        for (let j = 0; j < puzzle.tags.length; j++) {
          const tagName = tagNames[puzzle.tags[j]].name;
          if (tagName.indexOf(key) !== -1) {
            return true;
          }
        }
      }

      return false;
    };
  },

  filteredPuzzles(puzzles) {
    const searchKeys = this.state.searchString.split(' ');
    let interestingPuzzles;

    if (searchKeys.length === 1 && searchKeys[0] === '') {
      // No search query, so no need to do fancy search computation
      interestingPuzzles = puzzles;
    } else {
      const searchKeysWithEmptyKeysRemoved = _.filter(searchKeys, (key) => { return key.length > 0; });
      const isInteresting = this.compileMatcher(searchKeysWithEmptyKeysRemoved);
      interestingPuzzles = _.filter(puzzles, isInteresting);
    }

    if (this.state.showSolved) {
      return interestingPuzzles;
    } else {
      return _.filter(interestingPuzzles, (puzzle) => { return !puzzle.answer; });
    }
  },

  puzzlesByUnlock() {
    // Sort and group after filtering
    const filteredPuzzles = this.filteredPuzzles(this.props.puzzles);

    // Sort by creation timestamp
    return _.sortBy(filteredPuzzles, (puzzle) => { return puzzle.createdAt; });
  },

  puzzleGroupsByRelevance() {
    // First, filter puzzles by search keys and unsolved (if selected).
    const filteredPuzzles = this.filteredPuzzles(this.props.puzzles);

    // Extract remaining puzzles into groups.  Collect puzzles that appear in no groups into a final
    // group, "ungrouped".  Each group (except ungrouped) has shape:
    // {
    //   sharedTag: (tag shape),
    //   puzzles: [(puzzle shape)],
    // }

    const groupsMap = {}; // Maps tag id to list of puzzles holding that tag.
    const ungroupedPuzzles = []; // For collecting puzzles that are not included in any group
    const tagsByIndex = _.indexBy(this.props.tags, '_id');
    for (let i = 0; i < filteredPuzzles.length; i++) {
      const puzzle = filteredPuzzles[i];
      let grouped = false;
      for (let j = 0; j < puzzle.tags.length; j++) {
        const tag = tagsByIndex[puzzle.tags[j]];
        if (tag.name.lastIndexOf('group:', 0) === 0) {
          grouped = true;
          if (!groupsMap[tag._id]) {
            groupsMap[tag._id] = [];
          }

          groupsMap[tag._id].push(puzzle);
        }
      }

      if (!grouped) {
        ungroupedPuzzles.push(puzzle);
      }
    }

    // Collect groups into a list.
    const groups = _.map(_.keys(groupsMap), (key) => {
      const val = groupsMap[key];
      return {
        sharedTag: tagsByIndex[key],
        puzzles: val,
      };
    });

    // Add the ungrouped puzzles too, if there are any.
    if (ungroupedPuzzles.length > 0) {
      groups.push({
        puzzles: ungroupedPuzzles,
      });
    }

    // Sort groups by interestingness.
    // Within an interestingness class, sort tags by creation date, which should roughly match hunt order.
    groups.sort((a, b) => {
      const ia = this.interestingnessOfGroup(a, tagsByIndex);
      const ib = this.interestingnessOfGroup(b, tagsByIndex);
      if (ia !== ib) return ia - ib;
      return a.sharedTag.createdAt - b.sharedTag.createdAt;
    });

    return groups;
  },

  interestingnessOfGroup(group, indexedTags) {
    // Rough idea: sort, from top to bottom:
    // -2 Group with unsolved puzzle with matching meta-for:<this group>
    // -1 Group with some other unsolved is:meta puzzle
    //  0 Groups with no metas yet
    //  1 Ungrouped puzzles
    //  2 Groups with a solved puzzle with matching meta-for:<this group>
    const puzzles = group.puzzles;
    const sharedTag = group.sharedTag;

    // ungrouped puzzles go after groups, esp. after groups with a known unsolved meta.
    // Guarantees that if ia === ib, then sharedTag exists.
    if (!sharedTag) return 1;

    // Look for a puzzle with meta-for: (this group's shared tag)
    let metaForTag;
    if (sharedTag && sharedTag.name.lastIndexOf('group:', 0) === 0) {
      metaForTag = 'meta-for:' + sharedTag.name.slice('group:'.length);
    }

    let hasUnsolvedMeta = false;
    for (let i = 0; i < puzzles.length; i++) {
      const puzzle = puzzles[i];
      for (let j = 0; j < puzzle.tags.length; j++) {
        const tag = indexedTags[puzzle.tags[j]];
        if (metaForTag && tag.name === metaForTag) {
          // This puzzle is meta-for: the group.
          if (puzzle.answer) {
            return 2;
          } else {
            return -2;
          }
        } else if (tag.name === 'is:meta' && !puzzle.answer) {
          hasUnsolvedMeta = true;
        }
      }
    }

    if (hasUnsolvedMeta) return -1;
    return 0;
  },

  clearSearch() {
    this.setState({searchString: ''});
  },

  switchView(newMode) {
    this.setState({
      displayMode: newMode,
    });
  },

  changeShowSolved(event) {
    this.setState({
      showSolved: event.target.checked,
    });
  },

  render() {
    const clearButton = <BS.Button onClick={this.clearSearch}>Clear</BS.Button>;
    let bodyComponent;
    switch (this.state.displayMode) {
      case 'group':
        const puzzleGroups = this.puzzleGroupsByRelevance();
        const groupComponents = puzzleGroups.map((g) => {
          if (g.sharedTag) {
            return <RelatedPuzzleGroup key={g.sharedTag._id}
                                       sharedTag={g.sharedTag}
                                       relatedPuzzles={g.puzzles}
                                       allTags={this.props.tags}
                                       includeCount={false}
                                       />;
          } else {
            return (
              <div key='ungrouped' style={{marginBottom: '16'}}>
                <div>Puzzles in no group:</div>
                <PuzzleList puzzles={g.puzzles} tags={this.props.tags} />
              </div>
            );
          }
        });
        bodyComponent = (
          <div>
            {groupComponents}
          </div>
        );
        break;
      case 'unlock':
        const puzzles = this.puzzlesByUnlock();
        bodyComponent = <PuzzleList puzzles={puzzles} tags={this.props.tags} />;
        break;
    }
    return (
      <div>
        <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          <span>View puzzles by:</span>
          <BS.Nav activeKey={this.state.displayMode} bsStyle='pills' onSelect={this.switchView}>
            <BS.NavItem eventKey={'group'}>Group</BS.NavItem>
            <BS.NavItem eventKey={'unlock'}>Unlock order</BS.NavItem>
          </BS.Nav>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'left', justifyContent: 'flex-begin'}}>
          <div>
            <BS.Input type="checkbox" label="Show solved" checked={this.state.showSolved} onChange={this.changeShowSolved} />
          </div>
          </div>
          {this.props.canAdd ? <AddPuzzleForm huntId={this.props.huntId} tags={this.props.tags}/> : <span />}
        </div>
        <BS.Input id="jr-puzzle-search" type="text" label="Search" placeholder="search by title, answer, or tag"
                  value={this.state.searchString}
                  ref="searchBar"
                  buttonAfter={clearButton}
                  onChange={this.onSearchStringChange}
        />
        {bodyComponent}
      </div>
    );
  },
});

PuzzleListPage = React.createClass({
  mixins: [ReactMeteorData],

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  getMeteorData() {
    if (_.has(huntFixtures, this.props.params.huntId)) {
      return {
        ready: true,
        allPuzzles: huntFixtures[this.props.params.huntId].puzzles,
        allTags: huntFixtures[this.props.params.huntId].tags,
      };
    }

    const puzzlesHandle = this.context.subs.subscribe('mongo.puzzles', {hunt: this.props.params.huntId});
    const tagsHandle = this.context.subs.subscribe('mongo.tags', {hunt: this.props.params.huntId});
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
        <PuzzleListView huntId={this.props.params.huntId} canAdd={this.data.canAdd} puzzles={this.data.allPuzzles} tags={this.data.allTags} />
      );
    }
  },
});
