import { _ } from 'meteor/underscore';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as Alert from 'react-bootstrap/lib/Alert';
import * as ControlLabel from 'react-bootstrap/lib/ControlLabel';
import * as FormControl from 'react-bootstrap/lib/FormControl';
import * as FormGroup from 'react-bootstrap/lib/FormGroup';
import Creatable from 'react-select/lib/Creatable';
import LabelledRadioGroup from './LabelledRadioGroup';
import ModalForm from './ModalForm';
import puzzleShape from './puzzleShape';
import tagShape from './tagShape';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';

/* eslint-disable max-len */

export interface PuzzleModalFormSubmitPayload {
  hunt: string;
  title: string;
  url: string;
  tags: string[];
  docType?: string;
}

interface PuzzleModalFormProps {
  huntId: string;
  puzzle?: PuzzleType;
  tags: TagType[];
  onSubmit: (payload: PuzzleModalFormSubmitPayload, callback: (error: Error) => void) => void;
  showOnMount?: boolean;
}

enum PuzzleModalFormSubmitState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  FAILED = 'failed',
}

interface PuzzleModalFormState {
  title: string;
  url: string;
  tags: string[];
  docType?: string;
  submitState: PuzzleModalFormSubmitState;
  errorMessage: string;
  titleDirty: boolean;
  urlDirty: boolean;
  tagsDirty: boolean;
}

class PuzzleModalForm extends React.Component<PuzzleModalFormProps, PuzzleModalFormState> {
  static displayName = 'PuzzleModalForm';

  static propTypes = {
    huntId: PropTypes.string.isRequired,
    puzzle: PropTypes.shape(puzzleShape),
    tags: PropTypes.arrayOf( // All known tags for this hunt
      PropTypes.shape(tagShape).isRequired,
    ).isRequired,
    onSubmit: PropTypes.func.isRequired,
    showOnMount: PropTypes.bool,
  };

  constructor(props: PuzzleModalFormProps, context?: any) {
    super(props, context);
    const state = {
      submitState: PuzzleModalFormSubmitState.IDLE,
      errorMessage: '',
      titleDirty: false,
      urlDirty: false,
      tagsDirty: false,
    };

    this.formRef = React.createRef();

    if (props.puzzle) {
      this.state = Object.assign(state, this.stateFromPuzzle(props.puzzle));
    } else {
      this.state = Object.assign(state, {
        title: '',
        url: '',
        tags: [],
        docType: 'spreadsheet',
      });
    }
  }

  componentDidMount() {
    if (this.props.showOnMount) {
      this.show();
    }
  }

  // All of these are typed to take React.FormEvent<FormControl>, but that's a
  // bug in the type declarations - they actually take a
  // React.FormEvent<HTMLInputElement> (or whatever componentClass is set to on
  // the FormControl)

  onTitleChange = (event: React.FormEvent<FormControl>) => {
    this.setState({
      title: (event as unknown as React.FormEvent<HTMLInputElement>).currentTarget.value,
      titleDirty: true,
    });
  };

  onUrlChange = (event: React.FormEvent<FormControl>) => {
    this.setState({
      url: (event as unknown as React.FormEvent<HTMLInputElement>).currentTarget.value,
      urlDirty: true,
    });
  };

  onTagsChange = (value: {label: string, value: string}[] | undefined | null) => {
    if (!value) {
      return;
    }
    this.setState({
      tags: value.map(v => v.value),
      tagsDirty: true,
    });
  };

  onDocTypeChange = (newValue: string) => {
    this.setState({
      docType: newValue,
    });
  };

  onFormSubmit = (callback: () => void) => {
    this.setState({ submitState: PuzzleModalFormSubmitState.SUBMITTING });
    const payload: PuzzleModalFormSubmitPayload = {
      hunt: this.props.huntId,
      title: this.state.title,
      url: this.state.url,
      tags: this.state.tags,
    };
    if (this.state.docType) {
      payload.docType = this.state.docType;
    }
    this.props.onSubmit(payload, (error) => {
      if (error) {
        this.setState({
          submitState: PuzzleModalFormSubmitState.FAILED,
          errorMessage: error.message,
        });
      } else {
        this.setState({
          submitState: PuzzleModalFormSubmitState.IDLE,
          errorMessage: '',
          titleDirty: false,
          urlDirty: false,
          tagsDirty: false,
        });
        callback();
      }
    });
  };

  tagNamesForIds = (tagIds: string[]) => {
    const tagNames: Record<string, string> = {};
    _.each(this.props.tags, (t) => { tagNames[t._id] = t.name; });
    return tagIds.map(t => tagNames[t]);
  };

  stateFromPuzzle = (puzzle: PuzzleType) => {
    return {
      title: puzzle.title,
      url: puzzle.url || '',
      tags: this.tagNamesForIds(puzzle.tags),
    };
  };

  show = () => {
    if (this.formRef.current) {
      this.formRef.current.show();
    }
  };

  currentTitle = () => {
    if (!this.state.titleDirty && this.props.puzzle) {
      return this.props.puzzle.title;
    } else {
      return this.state.title;
    }
  };

  currentUrl = () => {
    if (!this.state.urlDirty && this.props.puzzle) {
      return this.props.puzzle.url;
    } else {
      return this.state.url;
    }
  };

  currentTags = () => {
    if (!this.state.tagsDirty && this.props.puzzle) {
      return this.tagNamesForIds(this.props.puzzle.tags);
    } else {
      return this.state.tags;
    }
  };

  formRef: React.RefObject<ModalForm>;

  render() {
    const disableForm = this.state.submitState === PuzzleModalFormSubmitState.SUBMITTING;

    const selectOptions = _.chain(this.props.tags)
      .map(t => t.name)
      .union(this.state.tags)
      .compact()
      .map((t) => {
        return { value: t, label: t };
      })
      .value();

    const docTypeSelector = !this.props.puzzle && this.state.docType ? (
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
    ) : null;

    return (
      <ModalForm
        ref={this.formRef}
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
              value={this.currentTitle()}
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
              value={this.currentUrl()}
            />
          </div>
        </FormGroup>

        <FormGroup>
          <ControlLabel className="col-xs-3" htmlFor="jr-new-puzzle-tags">
            Tags
          </ControlLabel>
          <div className="col-xs-9">
            <Creatable
              id="jr-new-puzzle-tags"
              options={selectOptions}
              isMulti
              disabled={disableForm}
              onChange={this.onTagsChange as any /* onChange type declaration doesn't understand isMulti */}
              value={this.currentTags().map((t) => { return { label: t, value: t }; })}
            />
          </div>
        </FormGroup>

        {docTypeSelector}

        {this.state.submitState === PuzzleModalFormSubmitState.FAILED && <Alert bsStyle="danger">{this.state.errorMessage}</Alert>}
      </ModalForm>
    );
  }
}

export default PuzzleModalForm;
