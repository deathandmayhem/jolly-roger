import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faFileAlt } from '@fortawesome/free-solid-svg-icons/faFileAlt';
import { faTable } from '@fortawesome/free-solid-svg-icons/faTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { DocumentType } from '../../lib/schemas/document';
import DeepLink from './DeepLink';

interface DocumentDisplayProps {
  document: DocumentType;
  displayMode: 'link' | 'embed';
}

const GoogleDocumentDisplay = (props: DocumentDisplayProps) => {
  let url: string;
  let deepUrl: string;
  let title: string;
  let icon: IconDefinition;
  switch (props.document.value.type) {
    case 'spreadsheet':
      url = `https://docs.google.com/spreadsheets/d/${props.document.value.id}/edit?ui=2&rm=embedded#gid=0`;
      deepUrl = `googlesheets://${url}`;
      title = 'Sheet';
      icon = faTable;
      break;
    case 'document':
      url = `https://docs.google.com/document/d/${props.document.value.id}/edit?ui=2&rm=embedded#gid=0`;
      deepUrl = `googledocs://${url}`;
      title = 'Doc';
      icon = faFileAlt;
      break;
    default:
      return (
        <span className="puzzle-document-message">
          Don&apos;t know how to link to a document of type
          {' '}
          {props.document.value.type}
        </span>
      );
  }

  switch (props.displayMode) {
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
          {props.displayMode}
        </span>
      );
  }
};

const DocumentDisplay = (props: DocumentDisplayProps) => {
  switch (props.document.provider) {
    case 'google':
      return (
        <GoogleDocumentDisplay
          document={props.document}
          displayMode={props.displayMode}
        />
      );
    default:
      return (
        <span className="puzzle-document-message">
          Unable to display document from provider
          {' '}
          {props.document.provider}
        </span>
      );
  }
};

export default DocumentDisplay;
