/* eslint-disable react/no-array-index-key */
import { marked } from 'marked';
import React from 'react';
import styled from 'styled-components';
import { ChatMessageContentNodeType, ChatMessageContentType, ChatMessageMentionNodeType } from '../../lib/schemas/ChatMessage';
import { MentionSpan } from './FancyEditor';

// This file implements standalone rendering for the MessageElement format
// defined by FancyEditor, for use in the chat pane.

const StyledMessage = styled.p`
  margin-bottom: 0;
`;

const PreWrapSpan = styled.span`
  white-space: pre-wrap;
`;

const StyledBlockquote = styled.blockquote`
  border-left: 2px solid #88a;
  padding-left: 4px;
  margin-bottom: 0;
`;

// For the readonly renderer
const StyledCodeBlock = styled.code`
  white-space: pre-wrap;
  display: block;
  border-radius: 4px;
  padding: 4px;
  width: 100%;
  background-color: #eee;
  color: black;
  margin-bottom: 0;
`;

function isMention(thing: ChatMessageContentNodeType): thing is ChatMessageMentionNodeType {
  return (thing as any).type === 'mention';
}

// Renders a markdown token to React components.
const MarkdownToken = ({ token }: { token: marked.Token }) => {
  if (token.type === 'text') {
    return <PreWrapSpan>{token.raw}</PreWrapSpan>;
  } else if (token.type === 'space') {
    return <PreWrapSpan>{token.raw}</PreWrapSpan>;
  } else if (token.type === 'paragraph') {
    // If the raw text includes a newline but the consumed text does not,
    // insert the additional space at the end.
    const children = token.tokens.map((t, i) => <MarkdownToken key={i} token={t} />);
    if (token.raw.length > token.text.length) {
      const trail = token.raw.substring(token.text.length);
      if (trail.trim() === '') {
        const syntheticSpace: marked.Tokens.Space = {
          type: 'space',
          raw: trail,
        };
        children.push(<MarkdownToken key={children.length} token={syntheticSpace} />);
      }
    }
    return <PreWrapSpan>{children}</PreWrapSpan>;
  } else if (token.type === 'link') {
    const children = token.tokens.map((t, i) => <MarkdownToken key={i} token={t} />);
    return <a target="_blank" rel="noopener noreferrer" href={token.href}>{children}</a>;
  } else if (token.type === 'blockquote') {
    const children = token.tokens.map((t, i) => <MarkdownToken key={i} token={t} />);
    return <StyledBlockquote>{children}</StyledBlockquote>;
  } else if (token.type === 'strong') {
    const children = token.tokens.map((t, i) => <MarkdownToken key={i} token={t} />);
    if (token.raw.startsWith('__')) {
      return <u>{children}</u>;
    } else {
      return <strong>{children}</strong>;
    }
  } else if (token.type === 'em') {
    const children = token.tokens.map((t, i) => <MarkdownToken key={i} token={t} />);
    return <em>{children}</em>;
  } else if (token.type === 'del') {
    const children = token.tokens.map((t, i) => <MarkdownToken key={i} token={t} />);
    return <del>{children}</del>;
  } else if (token.type === 'codespan') {
    return <code>{token.text}</code>;
  } else if (token.type === 'code') {
    return <StyledCodeBlock>{token.text}</StyledCodeBlock>;
  } else {
    // Unhandled token types: just return the raw string
    return <span>{token.raw}</span>;
  }
};

const ReadonlyMarkdownRenderer = ({ text }: { text: string }) => {
  const tokensList = marked.lexer(text);
  const children = tokensList.map((token, i) => {
    return <MarkdownToken key={i} token={token} />;
  });
  return <PreWrapSpan>{children}</PreWrapSpan>;
};

const ChatMessageV2 = ({ message, displayNames, selfUserId }: {
  message: ChatMessageContentType,
  displayNames: Map<string, string>,
  selfUserId: string,
}) => {
  const children = message.children.map((child, i) => {
    if (isMention(child)) {
      const displayName = displayNames.get(child.userId);
      return (
        <MentionSpan key={i} isSelf={child.userId === selfUserId}>
          @
          {`${displayName ?? child.userId}`}
        </MentionSpan>
      );
    } else {
      return <ReadonlyMarkdownRenderer key={i} text={child.text} />;
    }
  });

  return (
    <div>
      <StyledMessage>
        {children}
      </StyledMessage>
    </div>
  );
};

export default ChatMessageV2;