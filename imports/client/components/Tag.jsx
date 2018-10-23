import React from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/lib/Button';
import { Link } from 'react-router';
import classnames from 'classnames';
import tagShape from './tagShape.js';

/* eslint-disable max-len */

class Tag extends React.PureComponent {
  static displayName = 'Tag';

  static propTypes = {
    tag: PropTypes.shape(tagShape).isRequired,
    onRemove: PropTypes.func, // if present, show a dismiss button
    linkToSearch: PropTypes.bool.isRequired,
  };

  onRemove = () => {
    if (this.props.onRemove) {
      this.props.onRemove(this.props.tag._id);
    }
  };

  render() {
    const name = this.props.tag.name;
    const isAdministrivia = name === 'administrivia';
    const isMeta = name === 'is:meta' || name === 'is:metameta';
    const isGroup = name.lastIndexOf('group:', 0) === 0;
    const isMetaFor = name.lastIndexOf('meta-for:', 0) === 0;
    const isNeeds = name.lastIndexOf('needs:', 0) === 0;
    const isPriority = name.lastIndexOf('priority:', 0) === 0;
    const classNames = classnames('tag',
      isAdministrivia ? 'tag-administrivia' : null,
      isMeta ? 'tag-meta' : null,
      isGroup ? 'tag-group' : null,
      isMetaFor ? 'tag-meta-for' : null,
      isNeeds ? 'tag-needs' : null,
      isPriority ? 'tag-priority' : null);

    let title;
    if (this.props.linkToSearch) {
      title = (
        <Link
          to={{
            pathname: `/hunts/${this.props.tag.hunt}/puzzles`,
            query: { q: this.props.tag.name },
          }}
          className="tag-link"
        >
          {name}
        </Link>
      );
    } else {
      title = name;
    }

    return (
      <div className={classNames}>
        {title}
        {this.props.onRemove && <Button className="tag-remove-button" bsStyle="danger" onClick={this.onRemove}>&#10006;</Button>}
      </div>
    );
  }
}

export default Tag;
