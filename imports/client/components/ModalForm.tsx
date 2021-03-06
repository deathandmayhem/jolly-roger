import React from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

interface ModalFormProps {
  title: string;
  submitLabel?: string;
  submitStyle?: string;
  submitDisabled?: boolean;
  onSubmit: (callback: () => void) => void;
  children: React.ReactNode;
}

interface ModalFormState {
  show: boolean;
}

class ModalForm extends React.Component<ModalFormProps, ModalFormState> {
  private dontTryToClose?: boolean;

  static defaultProps = {
    submitLabel: 'Save',
    submitStyle: 'primary',
  };

  constructor(props: ModalFormProps) {
    super(props);
    this.state = { show: false };
  }

  componentWillUnmount() {
    this.dontTryToClose = true;
  }

  show = () => {
    this.setState({ show: true });
  };

  close = () => {
    this.setState({ show: false });
  };

  submit = (e: React.FormEvent) => {
    e.preventDefault();
    this.props.onSubmit(() => {
      // For delete forms, it's possible that the component gets
      // deleted and unmounted before the callback gets called.
      if (!this.dontTryToClose) {
        this.close();
      }
    });
  };

  render() {
    // Note: the animation=false is working around a regression in
    // react-bootstrap that otherwise breaks autofocus:
    // https://github.com/react-bootstrap/react-bootstrap/issues/5102
    // There's a way to avoid breaking things without losing animation,
    // but then we'd need to hold a ref to the `autoFocus` child to explicitly
    // focus it in the Modal's `onEntered` callback, and from within this
    // class we don't know which of the children should receive focus. So
    // we just disable animations for now.  Makes the UI feel snappier anyway.
    return (
      <Modal
        animation={false}
        show={this.state.show}
        onHide={this.close}
      >
        <form className="form-horizontal" onSubmit={this.submit}>
          <Modal.Header closeButton>
            <Modal.Title>
              {this.props.title}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {this.props.children}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="light"
              onClick={this.close}
              disabled={this.props.submitDisabled}
            >
              Close
            </Button>
            <Button
              variant={this.props.submitStyle}
              type="submit"
              disabled={this.props.submitDisabled}
            >
              {this.props.submitLabel}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    );
  }
}

export default ModalForm;
