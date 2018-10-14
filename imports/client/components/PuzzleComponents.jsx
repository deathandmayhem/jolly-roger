import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { jQuery } from 'meteor/jquery';
import React from 'react';
import { Link } from 'react-router';
import BS from 'react-bootstrap';
import classnames from 'classnames';
import Ansible from '/imports/ansible.js';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import ModalForm from '/imports/client/components/ModalForm.jsx';
import ReactSelect2 from '/imports/client/components/ReactSelect2.jsx';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import { SubscriberCounters } from '/imports/client/subscribers.js';
import Flags from '/imports/flags.js';
import LabelledRadioGroup from '/imports/client/components/LabelledRadioGroup.jsx';

/* eslint-disable max-len */

const puzzleShape = Schemas.Puzzles.asReactPropTypes();
const tagShape = Schemas.Tags.asReactPropTypes();

function puzzleInterestingness(puzzle, indexedTags, group) {
  // If the shared tag for this group is group:<something>, then group will equal '<something>', and
  // we wish to sort a puzzle named 'meta-for:<something>' at the top.
  let desiredTagName;
  if (group) {
    desiredTagName = `meta-for:${group}`;
  }
  let isAdministrivia = false;
  let isGroup = false;
  let minScore = 0;

  for (let i = 0; i < puzzle.tags.length; i++) {
    const tag = indexedTags[puzzle.tags[i]];
    if (tag.name.lastIndexOf('group:', 0) === 0) {
      isGroup = true;
    }
    if (tag.name === 'administrivia') {
      // First comes any administrivia
      minScore = Math.min(-4, minScore);
      isAdministrivia = true;
    } else if (desiredTagName && tag.name === desiredTagName) {
      // Matching meta gets sorted top.
      minScore = Math.min(-3, minScore);
    } else if (tag.name === 'is:metameta') {
      // Metameta sorts above meta.
      minScore = Math.min(-2, minScore);
    } else if (tag.name === 'is:meta') {
      // Meta sorts above non-meta.
      minScore = Math.min(-1, minScore);
    }
  }
  // Sort general administrivia above administrivia with a group
  if (isAdministrivia && !isGroup) {
    minScore = Math.min(-5, minScore);
  }

  return minScore;
}

function sortPuzzlesByRelevanceWithinPuzzleGroup(puzzles, sharedTag, indexedTags) {
  // If sharedTag is a meta:<something> tag, sort a puzzle with a meta-for:<something> tag at top.
  let group;
  if (sharedTag.name.lastIndexOf('group:', 0) === 0) {
    group = sharedTag.name.slice('group:'.length);
  }

  const sortedPuzzles = _.toArray(puzzles);
  sortedPuzzles.sort((a, b) => {
    const ia = puzzleInterestingness(a, indexedTags, group);
    const ib = puzzleInterestingness(b, indexedTags, group);
    if (ia !== ib) {
      return ia - ib;
    } else {
      // Sort puzzles by creation time otherwise.
      return a.createdAt - b.createdAt;
    }
  });

  return sortedPuzzles;
}

const PuzzleModalForm = React.createClass({
  displayName: 'PuzzleModalForm',
  propTypes: {
    huntId: React.PropTypes.string.isRequired,
    puzzle: React.PropTypes.shape(Schemas.Puzzles.asReactPropTypes()),
    tags: React.PropTypes.arrayOf( // All known tags for this hunt
      React.PropTypes.shape(Schemas.Tags.asReactPropTypes()).isRequired,
    ).isRequired,
    onSubmit: React.PropTypes.func.isRequired,
  },

  getInitialState() {
    const state = {
      submitState: 'idle',
      errorMessage: '',
    };

    if (this.props.puzzle) {
      return _.extend(state, this.stateFromPuzzle(this.props.puzzle));
    } else {
      return _.extend(state, {
        title: '',
        url: '',
        tags: [],
        docType: 'spreadsheet',
      });
    }
  },

  componentWillReceiveProps(nextProps) {
    if (nextProps.puzzle && nextProps.puzzle !== this.props.puzzle) {
      this.setState(this.stateFromPuzzle(nextProps.puzzle));
    }
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
      tags: jQuery(event.target).val() || [],
    });
  },

  onDocTypeChange(newValue) {
    this.setState({
      docType: newValue,
    });
  },

  onFormSubmit(callback) {
    this.setState({ submitState: 'submitting' });
    const state = _.extend(
      {},
      _.omit(this.state, 'submitState', 'errorMessage'),
      { hunt: this.props.huntId },
    );
    this.props.onSubmit(state, (error) => {
      if (error) {
        this.setState({
          submitState: 'failed',
          errorMessage: error.message,
        });
      } else {
        this.setState(this.getInitialState());
        callback();
      }
    });
  },

  stateFromPuzzle(puzzle) {
    const tagNames = {};
    _.each(this.props.tags, (t) => { tagNames[t._id] = t.name; });
    return {
      title: puzzle.title,
      url: puzzle.url,
      tags: puzzle.tags.map((t) => tagNames[t]),
    };
  },

  show() {
    this.formNode.show();
  },

  render() {
    const disableForm = this.state.submitState === 'submitting';

    const allTags = _.compact(_.union(this.props.tags.map((t) => t.name), this.state.tags));

    const docTypeSelector = (
      <BS.FormGroup>
        <BS.ControlLabel className="col-xs-3" htmlFor="jr-new-puzzle-doc-type">
          Document type
        </BS.ControlLabel>
        <div className="col-xs-9">
          <LabelledRadioGroup
            header=""
            name="jr-new-puzzle-doc-type"
            options={[
              {
                value: 'spreadsheet',
                label: 'Spreadsheet',
              },
              {
                value: 'document',
                label: 'Document',
              },
            ]}
            initialValue={this.state.docType}
            help="This can't be changed once a puzzle has been created. Unless you're absolutely sure, use a spreadsheet. We only expect to use documents for administrivia."
            onChange={this.onDocTypeChange}
          />
        </div>
      </BS.FormGroup>
    );

    return (
      <ModalForm
        ref={(node) => { this.formNode = node; }}
        title={this.props.puzzle ? 'Edit puzzle' : 'Add puzzle'}
        onSubmit={this.onFormSubmit}
        submitDisabled={disableForm}
      >
        <BS.FormGroup>
          <BS.ControlLabel className="col-xs-3" htmlFor="jr-new-puzzle-title">
            Title
          </BS.ControlLabel>
          <div className="col-xs-9">
            <BS.FormControl
              id="jr-new-puzzle-title"
              type="text"
              autoFocus
              disabled={disableForm}
              onChange={this.onTitleChange}
              value={this.state.title}
            />
          </div>
        </BS.FormGroup>

        <BS.FormGroup>
          <BS.ControlLabel className="col-xs-3" htmlFor="jr-new-puzzle-url">
            URL
          </BS.ControlLabel>
          <div className="col-xs-9">
            <BS.FormControl
              id="jr-new-puzzle-url"
              type="text"
              disabled={disableForm}
              onChange={this.onUrlChange}
              value={this.state.url}
            />
          </div>
        </BS.FormGroup>

        <BS.FormGroup>
          <BS.ControlLabel className="col-xs-3" htmlFor="jr-new-puzzle-tags">
            Tags
          </BS.ControlLabel>
          <div className="col-xs-9">
            <ReactSelect2
              id="jr-new-puzzle-tags"
              data={allTags}
              multiple
              disabled={disableForm}
              onChange={this.onTagsChange}
              value={this.state.tags}
              options={{ tags: true, tokenSeparators: [',', ' '] }}
              style={{ width: '100%' }}
            />
          </div>
        </BS.FormGroup>

        {!this.props.puzzle && docTypeSelector}

        {this.state.submitState === 'failed' && <BS.Alert bsStyle="danger">{this.state.errorMessage}</BS.Alert>}
      </ModalForm>
    );
  },
});

const PuzzleAnswer = React.createClass({
  displayName: 'PuzzleAnswer',
  propTypes: {
    answer: React.PropTypes.string.isRequired,
  },
  mixins: [PureRenderMixin],
  render() {
    return (
      <span className="answer-wrapper">
        <span className="answer">
          {this.props.answer}
        </span>
      </span>
    );
  },
});

const SubscriberCount = React.createClass({
  displayName: 'SubscriberCount',
  propTypes: {
    puzzleId: React.PropTypes.string.isRequired,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const disabled = Flags.active('disable.subcounters');
    const count = SubscriberCounters.findOne(`puzzle:${this.props.puzzleId}`);
    return {
      disabled,
      viewCount: count ? count.value : 0,
    };
  },

  render() {
    if (this.data.disabled) {
      return <div />;
    }

    const countTooltip = (
      <BS.Tooltip id={`count-description-${this.props.puzzleId}`}>
        users currently viewing this puzzle
      </BS.Tooltip>
    );
    return (
      <BS.OverlayTrigger placement="top" overlay={countTooltip}>
        <span>({this.data.viewCount})</span>
      </BS.OverlayTrigger>
    );
  },
});

const Puzzle = React.createClass({
  displayName: 'Puzzle',
  propTypes: {
    puzzle: React.PropTypes.shape(puzzleShape).isRequired,
    allTags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired, // All tags associated with the hunt.
    layout: React.PropTypes.oneOf(['grid', 'table']).isRequired,
    canUpdate: React.PropTypes.bool.isRequired,
    suppressTags: React.PropTypes.arrayOf(React.PropTypes.string),
  },
  mixins: [PureRenderMixin],

  getInitialState() {
    return {
      showEditModal: false,
    };
  },

  onEdit(state, callback) {
    Ansible.log('Updating puzzle properties', { puzzle: this.props.puzzle._id, user: Meteor.userId(), state });
    Meteor.call('updatePuzzle', this.props.puzzle._id, state, callback);
  },

  showEditModal() {
    if (this.state.showEditModal) {
      this.modalNode.show();
    } else {
      this.setState({
        showEditModal: true,
      });
    }
  },

  editButton() {
    if (this.props.canUpdate) {
      return (
        <BS.Button onClick={this.showEditModal} bsStyle="default" bsSize="xs" title="Edit puzzle...">
          <BS.Glyphicon glyph="edit" />
        </BS.Button>
      );
    }
    return null;
  },

  render() {
    // id, title, answer, tags
    const linkTarget = `/hunts/${this.props.puzzle.hunt}/puzzles/${this.props.puzzle._id}`;
    const tagIndex = _.indexBy(this.props.allTags, '_id');
    const shownTags = _.difference(this.props.puzzle.tags, this.props.suppressTags || []);
    const ownTags = shownTags.map((tagId) => { return tagIndex[tagId]; });
    const isAdministrivia = _.find(this.props.puzzle.tags, (t) => { return tagIndex[t].name === 'administrivia'; });

    const puzzleClasses = classnames('puzzle',
      this.props.puzzle.answer ? 'solved' : 'unsolved',
      this.props.layout === 'grid' ? 'puzzle-grid' : null,
      this.props.layout === 'table' ? 'puzzle-table-row' : null,
      isAdministrivia ? 'administrivia' : null,
    );

    if (this.props.layout === 'table') {
      return (
        <tr className={puzzleClasses}>
          <td className="puzzle-title">
            {this.editButton()}
            {' '}
            <Link to={linkTarget}>{this.props.puzzle.title}</Link>
          </td>
          <td className="puzzle-answer">
            {this.props.puzzle.answer ? <PuzzleAnswer answer={this.props.puzzle.answer} /> : null}
          </td>
        </tr>
      );
    }

    return (
      <div className={puzzleClasses}>
        {this.state.showEditModal ?
          <PuzzleModalForm
            ref={(node) => {
              if (node && this.modalNode === undefined) {
                // Automatically show this node the first time it's created.
                node.show();
              }

              this.modalNode = node;
            }}
            puzzle={this.props.puzzle}
            huntId={this.props.puzzle.hunt}
            tags={this.props.allTags}
            onSubmit={this.onEdit}
          /> :
          null
        }
        <div className="puzzle-title">
          {this.editButton()}
          {' '}
          <Link to={linkTarget}>{this.props.puzzle.title}</Link>
        </div>
        {this.props.layout === 'grid' ?
          <div className="puzzle-link">
            {this.props.puzzle.url ? <span>(<a href={this.props.puzzle.url} target="_blank" rel="noopener noreferrer">puzzle</a>)</span> : null}
          </div> :
         null}
        <div className="puzzle-view-count">
          {!this.props.puzzle.answer && !isAdministrivia && <SubscriberCount puzzleId={this.props.puzzle._id} />}
        </div>
        <div className="puzzle-answer">
          {this.props.puzzle.answer ? <PuzzleAnswer answer={this.props.puzzle.answer} /> : null}
        </div>
        <TagList puzzleId={this.props.puzzle._id} tags={ownTags} linkToSearch={this.props.layout === 'grid'} />
      </div>
    );
  },
});

const PuzzleList = React.createClass({
  displayName: 'PuzzleList',
  propTypes: {
    puzzles: React.PropTypes.arrayOf(React.PropTypes.shape(puzzleShape)).isRequired, // The puzzles to show in this list
    allTags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired, // All tags for this hunt, including those not used by any puzzles
    layout: React.PropTypes.string.isRequired,
    canUpdate: React.PropTypes.bool.isRequired,
    suppressTags: React.PropTypes.arrayOf(React.PropTypes.string),
  },
  mixins: [PureRenderMixin],
  render() {
    // This component just renders the puzzles provided, in order.
    // Adjusting order based on tags, tag groups, etc. is to be done at
    // a higher layer.
    const puzzles = [];
    for (let i = 0; i < this.props.puzzles.length; i++) {
      const puz = this.props.puzzles[i];
      puzzles.push(<Puzzle
        key={puz._id}
        puzzle={puz}
        allTags={this.props.allTags}
        layout={this.props.layout}
        canUpdate={this.props.canUpdate}
        suppressTags={this.props.suppressTags}
      />);
    }

    if (this.props.layout === 'table') {
      return (
        <table className="puzzle-list">
          <tbody>
            {puzzles}
          </tbody>
        </table>
      );
    }
    return (
      <div className="puzzle-list">
        {puzzles}
      </div>
    );
  },
});

const TagEditor = React.createClass({
  // TODO: this should support autocomplete to reduce human error.
  // Probably not going to land this week.
  propTypes: {
    puzzleId: React.PropTypes.string.isRequired,
    onSubmit: React.PropTypes.func.isRequired,
    onCancel: React.PropTypes.func.isRequired,
  },

  mixins: [ReactMeteorData],

  componentDidMount() {
    // Focus the input when mounted - the user just clicked on the button-link.
    const input = this.selectNode;
    jQuery(input).select2('open')
      .on('select2:close', this.onBlur)
      .on('select2:select', () => {
        this.props.onSubmit(jQuery(input).val());
      });
  },

  onBlur() {
    // Treat blur as "no I didn't mean to do that".  We may have to change this
    // once we have autocomplete .
    this.props.onCancel();
  },

  getMeteorData() {
    const puzzle = Models.Puzzles.findOne(this.props.puzzleId);
    return { allTags: Models.Tags.find({ hunt: puzzle.hunt }).fetch() };
  },

  render() {
    return (
      <span>
        <ReactSelect2
          selectRef={(node) => { this.selectNode = node; }}
          style={{ minWidth: '100px' }}
          data={[''].concat(_.pluck(this.data.allTags, 'name'))}
          options={{ tags: true }}
        />
      </span>
    );
  },
});

const Tag = React.createClass({
  displayName: 'Tag',
  propTypes: {
    tag: React.PropTypes.shape(Schemas.Tags.asReactPropTypes()).isRequired,
    onRemove: React.PropTypes.func, // if present, show a dismiss button
    linkToSearch: React.PropTypes.bool.isRequired,
  },

  mixins: [PureRenderMixin],

  onRemove() {
    if (this.props.onRemove) {
      this.props.onRemove(this.props.tag._id);
    }
  },

  render() {
    const name = this.props.tag.name;
    const isAdministrivia = name === 'administrivia';
    const isMeta = name === 'is:meta' || name === 'is:metameta';
    const isGroup = name.lastIndexOf('group:', 0) === 0;
    const isMetaFor = name.lastIndexOf('meta-for:', 0) === 0;
    const isNeeds = name.lastIndexOf('needs:', 0) === 0;
    const isPriority = name.lastIndexOf('priority:', 0) === 0;
    const classNames = classnames('tag',
      isAdministrivia ? 'tag-administrivia' : null,
      isMeta ? 'tag-meta' : null,
      isGroup ? 'tag-group' : null,
      isMetaFor ? 'tag-meta-for' : null,
      isNeeds ? 'tag-needs' : null,
      isPriority ? 'tag-priority' : null,
    );

    let title;
    if (this.props.linkToSearch) {
      title = (
        <Link
          to={`/hunts/${this.props.tag.hunt}/puzzles`}
          query={{ q: this.props.tag.name }}
          className="tag-link"
        >
          {name}
        </Link>
      );
    } else {
      title = name;
    }

    return (
      <div className={classNames}>
        {title}
        {this.props.onRemove && <BS.Button className="tag-remove-button" bsStyle="danger" onClick={this.onRemove}>&#10006;</BS.Button>}
      </div>
    );
  },
});

const TagList = React.createClass({
  displayName: 'TagList',
  propTypes: {
    puzzleId: React.PropTypes.string.isRequired,
    tags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
    onCreateTag: React.PropTypes.func, // if provided, will show UI for adding a new tag
    onRemoveTag: React.PropTypes.func, // callback if user wants to remove a tag
    linkToSearch: React.PropTypes.bool.isRequired,
    showControls: React.PropTypes.bool,
  },

  mixins: [PureRenderMixin],

  getDefaultProps() {
    return { showControls: true };
  },

  getInitialState() {
    return {
      expanded: false,
      editing: false,
      removing: false,
    };
  },

  submitTag(newTagName) {
    // TODO: submitTag should use the value passed in from the child, which may have done some
    // autocomplete matching that this component doesn't know about.
    if (this.props.onCreateTag) {
      this.props.onCreateTag(newTagName);
    }
    this.setState({
      editing: false,
    });
  },

  startEditing() {
    this.setState({ editing: true });
  },

  stopEditing() {
    this.setState({ editing: false });
  },

  startRemoving() {
    this.setState({ removing: true });
  },

  stopRemoving() {
    this.setState({ removing: false });
  },

  removeTag(tagIdToRemove) {
    if (this.props.onRemoveTag) {
      this.props.onRemoveTag(tagIdToRemove);
    }
  },

  soloTagInterestingness(tag) {
    if (tag.name === 'is:metameta') {
      return -6;
    } else if (tag.name === 'is:meta') {
      return -5;
    } else if (tag.name.lastIndexOf('meta-for:', 0) === 0) {
      return -4;
    } else if (tag.name.lastIndexOf('group:', 0) === 0) {
      return -3;
    } else if (tag.name.lastIndexOf('needs:', 0) === 0) {
      return -2;
    } else if (tag.name.lastIndexOf('priority:', 0) === 0) {
      return -1;
    } else {
      return 0;
    }
  },

  sortedTagsForSinglePuzzle(tags) {
    // The sort order for tags should probably be:
    // * "is:metameta" first
    // * then "is:meta"
    // * "meta:*" comes next (sorted alphabetically, if multiple are present)
    // * all other tags, sorted alphabetically
    const sortedTags = _.toArray(tags);

    sortedTags.sort((a, b) => {
      const ia = this.soloTagInterestingness(a);
      const ib = this.soloTagInterestingness(b);
      if (ia !== ib) {
        return ia - ib;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

    return sortedTags;
  },

  render() {
    const tags = this.sortedTagsForSinglePuzzle(this.props.tags);
    const components = [];
    for (let i = 0; i < tags.length; i++) {
      components.push(
        <Tag
          key={tags[i]._id}
          tag={tags[i]}
          onRemove={this.state.removing ? this.removeTag : undefined}
          linkToSearch={this.props.linkToSearch}
        />
      );
    }

    if (this.state.editing) {
      components.push(
        <TagEditor
          key="tagEditor"
          puzzleId={this.props.puzzleId}
          onSubmit={this.submitTag}
          onCancel={this.stopEditing}
        />
      );
    } else if (this.state.removing) {
      components.push(
        <BS.Button
          key="stopRemoving"
          className="tag-modify-button"
          onClick={this.stopRemoving}
        >
          Done removing
        </BS.Button>
      );
    } else if (this.props.showControls && (this.props.onCreateTag || this.props.onRemoveTag)) {
      components.push(
        <BS.ButtonGroup key="editRemoveGroup">
          {this.props.onCreateTag && (
            <BS.Button
              title="Add tag..."
              key="startEditing"
              className="tag-modify-button"
              onClick={this.startEditing}
            >
              &#10133;
            </BS.Button>
          )}
          {this.props.onRemoveTag && tags.length > 0 && (
            <BS.Button
              title="Remove tag..."
              key="startRemoving"
              className="tag-modify-button"
              onClick={this.startRemoving}
            >
              &#10134;
            </BS.Button>
          )}
        </BS.ButtonGroup>
      );
    }

    return (
      <div className="tag-list">
        {components}
      </div>
    );
  },
});

const RelatedPuzzleGroup = React.createClass({
  displayName: 'RelatedPuzzleGroup',

  propTypes: {
    sharedTag: React.PropTypes.shape(tagShape).isRequired,
    relatedPuzzles: React.PropTypes.arrayOf(React.PropTypes.shape(puzzleShape)).isRequired,
    allTags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
    includeCount: React.PropTypes.bool,
    layout: React.PropTypes.string.isRequired,
    canUpdate: React.PropTypes.bool.isRequired,
  },

  getInitialState() {
    return {
      collapsed: false,
    };
  },

  toggleCollapse() {
    this.setState({
      collapsed: !this.state.collapsed,
    });
  },

  render() {
    // Sort the puzzles within each tag group by interestingness.  For instance, metas
    // should probably be at the top of the group, then of the round puzzles, unsolved should
    // maybe sort above solved, and then perhaps by unlock order.
    const tagIndex = _.indexBy(this.props.allTags, '_id');
    const sortedPuzzles = sortPuzzlesByRelevanceWithinPuzzleGroup(this.props.relatedPuzzles, this.props.sharedTag, tagIndex);

    return (
      <div className="puzzle-group">
        <div className="puzzle-group-header" onClick={this.toggleCollapse}>
          {this.state.collapsed ?
            <span className="glyphicon glyphicon-chevron-up" /> :
            <span className="glyphicon glyphicon-chevron-down" />}
          <Tag tag={this.props.sharedTag} linkToSearch={false} />
          {this.props.includeCount && <span>{`(${this.props.relatedPuzzles.length} other ${this.props.relatedPuzzles.length === 1 ? 'puzzle' : 'puzzles'})`}</span>}
        </div>
        {this.state.collapsed ? null :
          <div className="puzzle-list-wrapper">
            <PuzzleList
              puzzles={sortedPuzzles}
              allTags={this.props.allTags}
              layout={this.props.layout}
              canUpdate={this.props.canUpdate}
              suppressTags={[this.props.sharedTag._id]}
            />
          </div>}
      </div>
    );
  },
});

const RelatedPuzzleGroups = React.createClass({
  displayName: 'RelatedPuzzleGroups',
  propTypes: {
    activePuzzle: React.PropTypes.shape(puzzleShape).isRequired,
    allPuzzles: React.PropTypes.arrayOf(React.PropTypes.shape(puzzleShape)).isRequired,
    allTags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
    canUpdate: React.PropTypes.bool.isRequired,
    layout: React.PropTypes.string,
  },

  getDefaultProps() {
    return {
      layout: 'grid',
    };
  },

  relatedPuzzlesTagInterestingness(tag, metaForTagIfKnown) {
    // Maps a tag into an interestingness class.  Smaller numbers are more interesting.
    // group: tags go at the beginning of the list, because you're
    // most interested in the other puzzles from this meta/round.
    if (tag.name.lastIndexOf('group:', 0) === 0) {
      // If this puzzle has a meta-for:<something> tag, prioritize the
      // meta:<something> tag over all the others.
      if (metaForTagIfKnown) {
        const metaTagName = metaForTagIfKnown.name.slice('meta-for:'.length);
        const thisMetaName = tag.name.slice('group:'.length);
        if (metaTagName === thisMetaName) {
          return -2;
        }
      }

      return -1;
    } else {
      // Otherwise, use sort order
      return 0;
    }
  },

  sortedTagsForRelatedPuzzles(tags) {
    // Clone a copy of the tags.
    const tagList = _.toArray(tags);

    // Look for a tag that starts with 'meta-for:'.
    const metaForTag = _.filter(tags, (tag) => { return tag.name.lastIndexOf('meta-for:', 0) === 0; })[0];

    tagList.sort((a, b) => {
      const ia = this.relatedPuzzlesTagInterestingness(a, metaForTag);
      const ib = this.relatedPuzzlesTagInterestingness(b, metaForTag);
      if (ia !== ib) {
        return ia - ib;
      } else {
        // Just sort lexically within interestingness classes.
        return a.name.localeCompare(b.name);
      }
    });

    return tagList;
  },

  puzzlesWithTagIdExcept(puzzles, tagId, puzzleId) {
    return _.filter(puzzles, (p) => {
      return p._id !== puzzleId && p.tags.indexOf(tagId) !== -1;
    });
  },

  render() {
    // For each tag, collect all the other puzzles that also have that tag.
    const groups = [];
    const tagIndex = _.indexBy(this.props.allTags, '_id');

    // TODO: sort the tag groups by tag interestingness, which should probably be related to meta
    // presence/absence, tag group size, and number of solved/unsolved?
    const activePuzzleTags = this.sortedTagsForRelatedPuzzles(_.map(this.props.activePuzzle.tags, (tagId) => {
      return tagIndex[tagId];
    }));

    for (let tagi = 0; tagi < activePuzzleTags.length; tagi++) {
      const tag = activePuzzleTags[tagi];
      const puzzles = this.puzzlesWithTagIdExcept(this.props.allPuzzles, tag._id, this.props.activePuzzle._id);

      // Only include a tag/puzzleset if there are actually puzzles other than the activePuzzle
      // that hold this tag.
      if (puzzles.length) {
        groups.push({ tag, puzzles });
      }
    }

    // We also should probably have some ability to hide the current puzzle from a puzzle group, if
    // we're in a puzzle details page and just looking at related puzzles.  No need to waste
    // precious space on the current puzzle again.

    // Then, render tag group.

    return (
      <div>
        {groups.length ? groups.map((g) => {
          return (
            <RelatedPuzzleGroup
              key={g.tag._id}
              sharedTag={g.tag}
              relatedPuzzles={g.puzzles}
              allTags={this.props.allTags}
              includeCount
              layout={this.props.layout}
              canUpdate={this.props.canUpdate}
            />
          );
        }) : <span>No tags for this puzzle yet.</span>
        }
      </div>
    );
  },
});

export { PuzzleModalForm, PuzzleList, TagList, RelatedPuzzleGroup, RelatedPuzzleGroups };
