import { _ } from 'meteor/underscore';
import React from 'react';
import PropTypes from 'prop-types';
import { jQuery } from 'meteor/jquery';
import Alert from 'react-bootstrap/lib/Alert';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import LabelledRadioGroup from './LabelledRadioGroup.jsx';
import ModalForm from './ModalForm.jsx';
import ReactSelect2 from './ReactSelect2.jsx';
import puzzleShape from './puzzleShape.js';
import tagShape from './tagShape.js';

/* eslint-disable max-len */

const PuzzleModalForm = React.createClass({
  displayName: 'PuzzleModalForm',
  propTypes: {
    huntId: PropTypes.string.isRequired,
    puzzle: PropTypes.shape(puzzleShape),
    tags: PropTypes.arrayOf( // All known tags for this hunt
      PropTypes.shape(tagShape).isRequired,
    ).isRequired,
    onSubmit: PropTypes.func.isRequired,
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
      tags: puzzle.tags.map(t => tagNames[t]),
    };
  },

  show() {
    this.formNode.show();
  },

  render() {
    const disableForm = this.state.submitState === 'submitting';

    const allTags = _.compact(_.union(this.props.tags.map(t => t.name), this.state.tags));

    const docTypeSelector = (
      <FormGroup>
        <ControlLabel className="col-xs-3" htmlFor="jr-new-puzzle-doc-type">
          Document type
        </ControlLabel>
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
      </FormGroup>
    );

    return (
      <ModalForm
        ref={(node) => { this.formNode = node; }}
        title={this.props.puzzle ? 'Edit puzzle' : 'Add puzzle'}
        onSubmit={this.onFormSubmit}
        submitDisabled={disableForm}
      >
        <FormGroup>
          <ControlLabel className="col-xs-3" htmlFor="jr-new-puzzle-title">
            Title
          </ControlLabel>
          <div className="col-xs-9">
            <FormControl
              id="jr-new-puzzle-title"
              type="text"
              autoFocus
              disabled={disableForm}
              onChange={this.onTitleChange}
              value={this.state.title}
            />
          </div>
        </FormGroup>

        <FormGroup>
          <ControlLabel className="col-xs-3" htmlFor="jr-new-puzzle-url">
            URL
          </ControlLabel>
          <div className="col-xs-9">
            <FormControl
              id="jr-new-puzzle-url"
              type="text"
              disabled={disableForm}
              onChange={this.onUrlChange}
              value={this.state.url}
            />
          </div>
        </FormGroup>

        <FormGroup>
          <ControlLabel className="col-xs-3" htmlFor="jr-new-puzzle-tags">
            Tags
          </ControlLabel>
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
        </FormGroup>

        {!this.props.puzzle && docTypeSelector}

        {this.state.submitState === 'failed' && <Alert bsStyle="danger">{this.state.errorMessage}</Alert>}
      </ModalForm>
    );
  },
});

export default PuzzleModalForm;
