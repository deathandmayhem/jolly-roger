import React from 'react';
import { Link } from 'react-router';

const Celebration = React.createClass({
  propTypes: {
    url: React.PropTypes.string.isRequired,
    title: React.PropTypes.string.isRequired,
    answer: React.PropTypes.string.isRequired,
    onClose: React.PropTypes.func.isRequired,
  },

  componentDidMount() {
    this.timer = window.setTimeout(() => { this.onClose(); }, 7000);
  },

  componentWillUnmount() {
    window.clearTimeout(this.timer);
  },

  onClose() {
    if (this.props.onClose) {
      this.props.onClose();
    }
  },

  maybeClose(e) {
    // Dismiss the celebration if you click on the overlay div (outside the content)
    if (e.target === e.currentTarget) {
      this.onClose();
    }
  },

  render() {
    return (
      <div className="celebration-overlay" onClick={this.maybeClose}>
        <div className="celebration">
          <button type="button" className="close" onClick={this.onClose} ariaLabel="Close">
            <span ariaHidden="true">×</span>
          </button>
          <audio src="/audio/applause.mp3" autoPlay />
          <h1>We solved <Link to={this.props.url}>{this.props.title}</Link>!</h1>
          <h2>Answer: <span className="answer">{this.props.answer}</span></h2>
        </div>
      </div>
    );
  },
});

export { Celebration };
