PuzzleListPage = React.createClass({
  mixins: [ReactMeteorData],
  getMeteorData() {
    if (_.has(huntFixtures, this.props.params.huntId)) {
      return {
        ready: true,
        allPuzzles: huntFixtures[this.props.params.huntId].puzzles,
      };
    }

    var handle = Meteor.subscribe('mongo.puzzles', {hunt: this.props.params.huntId});
    return {
      ready: handle.ready(),
      allPuzzles: Models.Puzzles.find({hunt: this.props.params.huntId}).fetch(),
    };
  },

  render() {
    if (!this.data.ready) {
      return <span>loading...</span>;
    } else {
      return <FilteringPuzzleSet puzzles={this.data.allPuzzles} />;
    }
  },
});
