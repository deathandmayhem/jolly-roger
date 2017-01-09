import React from 'react';
import BS, { Button } from 'react-bootstrap';

const ModalForm = React.createClass({
  propTypes: {
    title: React.PropTypes.string.isRequired,
    submitLabel: React.PropTypes.string,
    submitStyle: React.PropTypes.oneOf(Button.STYLES),
    submitDisabled: React.PropTypes.bool,
    onSubmit: React.PropTypes.func.isRequired,
    children: React.PropTypes.node,
    confirmationLabel: React.PropTypes.string,
  },

  getDefaultProps() {
    return {
      submitLabel: 'Save',
      submitStyle: 'primary',
    };
  },

  getInitialState() {
    return { show: false, showConfirmation: false };
  },

  onFormChanged() {
    this.setState({ showConfirmation: false });
  },

  show() {
    this.setState({ show: true, showConfirmation: false });
  },

  close() {
    this.setState({ show: false });
  },

  submit(e) {
    e.preventDefault();
    if (this.props.confirmationLabel && !this.state.showConfirmation) {
      this.setState({ showConfirmation: true });
    } else {
      this.props.onSubmit(() => {
        // For delete forms, it's possible that the component gets
        // deleted and unmounted before the callback gets called.
        if (this.isMounted()) { // eslint-disable-line react/no-is-mounted
          this.close();
        }
      });
    }
  },

  render() {
    return (
      <BS.Modal show={this.state.show} onHide={this.close}>
        <form className="form-horizontal" onSubmit={this.submit} onInput={this.onFormChanged}>
          <BS.Modal.Header closeButton>
            <BS.Modal.Title>
              {this.props.title}
            </BS.Modal.Title>
          </BS.Modal.Header>
          <BS.Modal.Body>
            {this.props.children}
            {this.state.showConfirmation &&
              <div className="text-warning .pull-left">{this.props.confirmationLabel}</div>
            }
          </BS.Modal.Body>
          <BS.Modal.Footer>
            <BS.Button
              bsStyle="default"
              onClick={this.close}
              disabled={this.props.submitDisabled}
            >
              Close
            </BS.Button>
            <BS.Button
              bsStyle={this.props.submitStyle}
              type="submit"
              disabled={this.props.submitDisabled}
            >
              {`${this.state.showConfirmation ? 'Confirm ' : ''}${this.props.submitLabel}`}
            </BS.Button>
          </BS.Modal.Footer>
        </form>
      </BS.Modal>
    );
  },
});

export { ModalForm };
