HuntApp = React.createClass({
  mixins: [ReactMeteorData],

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  getMeteorData() {
    this.context.subs.subscribe('mongo.hunts', {_id: this.props.params.huntId});
    return {hunt: Models.Hunts.findOne(this.props.params.huntId)};
  },

  render() {
    const title = this.data.hunt ? `${this.data.hunt.name} :: Jolly Roger` : '';

    return (
      <DocumentTitle title={title}>
        <HuntMembershipVerifier huntId={this.props.params.huntId}>
          <div>
            <HuntAnnouncements huntId={this.props.params.huntId}/>
            {this.props.children}
          </div>
        </HuntMembershipVerifier>
      </DocumentTitle>
    );
  },
});
