const BS = ReactBootstrap;

JRC.ModalForm = React.createClass({
  propTypes: {
    title: React.PropTypes.string.isRequired,
    submitLabel: React.PropTypes.string,
    onClose: React.PropTypes.func,
    onSubmit: React.PropTypes.func.isRequired,
  },

  getInitialState() {
    return {show: false};
  },

  show() {
    this.setState({show: true});
  },

  close() {
    this.setState({show: false});
  },

  getDefaultProps() {
    return {
      submitLabel: 'Save',
    };
  },

  submit(e) {
    e.preventDefault();
    if (this.props.onSubmit) {
      this.props.onSubmit(this.close);
    }
  },

  render() {
    return (
      <BS.Modal show={this.state.show} onHide={this.close}>
        <form className="form-horizontal" onSubmit={this.submit}>
          <BS.Modal.Header closeButton>
            <BS.Modal.Title>
              {this.props.title}
            </BS.Modal.Title>
          </BS.Modal.Header>
          <BS.Modal.Body>
            {this.props.children}
          </BS.Modal.Body>
          <BS.Modal.Footer>
            <BS.Button bsStyle="default" onClick={this.close}>Close</BS.Button>
            <BS.Button bsStyle="primary" type="submit">{this.props.submitLabel}</BS.Button>
          </BS.Modal.Footer>
        </form>
      </BS.Modal>
    );
  },
});
