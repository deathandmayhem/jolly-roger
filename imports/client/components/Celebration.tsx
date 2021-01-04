import React from 'react';
import { Link } from 'react-router-dom';

interface CelebrationProps {
  url: string;
  title: string;
  answer: string;
  playAudio: boolean;
  onClose: () => void;
}

class Celebration extends React.Component<CelebrationProps> {
  private timer?: number;

  componentDidMount() {
    this.timer = window.setTimeout(() => { this.onClose(); }, 7000);
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    window.clearTimeout(this.timer);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  onClose = () => {
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  onKeyDown = (e: KeyboardEvent) => {
    // Dismiss the celebration on esc
    if (e.keyCode === 27) {
      this.onClose();
    }
  }

  maybeClose = (e: React.MouseEvent) => {
    // Dismiss the celebration if you click on the overlay div (outside the content)
    if (e.target === e.currentTarget) {
      this.onClose();
    }
  };

  render() {
    return (
      <div className="celebration-overlay" onClick={this.maybeClose}>
        <div className="celebration">
          <button type="button" className="close" onClick={this.onClose} aria-label="Close">
            <span aria-hidden="true">×</span>
          </button>
          {this.props.playAudio ? <audio src="/audio/applause.mp3" autoPlay /> : null}
          <h1>
            We solved
            {' '}
            <Link to={this.props.url}>{this.props.title}</Link>
            !
          </h1>
          <h2>
            Answer:
            {' '}
            <span className="answer">{this.props.answer}</span>
          </h2>
        </div>
      </div>
    );
  }
}

export default Celebration;
