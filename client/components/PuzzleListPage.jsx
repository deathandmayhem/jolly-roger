PuzzleListPage = React.createClass({
  mixins: [ReactMeteorData],
  getMeteorData() {
    if (_.has(huntFixtures, this.props.params.huntId)) {
      return {
        ready: true,
        allPuzzles: huntFixtures[this.props.params.huntId].puzzles,
        allTags: huntFixtures[this.props.params.huntId].tags,
      };
    }

    var puzzlesHandle = Meteor.subscribe('mongo.puzzles', {hunt: this.props.params.huntId});
    var tagsHandle = Meteor.subscribe('mongo.tags', {hunt: this.props.params.huntId});
    let ready = puzzlesHandle.ready() && tagsHandle.ready();
    if (!ready) {
      return {
        ready,
      };
    } else {
      return {
        ready,
        allPuzzles: Models.Puzzles.find({hunt: this.props.params.huntId}).fetch(),
        allTags: Models.Tags.find({hunt: this.props.params.huntId}).fetch(),
      };
    }
  },

  render() {
    if (!this.data.ready) {
      return <span>loading...</span>;
    } else {
      return <FilteringPuzzleSet puzzles={this.data.allPuzzles} tags={this.data.allTags} />;
    }
  },
});
