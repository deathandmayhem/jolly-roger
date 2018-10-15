import React from 'react';
import PropTypes from 'prop-types';
import PureRenderMixin from 'react-addons-pure-render-mixin';

const PuzzleAnswer = React.createClass({
  displayName: 'PuzzleAnswer',
  propTypes: {
    answer: PropTypes.string.isRequired,
  },
  mixins: [PureRenderMixin],
  render() {
    return (
      <span className="answer-wrapper">
        <span className="answer">
          {this.props.answer}
        </span>
      </span>
    );
  },
});

export default PuzzleAnswer;
