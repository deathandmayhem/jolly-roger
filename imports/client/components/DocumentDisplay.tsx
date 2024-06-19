import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faFileAlt } from "@fortawesome/free-solid-svg-icons/faFileAlt";
import { faTable } from "@fortawesome/free-solid-svg-icons/faTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import styled from "styled-components";
import type { DocumentType } from "../../lib/models/Documents";
import DeepLink from "./DeepLink";

interface DocumentDisplayProps {
  document: DocumentType;
  displayMode: "link" | "embed";
}

const StyledDeepLink = styled(DeepLink)`
  display: inline-block;
  font-weight: bold;
  white-space: nowrap;
`;

const StyledIframe = styled.iframe`
  /* Workaround for unusual sizing behavior of iframes in iOS Safari:
   * Width and height need to be specified in absolute values then adjusted by min and max */
  width: 0;
  height: 0;
  min-width: 100%;
  max-width: 100%;
  min-height: 100%;
  max-height: 100%;
  position: absolute;
  inset: 0;
  border: 0;
  padding-bottom: env(safe-area-inset-bottom, 0);
  background-color: #f1f3f4;
`;

export const DocumentMessage = styled.span`
  display: block;
  width: 100%;
  height: 100%;
  background-color: #ddf;
`;

const GoogleDocumentDisplay = ({
  document,
  displayMode,
}: DocumentDisplayProps) => {
  let url: string;
  let deepUrl: string;
  let title: string;
  let icon: IconDefinition;
  switch (document.value.type) {
    case "spreadsheet":
      url = `https://docs.google.com/spreadsheets/d/${document.value.id}/edit?ui=2&rm=embedded&gid=0#gid=0`;
      deepUrl = `googlesheets://${url}`;
      title = "Sheet";
      icon = faTable;
      break;
    case "document":
      url = `https://docs.google.com/document/d/${document.value.id}/edit?ui=2&rm=embedded#gid=0`;
      deepUrl = `googledocs://${url}`;
      title = "Doc";
      icon = faFileAlt;
      break;
    default:
      return (
        <DocumentMessage>
          Don&apos;t know how to link to a document of type{" "}
          {document.value.type}
        </DocumentMessage>
      );
  }

  switch (displayMode) {
    case "link":
      return (
        <StyledDeepLink nativeUrl={deepUrl} browserUrl={url}>
          <a href={url} target="new">
            <FontAwesomeIcon fixedWidth icon={icon} /> <span>{title}</span>
          </a>
        </StyledDeepLink>
      );
    case "embed":
      /* To workaround iOS Safari iframe behavior, scrolling should be "no" */
      return <StyledIframe title="document" scrolling="no" src={url} />;
    default:
      return (
        <DocumentMessage>Unknown displayMode {displayMode}</DocumentMessage>
      );
  }
};

const DocumentDisplay = ({ document, displayMode }: DocumentDisplayProps) => {
  switch (document.provider) {
    case "google":
      return (
        <GoogleDocumentDisplay document={document} displayMode={displayMode} />
      );
    default:
      return (
        <DocumentMessage>
          Unable to display document from provider {document.provider}
        </DocumentMessage>
      );
  }
};

export default DocumentDisplay;
