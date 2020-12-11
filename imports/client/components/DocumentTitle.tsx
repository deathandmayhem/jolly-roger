import React from 'react';
import withSideEffect from 'react-side-effect';

interface DocumentTitleProps {
  title: string;
}

class DocumentTitle extends React.Component<DocumentTitleProps> {
  render() {
    if (this.props.children) {
      return React.Children.only(this.props.children);
    } else {
      return null;
    }
  }
}

function reducePropsToState(propsList: DocumentTitleProps[]) {
  const innermostProps = propsList[propsList.length - 1];
  if (innermostProps) {
    return innermostProps.title;
  }
  return '';
}

function handleStateChangeOnClient(title: string) {
  document.title = title || '';
}

export default withSideEffect(
  reducePropsToState,
  handleStateChangeOnClient
)(DocumentTitle);
