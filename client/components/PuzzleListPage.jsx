PuzzleListPage = React.createClass({
  // TODO: actually fetch puzzle data from DB
  render() {
    var allPuzzles = [];
    if (this.props.params.huntId === '2015') {
      allPuzzles = hunt2015Puzzles;
    }

    return (
      <FilteringPuzzleSet puzzles={allPuzzles} />
    );
  },
});
