const BS = ReactBootstrap;

JRC.ModalButton = React.createClass({
  propTypes: {
    glyphicon: React.PropType.string.isRequired,
  },

  getInitialState() {
    return {showModal: false};
  },

  openModal() {
    this.setState({showModal: true});
  },

  closeModal() {
    this.setState({showModal: false});
  },

  render() {
    const modalProps = _.pick(this.props, 'children', ..._.keys(JRC.ModalForm.propTypes));
    const buttonProps = _.omit(this.props, 'glyphicon', ..._.keys(modalProps));
    return (
      <div>
        <BS.Button onClick={this.openModal} {...buttonProps}>
          <BS.Glyphicon glyph={this.props.glyphicon}/>
        </BS.Button>

        <JRC.ModalForm {...modalProps}/>
      </div>
    );
  },
});
