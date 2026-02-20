// biome-ignore-all lint/suspicious/noArrayIndexKey: migrated from eslint
import { decodeHTML } from "entities";
import type { Token, Tokens } from "marked";
import { marked } from "marked";
import { useCallback, useEffect, useRef, useState } from "react";
import BSImage from "react-bootstrap/Image";
import styled from "styled-components";
import type { ChatMessageContentType } from "../../lib/models/ChatMessages";
import nodeIsImage from "../../lib/nodeIsImage";
import nodeIsMention from "../../lib/nodeIsMention";
import nodeIsRoleMention from "../../lib/nodeIsRoleMention";
import { MentionSpan } from "./FancyEditor";

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

const StyledCodeBlock = styled.code`
  white-space: pre-wrap;
  display: block;
  border-radius: 4px;
  padding: 4px;
  width: 100%;
  background-color: ${({ theme }) => theme.colors.codeBlockBackground};
  color: ${({ theme }) => theme.colors.codeBlockText};
  margin-bottom: 0;
`;

const ResponsiveImage = ({
  src,
  onLoadCB,
}: {
  src: string;
  onLoadCB?: () => void;
}) => {
  const [isLarge, setIsLarge] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = useCallback(() => {
    if (imgRef.current && containerRef.current) {
      const imgWidth = imgRef.current.naturalWidth;
      const containerWidth = containerRef.current.offsetWidth;
      setIsLarge(imgWidth > containerWidth);
    }
    onLoadCB?.();
  }, [onLoadCB]);

  // update on container resize
  useEffect(() => {
    const container = containerRef.current;
    const observer = container ? new ResizeObserver(() => handleLoad()) : null;

    if (observer && container) {
      observer.observe(container);
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [handleLoad]);

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      {isLarge ? (
        <a href={src} target="_blank" rel="noopener noreferrer">
          <BSImage
            ref={imgRef}
            src={src}
            onLoad={handleLoad}
            className={isLarge ? "img-thumbnail" : ""}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </a>
      ) : (
        <BSImage
          ref={imgRef}
          src={src}
          onLoad={handleLoad}
          style={{
            display: "block",
          }}
        />
      )}
    </div>
  );
};

// Renders a markdown token to React components.
const MarkdownToken = ({
  token,
  truncate,
}: {
  token: Token;
  // truncate only applies to this immediate node; it isn't propagated
  truncate?: boolean;
}) => {
  // NOTE: Marked's lexer encodes using HTML entities in the text; see:
  // https://github.com/markedjs/marked/discussions/1737
  // We need to decode the text since React will apply its own escaping.
  if (token.type === "text") {
    const text =
      truncate && token.raw.length > 100
        ? `${token.raw.slice(0, 100)}…`
        : token.raw;
    return <PreWrapSpan>{text}</PreWrapSpan>;
  } else if (token.type === "space") {
    return <PreWrapSpan>{token.raw}</PreWrapSpan>;
  } else if (token.type === "paragraph") {
    // If the raw text includes a newline but the consumed text does not,
    // insert the additional space at the end.
    const children = (token as Tokens.Paragraph).tokens.map((t, i) => (
      <MarkdownToken key={i} token={t} />
    ));
    const decodedText = decodeHTML(token.text);
    if (token.raw.length > decodedText.length) {
      const trail = token.raw.slice(decodedText.length);
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
    const linkToken = token as Tokens.Link;
    // If the link text and the href are identical, this is probably an auto-link, so truncate it
    const truncate =
      linkToken.tokens.length === 1 && linkToken.text === linkToken.href;
    const children = linkToken.tokens.map((t, i) => (
      <MarkdownToken key={i} token={t} truncate={truncate} />
    ));
    return (
      <a target="_blank" rel="noopener noreferrer" href={token.href}>
        {children}
      </a>
    );
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
    const decodedText = decodeHTML(token.text);
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
  selfUserId,
  roles,
  imageOnLoad,
}: {
  message: ChatMessageContentType;
  displayNames: Map<string, string>;
  selfUserId: string;
  roles: string[];
  imageOnLoad?: () => void;
}) => {
  const children = message.children.map((child, i) => {
    if (nodeIsMention(child)) {
      const displayName = displayNames.get(child.userId);
      return (
        <MentionSpan key={i} $isSelf={child.userId === selfUserId}>
          @{`${displayName ?? child.userId}`}
        </MentionSpan>
      );
    } else if (nodeIsRoleMention(child)) {
      const hasRole = roles.includes(child.roleId);
      return (
        <MentionSpan key={i} $isSelf={hasRole}>
          @{child.roleId}
        </MentionSpan>
      );
    } else if (nodeIsImage(child)) {
      return <ResponsiveImage key={i} src={child.url} onLoadCB={imageOnLoad} />;
    } else {
      const tokensList = marked.lexer(child.text);
      return tokensList.map((token, j) => {
        return <MarkdownToken key={j} token={token} />;
      });
    }
  });

  return <div>{children}</div>;
};

export default ChatMessage;
