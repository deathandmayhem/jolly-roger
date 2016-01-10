HuntApp = React.createClass({
  render() {
    return (
      <HuntMembershipVerifier huntId={this.props.params.huntId}>
        <div>
          <HuntAnnouncements huntId={this.props.params.huntId}/>
          {this.props.children}
        </div>
      </HuntMembershipVerifier>
    );
  },
});
