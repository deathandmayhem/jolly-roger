PuzzleListPage = React.createClass({
  // TODO: actually fetch puzzle data from DB
  render() {
    var allPuzzles = [];
    if (this.props.params.huntId === "2015") {
      allPuzzles = hunt_2015_puzzles;
    }
    return (
      <FilteringPuzzleSet puzzles={allPuzzles} />
    );
  },
});
