/* eslint-disable react/no-array-index-key */
import {
  faChevronLeft,
  faChevronRight,
  faPaperclip,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { faDownload } from "@fortawesome/free-solid-svg-icons/faDownload";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as he from "he";
import type { Token, Tokens } from "marked";
import { marked } from "marked";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { shortCalendarTimeFormat } from "../../lib/calendarTimeFormat";
import chatMessageNodeType from "../../lib/chatMessageNodeType";
import type {
  ChatAttachmentType,
  ChatMessageContentType,
} from "../../lib/models/ChatMessages";
import type { PuzzleType } from "../../lib/models/Puzzles";
import nodeIsMention from "../../lib/nodeIsMention";
import { computeSolvedness } from "../../lib/solvedness";
import type { Theme } from "../theme";
import { MentionSpan, PuzzleSpan } from "./FancyEditor";
import {
  LightboxOverlay,
  LightboxContent,
  LightboxButton,
  LightboxImage,
  TopRightButtonGroup,
} from "./Lightbox";

// This file implements standalone rendering for the MessageElement format
// defined by FancyEditor, for use in the chat pane.

const PreWrapSpan = styled.span`
  white-space: pre-wrap;
`;

const PreWrapParagraph = styled.p`
  display: inline;
  white-space: pre-wrap;
  margin-bottom: 0;
`;

const StyledBlockquote = styled.blockquote`
  border-left: 2px solid #88a;
  padding-left: 4px;
  margin-bottom: 0;
`;

const StyledCodeBlock = styled.code<{ theme: Theme }>`
  white-space: pre-wrap;
  display: block;
  border-radius: 4px;
  padding: 4px;
  width: 100%;
  background-color: ${({ theme }) => theme.colors.codeBlockBackground};
  color: ${({ theme }) => theme.colors.codeBlockText};
  margin-bottom: 0;
`;

const AttachmentLinkTrigger = styled.a`
  cursor: pointer;
  color: ${(props) => props.theme.colors.linkColor ?? "#0d6efd"};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    color: ${(props) => props.theme.colors.linkHoverColor ?? "#0a58ca"};
  }

  small {
    /* Ensure small tag inherits color */
    color: inherit;
  }
`;

// Renders a markdown token to React components.
const MarkdownToken = ({ token }: { token: Token }) => {
  // NOTE: Marked's lexer encodes using HTML entities in the text; see:
  // https://github.com/markedjs/marked/discussions/1737
  // We need to decode the text since React will apply its own escaping.
  if (token.type === "text") {
    return <PreWrapSpan>{token.raw}</PreWrapSpan>;
  } else if (token.type === "space") {
    return <PreWrapSpan>{token.raw}</PreWrapSpan>;
  } else if (token.type === "paragraph") {
    // If the raw text includes a newline but the consumed text does not,
    // insert the additional space at the end.
    const children = (token as Tokens.Paragraph).tokens.map((t, i) => (
      <MarkdownToken key={i} token={t} />
    ));
    const decodedText = he.decode(token.text);
    if (token.raw.length > decodedText.length) {
      const trail = token.raw.substring(decodedText.length);
      if (trail.trim() === "") {
        const syntheticSpace: Tokens.Space = {
          type: "space",
          raw: trail,
        };
        children.push(
          <MarkdownToken key={children.length} token={syntheticSpace} />,
        );
      }
    }
    return <PreWrapParagraph>{children}</PreWrapParagraph>;
  } else if (token.type === "link") {
    // Truncate the link href
    let displayedHref = token.href;
    const pathStart = token.href.indexOf("/", rootStart + 2); // Find the start of the path
    if (pathStart !== -1 && token.href.length - pathStart > 50) {
      displayedHref = `${token.href.slice(0, pathStart + 10)}... [truncated]`;
    }

    return (
      <a
        target="_blank"
        rel="noopener noreferrer"
        title={token.href}
        href={token.href}
      >
        {displayedHref} {/* Display the truncated href */}
      </a>
    );

    // return (
    //   <a target="_blank" rel="noopener noreferrer" href={token.href}>
    //     {children}
    //   </a>
    // );
  } else if (token.type === "blockquote") {
    const children = (token as Tokens.Blockquote).tokens.map((t, i) => (
      <MarkdownToken key={i} token={t} />
    ));
    return <StyledBlockquote>{children}</StyledBlockquote>;
  } else if (token.type === "strong") {
    const children = (token as Tokens.Strong).tokens.map((t, i) => (
      <MarkdownToken key={i} token={t} />
    ));
    if (token.raw.startsWith("__")) {
      return <u>{children}</u>;
    } else {
      return <strong>{children}</strong>;
    }
  } else if (token.type === "em") {
    const children = (token as Tokens.Em).tokens.map((t, i) => (
      <MarkdownToken key={i} token={t} />
    ));
    return <em>{children}</em>;
  } else if (token.type === "del") {
    const children = (token as Tokens.Del).tokens.map((t, i) => (
      <MarkdownToken key={i} token={t} />
    ));
    return <del>{children}</del>;
  } else if (token.type === "codespan") {
    const decodedText = he.decode(token.text);
    return <code>{decodedText}</code>;
  } else if (token.type === "code") {
    // Text in code blocks is _not_ encoded, so pass it through as is.
    return <StyledCodeBlock>{token.text}</StyledCodeBlock>;
  } else {
    // Unhandled token types: just return the raw string with pre-wrap.
    // This covers things like bulleted or numbered lists, which we explicitly
    // do not want to render semantically because markdown does terribly
    // surprising things with the numbers in ordered lists and only supporting
    // unordered lists would be confusing.
    return <PreWrapSpan>{token.raw}</PreWrapSpan>;
  }
};

const ChatMessage = ({
  message,
  displayNames,
  puzzleData,
  selfUserId,
  timestamp,
  attachments,
}: {
  message: ChatMessageContentType;
  displayNames: Map<string, string>;
  puzzleData: Map<string, PuzzleType> | object;
  selfUserId: string;
  timestamp?: Date;
  attachments: ChatAttachmentType[];
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const imageAttachments = useMemo(
    () => attachments?.filter((a) => a.mimeType.startsWith("image/")) ?? [],
    [attachments],
  );
  const openLightbox = useCallback((index: number) => {
    setCurrentImageIndex(index);
    setIsLightboxOpen(true);
  }, []);
  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
  }, []);
  const navigateLightbox = useCallback(
    (direction: "prev" | "next") => {
      setCurrentImageIndex((prevIndex) => {
        if (direction === "prev") {
          return prevIndex > 0 ? prevIndex - 1 : imageAttachments.length - 1;
        } else {
          return prevIndex < imageAttachments.length - 1 ? prevIndex + 1 : 0;
        }
      });
    },
    [imageAttachments.length],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isLightboxOpen) {
        if (event.key === "Escape") {
          closeLightbox();
        } else if (event.key === "ArrowLeft") {
          navigateLightbox("prev");
        } else if (event.key === "ArrowRight") {
          navigateLightbox("next");
        }
      }
    };

    if (isLightboxOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLightboxOpen, closeLightbox, navigateLightbox]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      closeLightbox();
    }
  };

  const children = message.children.map((child, i) => {
    if (nodeIsMention(child)) {
      const displayName = displayNames.get(child.userId);
      return (
        <MentionSpan key={i} $isSelf={child.userId === selfUserId}>
          @{`${displayName ?? child.userId}`}
        </MentionSpan>
      );
    } else if (chatMessageNodeType(child) === "puzzle") {
      const puzzle = puzzleData ? puzzleData.get(child.puzzleId) : null;
      if (puzzle) {
        const solvedness = computeSolvedness(puzzle);
        return (
          <PuzzleSpan key={i} $solvedness={solvedness}>
            <FontAwesomeIcon icon={faPuzzlePiece} />{" "}
            <Link
              target="_blank"
              to={`/hunts/${puzzle.hunt}/puzzles/${child.puzzleId}`}
            >
              {puzzle?.title ?? "(unnamed puzzle)"}
            </Link>
          </PuzzleSpan>
        );
      }
      return (
        <MentionSpan key={i} isSelf={false}>
          <FontAwesomeIcon icon={faPuzzlePiece} />{" "}
          {puzzle?.title ?? "(unknown puzzle)"}
        </MentionSpan>
      );
    } else {
      const tokensList = marked.lexer(child.text);
      return tokensList.map((token, j) => {
        return <MarkdownToken key={j} token={token} />;
      });
    }
  });

  return (
    <div>
      {timestamp ? (
        <span>
          {shortCalendarTimeFormat(timestamp)}:<br />
        </span>
      ) : null}
      {children}
      {attachments?.map((a) => {
        const isImage = a.mimeType.startsWith("image/");
        if (isImage) {
          const imageIndex = imageAttachments.findIndex(
            (img) => img.url === a.url,
          );
          return (
            <React.Fragment key={a.url}>
              <br />
              <AttachmentLinkTrigger
                href={a.url}
                onClick={(e) => {
                  e.preventDefault();
                  if (imageIndex >= 0) {
                    openLightbox(imageIndex);
                  }
                }}
                title={`View image: ${a.filename}`}
              >
                <small>
                  <FontAwesomeIcon icon={faPaperclip} size="sm" />{" "}
                  <em>{a.filename}</em>
                </small>
              </AttachmentLinkTrigger>
            </React.Fragment>
          );
        } else {
          return (
            <React.Fragment key={a.url}>
              <br />
              <Link
                to={a.url}
                target="_blank"
                title={`Download: ${a.filename}`}
                download={imageAttachments[currentImageIndex]?.filename}
              >
                <small>
                  <FontAwesomeIcon icon={faPaperclip} size="sm" />{" "}
                  <em>{a.filename}</em>
                </small>
              </Link>
            </React.Fragment>
          );
        }
      })}
      {isLightboxOpen && imageAttachments.length > 0 && (
        <LightboxOverlay onClick={handleOverlayClick}>
          <LightboxContent>
            <LightboxButton
              $position="center-left"
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox("prev");
              }}
              title="Previous image (Left arrow)"
            >
              <FontAwesomeIcon icon={faChevronLeft} size="xs" />
            </LightboxButton>

            <LightboxImage
              src={imageAttachments[currentImageIndex]?.url}
              alt={imageAttachments[currentImageIndex]?.filename}
              onClick={(e) => e.stopPropagation()}
            />
            <LightboxButton
              $position="center-right"
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox("next");
              }}
              title="Next image (Right arrow)"
            >
              <FontAwesomeIcon icon={faChevronRight} size="xs" />
            </LightboxButton>
            <TopRightButtonGroup>
              <Link
                to={imageAttachments[currentImageIndex]?.url}
                target="_blank"
                download={imageAttachments[currentImageIndex]?.filename}
              >
                <LightboxButton title="Download">
                  <FontAwesomeIcon icon={faDownload} size="2xs" />
                </LightboxButton>
              </Link>
              <LightboxButton
                onClick={(e) => {
                  e.stopPropagation();
                  closeLightbox();
                }}
                title="Close lightbox (Escape)"
              >
                <FontAwesomeIcon icon={faTimes} size="xs" />
              </LightboxButton>
            </TopRightButtonGroup>
          </LightboxContent>
        </LightboxOverlay>
      )}
    </div>
  );
};

export default ChatMessage;
