JRC.BlazeTemplate = React.createClass({
  propTypes: {
    template: React.PropTypes.string.isRequired,
  },

  componentDidMount() {
    this.view = Blaze.render(Template[this.props.template], React.findDOMNode(this.refs.container));
  },

  componentWillUnmount() {
    Blaze.remove(this.view);
  },

  render() {
    // Render a placeholder that Blaze will replace
    return <span ref="container"/>;
  },
});
