import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faTable, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { DocumentType } from '../../lib/schemas/documents';
import DeepLink from './DeepLink';

interface DocumentDisplayProps {
  document: DocumentType;
  displayMode: 'link' | 'embed';
}

class GoogleDocumentDisplay extends React.Component<DocumentDisplayProps> {
  render() {
    let url: string;
    let deepUrl: string;
    let title: string;
    let icon: IconDefinition;
    switch (this.props.document.value.type) {
      case 'spreadsheet':
        url = `https://docs.google.com/spreadsheets/d/${this.props.document.value.id}/edit?ui=2&rm=embedded#gid=0`;
        deepUrl = `googlesheets://${url}`;
        title = 'Sheet';
        icon = faTable;
        break;
      case 'document':
        url = `https://docs.google.com/document/d/${this.props.document.value.id}/edit?ui=2&rm=embedded#gid=0`;
        deepUrl = `googledocs://${url}`;
        title = 'Doc';
        icon = faFileAlt;
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
            <a href={url} target="new">
              <FontAwesomeIcon fixedWidth icon={icon} />
              {' '}
              <span className="link-label">{title}</span>
            </a>
          </DeepLink>
        );
      case 'embed':
        /* To workaround iOS Safari iframe behavior, scrolling should be "no" */
        return (
          <iframe title="document" className="gdrive-embed" scrolling="no" src={url} />
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

class DocumentDisplay extends React.Component<DocumentDisplayProps> {
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
