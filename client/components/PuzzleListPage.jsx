PuzzleListPage = React.createClass({
  mixins: [ReactMeteorData],
  getMeteorData() {
    if (this.props.params.huntId === '2015') {
      return {
        ready: true,
        allPuzzles: hunt2015Puzzles,
      };
    }

    var handle = Meteor.subscribe('mongo.puzzles', {hunt: this.props.params.huntId});
    return {
      ready: handle.ready(),
      allPuzzles: Models.Puzzles.find({hunt: this.props.params.huntId}).fetch(),
    };
  },

  render() {
    lastData = this.data;
    return (this.data.ready ?
      <FilteringPuzzleSet puzzles={this.data.allPuzzles} /> :
      <span>loading...</span>
    );
  },
});
