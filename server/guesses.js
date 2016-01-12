function transitionGuess(guess, newState) {
  if (newState === guess.state) return;

  Models.Guesses.update({
    _id: guess._id,
  }, {
    $set: {
      state: newState,
    },
  });

  if (newState === 'correct') {
    // Mark this puzzle as solved.
    // TODO: run custom hook logic (e.g. archive Slack channel, etc.)
    Models.Puzzles.update({
      _id: guess.puzzle,
    }, {
      $set: {
        answer: guess.guess,
      },
    });
    const puzzle = Models.Puzzles.findOne(guess.puzzle);
    globalHooks.runPuzzleSolvedHooks(puzzle);
  } else if (guess.state === 'correct') {
    // Transitioning from correct -> something else: un-mark that puzzle as solved.
    // TODO: run custom hook login (e.g. unarchive Slack channel, etc.)
    Models.Puzzles.update({
      _id: guess.puzzle,
    }, {
      $unset: {
        answer: '',
      },
    });
    const puzzle = Models.Puzzles.findOne(guess.puzzle);
    globalHooks.runPuzzleNoLongerSolvedHooks(puzzle);
  }
}

Meteor.methods({
  addGuessForPuzzle(puzzleId, guess) {
    check(this.userId, String);
    check(puzzleId, String);
    check(guess, String);
    let puzzle = Models.Puzzles.findOne({
      _id: puzzleId,
    });

    Ansible.log('New guess', {hunt: puzzle.hunt, puzzle: puzzleId, user: this.userId, guess});
    Models.Guesses.insert({
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      guess: guess,
      state: 'pending',
    });
  },

  markGuessPending(guessId) {
    check(guessId, String);
    Roles.checkPermission(this.userId, 'mongo.guesses.update');
    let guess = Models.Guesses.findOne(guessId);
    Ansible.log('Transitioning guess to new state', {user: this.userId, guess: guess._id, state: 'pending'});
    transitionGuess(guess, 'pending');
  },

  markGuessCorrect(guessId) {
    check(guessId, String);
    Roles.checkPermission(this.userId, 'mongo.guesses.update');
    let guess = Models.Guesses.findOne(guessId);
    Ansible.log('Transitioning guess to new state', {user: this.userId, guess: guess._id, state: 'correct'});
    transitionGuess(guess, 'correct');
  },

  markGuessIncorrect(guessId) {
    check(guessId, String);
    Roles.checkPermission(this.userId, 'mongo.guesses.update');
    let guess = Models.Guesses.findOne(guessId);
    Ansible.log('Transitioning guess to new state', {user: this.userId, guess: guess._id, state: 'incorrect'});
    transitionGuess(guess, 'incorrect');
  },

  markGuessRejected(guessId) {
    check(guessId, String);
    Roles.checkPermission(this.userId, 'mongo.guesses.update');
    let guess = Models.Guesses.findOne(guessId);
    Ansible.log('Transitioning guess to new state', {user: this.userId, guess: guess._id, state: 'rejected'});
    transitionGuess(guess, 'rejected');
  },
});
