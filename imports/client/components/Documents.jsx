import PropTypes from 'prop-types';
import React from 'react';
import Button from 'react-bootstrap/lib/Button';
import DeepLink from './DeepLink.jsx';
import DocumentsSchema from '../../lib/schemas/documents.js';

class GoogleDocumentDisplay extends React.Component {
  static propTypes = {
    document: PropTypes.shape(DocumentsSchema.asReactPropTypes()).isRequired,
    displayMode: PropTypes.oneOf(['link', 'embed']),
  };

  render() {
    let url;
    let deepUrl;
    let title;
    switch (this.props.document.value.type) {
      case 'spreadsheet':
        url = `https://docs.google.com/spreadsheets/d/${this.props.document.value.id}/edit?ui=2&rm=embedded#gid=0`;
        deepUrl = `googlesheets://${url}`;
        title = 'worksheet';
        break;
      case 'document':
        url = `https://docs.google.com/document/d/${this.props.document.value.id}/edit?ui=2&rm=embedded#gid=0`;
        title = 'document';
        break;
      default:
        return (
          <span className="puzzle-document-message">
            Don&apos;t know how to link to a document of type
            {' '}
            {this.props.document.value.type}
          </span>
        );
    }

    switch (this.props.displayMode) {
      case 'link':
        return (
          <DeepLink className="gdrive-button" nativeUrl={deepUrl} browserUrl={url}>
            <Button>
              Open
              {' '}
              {title}
            </Button>
          </DeepLink>
        );
      case 'embed':
        return (
          <iframe title="document" className="gdrive-embed" src={url} />
        );
      default:
        return (
          <span className="puzzle-document-message">
            Unknown displayMode
            {' '}
            {this.props.displayMode}
          </span>
        );
    }
  }
}

class DocumentDisplay extends React.Component {
  static propTypes = {
    document: PropTypes.shape(DocumentsSchema.asReactPropTypes()).isRequired,
    displayMode: PropTypes.oneOf(['link', 'embed']),
  };

  render() {
    switch (this.props.document.provider) {
      case 'google':
        return (
          <GoogleDocumentDisplay
            document={this.props.document}
            displayMode={this.props.displayMode}
          />
        );
      default:
        return (
          <span className="puzzle-document-message">
            Unable to display document from provider
            {' '}
            {this.props.document.provider}
          </span>
        );
    }
  }
}

export default DocumentDisplay;
