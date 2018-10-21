import PropTypes from 'prop-types';
import React from 'react';
import Button from 'react-bootstrap/lib/Button';
import Modal from 'react-bootstrap/lib/Modal';

const ModalForm = React.createClass({
  propTypes: {
    title: PropTypes.string.isRequired,
    submitLabel: PropTypes.string,
    submitStyle: PropTypes.oneOf(Button.STYLES),
    submitDisabled: PropTypes.bool,
    onSubmit: PropTypes.func.isRequired,
    children: PropTypes.node,
  },

  getDefaultProps() {
    return {
      submitLabel: 'Save',
      submitStyle: 'primary',
    };
  },

  getInitialState() {
    return { show: false };
  },

  componentWillUnmount() {
    this.dontTryToClose = true;
  },

  show() {
    this.setState({ show: true });
  },

  close() {
    this.setState({ show: false });
  },

  submit(e) {
    e.preventDefault();
    this.props.onSubmit(() => {
      // For delete forms, it's possible that the component gets
      // deleted and unmounted before the callback gets called.
      if (!this.dontTryToClose) {
        this.close();
      }
    });
  },

  render() {
    return (
      <Modal show={this.state.show} onHide={this.close}>
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
              bsStyle="default"
              onClick={this.close}
              disabled={this.props.submitDisabled}
            >
              Close
            </Button>
            <Button
              bsStyle={this.props.submitStyle}
              type="submit"
              disabled={this.props.submitDisabled}
            >
              {this.props.submitLabel}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    );
  },
});

export default ModalForm;
