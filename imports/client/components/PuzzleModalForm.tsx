import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import Creatable from 'react-select/lib/Creatable';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';
import LabelledRadioGroup from './LabelledRadioGroup';
import ModalForm from './ModalForm';

/* eslint-disable max-len */

export interface PuzzleModalFormSubmitPayload {
  hunt: string;
  title: string;
  url: string;
  tags: string[];
  docType?: string;
  expectedAnswerCount: number;
}

interface PuzzleModalFormProps {
  huntId: string;
  puzzle?: PuzzleType;
  // All known tags for this hunt
  tags: TagType[];
  onSubmit: (payload: PuzzleModalFormSubmitPayload, callback: (error?: Error) => void) => void;
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
  expectedAnswerCount: number;
  submitState: PuzzleModalFormSubmitState;
  errorMessage: string;
  titleDirty: boolean;
  urlDirty: boolean;
  tagsDirty: boolean;
  expectedAnswerCountDirty: boolean;
}

class PuzzleModalForm extends React.Component<PuzzleModalFormProps, PuzzleModalFormState> {
  formRef: React.RefObject<ModalForm>;

  static displayName = 'PuzzleModalForm';

  constructor(props: PuzzleModalFormProps, context?: any) {
    super(props, context);
    const state = {
      submitState: PuzzleModalFormSubmitState.IDLE,
      errorMessage: '',
      titleDirty: false,
      urlDirty: false,
      tagsDirty: false,
      expectedAnswerCountDirty: false,
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
        expectedAnswerCount: 1,
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
      tags: value.map((v) => v.value),
      tagsDirty: true,
    });
  };

  onDocTypeChange = (newValue: string) => {
    this.setState({
      docType: newValue,
    });
  };

  onExpectedAnswerCountChange = (event: React.FormEvent<FormControl>) => {
    const string = (event as unknown as React.FormEvent<HTMLInputElement>).currentTarget.value;
    const value = Number(string);
    this.setState({
      expectedAnswerCount: value,
      expectedAnswerCountDirty: true,
    });
  };

  onFormSubmit = (callback: () => void) => {
    this.setState({ submitState: PuzzleModalFormSubmitState.SUBMITTING });
    const payload: PuzzleModalFormSubmitPayload = {
      hunt: this.props.huntId,
      title: this.state.title,
      url: this.state.url,
      tags: this.state.tags,
      expectedAnswerCount: this.state.expectedAnswerCount,
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
          expectedAnswerCountDirty: false,
        });
        callback();
      }
    });
  };

  tagNamesForIds = (tagIds: string[]) => {
    const tagNames: Record<string, string> = {};
    this.props.tags.forEach((t) => { tagNames[t._id] = t.name; });
    return tagIds.map((t) => tagNames[t]);
  };

  stateFromPuzzle = (puzzle: PuzzleType) => {
    return {
      title: puzzle.title,
      url: puzzle.url || '',
      tags: this.tagNamesForIds(puzzle.tags),
      expectedAnswerCount: puzzle.expectedAnswerCount,
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

  currentExpectedAnswerCount = () => {
    if (!this.state.expectedAnswerCountDirty && this.props.puzzle) {
      return this.props.puzzle.expectedAnswerCount;
    } else {
      return this.state.expectedAnswerCount;
    }
  };

  render() {
    const disableForm = this.state.submitState === PuzzleModalFormSubmitState.SUBMITTING;

    const selectOptions = [...this.props.tags.map((t) => t.name), ...this.state.tags]
      .filter(Boolean)
      .map((t) => {
        return { value: t, label: t };
      });

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

        <FormGroup>
          <ControlLabel className="col-xs-3" htmlFor="jr-new-puzzle-expected-answer-count">
            Expected # of answers
          </ControlLabel>
          <div className="col-xs-9">
            <FormControl
              id="jr-new-puzzle-expected-answer-count"
              type="number"
              disabled={disableForm}
              onChange={this.onExpectedAnswerCountChange}
              value={this.currentExpectedAnswerCount()}
              min={1}
              step={1}
            />
          </div>
        </FormGroup>

        {this.state.submitState === PuzzleModalFormSubmitState.FAILED && <Alert bsStyle="danger">{this.state.errorMessage}</Alert>}
      </ModalForm>
    );
  }
}

export default PuzzleModalForm;
