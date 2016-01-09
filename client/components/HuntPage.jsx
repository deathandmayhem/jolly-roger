const {Link} = ReactRouter;

HuntPage = React.createClass({
  render() {
    return (
      <div>
        <h1>Hunt name</h1>
        <ul>
          <li><Link to={`/hunts/${this.props.params.huntId}/puzzles`}>Puzzles</Link></li>
          <li><Link to={`/hunts/${this.props.params.huntId}/announcements`}>Announcements</Link></li>
          <li><Link to={`/hunts/${this.props.params.huntId}/guesses`}>Guess queue</Link></li>
        </ul>
      </div>
    );
  },
});
