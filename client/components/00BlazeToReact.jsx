BlazeToReact = React.createClass({
  renderBlaze() {
    this.removeBlaze();
    this.view = Blaze.renderWithData(
      Template[this.props.blazeTemplate],
      _.omit(this.props, 'blazeTemplate'),
      ReactDOM.findDOMNode(this.refs.blazeParentTag)
    );
  },

  removeBlaze() {
    if (this.view) Blaze.remove(this.view);
  },

  componentDidUpdate() {
    this.renderBlaze();
  },

  componentDidMount() {
    this.renderBlaze();
  },

  componentWillUnmount() {
    this.removeBlaze();
  },

  render() {
    return <div ref="blazeParentTag"/>;
  },
});

