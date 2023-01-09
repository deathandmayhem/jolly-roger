import { Meteor } from 'meteor/meteor';
import { marked } from 'marked';
import React, {
  useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  createEditor, BaseEditor, Descendant, Editor, NodeEntry, Text, Transforms, Node, Path, Range,
} from 'slate';
import { HistoryEditor, withHistory } from 'slate-history';
import {
  Slate, Editable, ReactEditor, withReact, useSelected, useFocused, RenderLeafProps,
  RenderElementProps,
} from 'slate-react';
import styled, { css } from 'styled-components';
import { indexedById, sortedBy } from '../../lib/listUtils';

// This implements a markdown-inspired input editor with live formatting preview
// and autocompleting @-mentions.

export const DEBUG_EDITOR = false;

export type CustomText = { text: string }
export type MessageElement = {
  type: 'message';
  children: (MentionElement | CustomText)[];
}
export type MentionElement = {
  type: 'mention';
  userId: string; // user._id of the mentioned user
  children: CustomText[];
}
export type CustomElement = MessageElement | MentionElement;
declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor
    Element: CustomElement
    Text: CustomText
  }
}

interface ElementRendererProps<T> {
  attributes: any,
  children: any,
  element: T,
}

// For the inline editable renderer
const StyledEditorCodeBlock = styled.code`
  display: inline-block;
  width: 100%;
  background-color: #eee;
  color: black;
  margin-bottom: 0;
`;

interface LeafProps {
  strong?: boolean;
  em?: boolean;
  codespan?: boolean;
  code?: boolean;
  link?: {
    href: string;
  };
  underline?: boolean;
  del?: boolean;
  blockquote?: boolean;
}

interface MentionRendererProps extends ElementRendererProps<MentionElement> {
  users: Map<string, Meteor.User>;
}

export const MentionSpan = styled.span<{
  isSelf: boolean;
}>`
  padding: 2px 3px 3px;
  height: 20px;
  margin: 0 1px;
  vertical-align: baseline;
  display: inline-block;
  border-radius: 4px;
  color: #4649ef;
  background-color: #ced0ed;
  ${({ isSelf }) => isSelf && css`
    background-color: #4649ef;
    color: #ffffff;
  `}
  font-size: 0.8rem;
`;

const SelectedMentionSpan = styled(MentionSpan)`
  box-shadow: 0 0 0 2px #b4d5ff;
`;

const EditableMentionRenderer = ({
  attributes,
  children,
  element,
  users,
}: MentionRendererProps) => {
  const selected = useSelected();
  const focused = useFocused();
  const user = users.get(element.userId);
  const Elem = selected && focused ? SelectedMentionSpan : MentionSpan;

  return (
    <Elem {...attributes} contentEditable={false}>
      {children}
      @
      {`${user?.displayName ?? element.userId}`}
    </Elem>
  );
};

// Composed, layered reassignment is how Slate plugins are designed to work.
/* eslint-disable no-param-reassign */
const withMentions = (editor: Editor) => {
  const { isInline, isVoid, markableVoid } = editor;
  editor.isInline = (element) => {
    return element.type === 'mention' ? true : isInline(element);
  };
  editor.isVoid = (element) => {
    return element.type === 'mention' ? true : isVoid(element);
  };
  editor.markableVoid = (element) => {
    return element.type === 'mention' || markableVoid(element);
  };
  return editor;
};

// A normalization pass to merge all `message` elements into a single one.
// Normal editing can't create more than one, but copy-pasting a break would
// normally get transformed into a hard break, so we solve this by merging
// sibling message nodes.
const withSingleMessage = (editor: Editor) => {
  const { normalizeNode } = editor;
  editor.normalizeNode = (entry: NodeEntry) => {
    const [node, _path] = entry;
    if (Editor.isEditor(node)) {
      if (node.children.length > 1) {
        Transforms.mergeNodes(editor, { at: [1] });
      }
    }

    normalizeNode(entry);
  };
  return editor;
};
/* eslint-enable no-param-reassign */

const insertMention = (editor: Editor, userId: string) => {
  const mention: MentionElement = {
    type: 'mention',
    userId,
    children: [{ text: '' }],
  };
  Transforms.insertNodes(editor, mention);
  Transforms.move(editor);
};

const MatchCandidate = ({
  user, selected, onSelected,
}: {
  user: Meteor.User,
  selected: boolean,
  onSelected: (u: Meteor.User) => void,
}) => {
  const onClick = useCallback(() => {
    onSelected(user);
  }, [onSelected, user]);
  return (
    <div
      key={user._id}
      style={{
        padding: '1px 3px',
        borderRadius: '3px',
        background: selected ? '#e0ecfc' : 'transparent',
      }}
      onClick={onClick}
    >
      {user.displayName}
    </div>
  );
};

type AugmentedUser = Meteor.User & {
  foundDisplayName: boolean;
  startsDisplayName: boolean;
  foundEmail: boolean;
  startsEmail: boolean;
  foundGoogle: boolean;
  startsGoogle: boolean;
  foundDiscord: boolean;
  startsDiscord: boolean;
};

function matchUsers(users: Meteor.User[], search: string): AugmentedUser[] {
  // No point doing all this matching work if there's no search string to match against.
  if (!search) return [];

  // We approximate case-insensitive search by converting both needles and
  // haystacks to lowercase.
  const needle = search.toLowerCase();

  // Augment users with whether assorted fields match the search string or not, and where.
  const augmentedUsers: AugmentedUser[] = users.map((u) => {
    // Note which user fields case-insensitively match the current search
    // string, and whether that match was at the start of the field.
    const displayName = u.displayName?.toLowerCase() ?? '';
    const foundDisplayName = displayName.includes(needle);
    const startsDisplayName = displayName.startsWith(needle);
    const emails = u.emails?.map((addrObj) => addrObj.address.toLowerCase()) ?? [];
    const foundEmail = emails.some((addr) => addr.includes(needle));
    const startsEmail = emails.some((addr) => addr.startsWith(needle));
    const googEmail = u.googleAccount?.toLowerCase() ?? '';
    const foundGoogle = googEmail.includes(needle);
    const startsGoogle = googEmail.startsWith(needle);
    const discordName = u.discordAccount ? `${u.discordAccount.username.toLowerCase()}#${u.discordAccount.discriminator}` : '';
    const foundDiscord = discordName.includes(needle);
    const startsDiscord = discordName.startsWith(needle);

    return {
      ...u,
      foundDisplayName,
      startsDisplayName,
      foundEmail,
      startsEmail,
      foundGoogle,
      startsGoogle,
      foundDiscord,
      startsDiscord,
    };
  });

  // Only display those users which matched at least one field.
  const augmentedMatches = augmentedUsers.filter((u) => {
    return u.foundDisplayName || u.foundEmail || u.foundGoogle || u.foundDiscord;
  });

  // Sort the remaining users by relevancy, with extra weight given to
  // matching at the start of the field, and with display name more important
  // that google email address or discord username#discriminator.
  // Note that `users` was originally sorted by displayName and that
  // `sortedBy` is a stable sort.
  return sortedBy(augmentedMatches, (u) => {
    return (
      (u.startsDisplayName ? -10000 : 0) +
      (u.startsGoogle || u.startsEmail || u.startsDiscord ? -5000 : 0) +
      (u.foundDisplayName ? -100 : 0) +
      (u.foundEmail ? -50 : 0) +
      (u.foundGoogle ? -10 : 0) +
      (u.foundDiscord ? -5 : 0)
    );
  });
}

const StyledMessage = styled.p`
  margin-bottom: 0;
`;

const AutocompleteContainer = styled.div`
  position: absolute;
  z-index: 6;
  padding: 3px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 5px rgb(0 0 0 / 20%);
`;

type TraverseCallback = (token: marked.Token, offset: number) => void;

// Walks the tokens provided, calling callback, and keeping track of the raw offset
// into the input string along the way.
const walkTokenList = (
  tokens: marked.Token[],
  callback: TraverseCallback,
  offset: number,
) => {
  const start = offset;
  let end = start;
  tokens.forEach((token) => {
    // mutual recursion requires this
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    walkToken(token, callback, end);
    end += token.raw.length;
  });
};

const walkToken = (token: marked.Token, callback: TraverseCallback, offset: number) => {
  if ((token as any).tokens) {
    walkTokenList((token as any).tokens, callback, offset);
  }
  callback(token, offset);
};

const renderLeaf = (props: RenderLeafProps) => {
  const { attributes, leaf } = props;
  let { children } = props;
  const {
    link, strong, code, codespan, em, del, underline,
  } = leaf as LeafProps;
  if (link) {
    const { href } = link;
    children = <a href={href}>{children}</a>;
  }
  if (strong) {
    children = <strong>{children}</strong>;
  }
  if (code) {
    children = <StyledEditorCodeBlock>{children}</StyledEditorCodeBlock>;
  }
  if (codespan) {
    children = <code>{children}</code>;
  }
  if (em) {
    children = <em>{children}</em>;
  }
  if (del) {
    children = <del>{children}</del>;
  }
  if (underline) {
    children = <u>{children}</u>;
  }
  return <span {...attributes}>{children}</span>;
};

// decorate() returns a set of ranges that should have additional marks
// associated with them, and then when renderLeaf is called the leaf elements
// will have the additional properties available.  So we run the marked lexer
// on the text to determine what ranges should have what annotations.
const decorate = ([node, path]: [Node, Path]) => {
  const ranges: (LeafProps & Range)[] = [];
  if (!Text.isText(node)) {
    // No decorations needed for non-text elements.
    return ranges;
  }

  const tokensList = marked.lexer(node.text);
  walkTokenList(tokensList, (token: marked.Token, offset: number) => {
    if (token.type !== 'text') {
      if (token.type === 'link') {
        ranges.push({
          link: { href: token.href },
          anchor: { path, offset },
          focus: { path, offset: offset + token.raw.length },
        });
      } else if (token.type === 'blockquote') {
        let distance = token.raw.length;
        if (token.raw.endsWith('\n\n')) {
          distance -= 1;
        }
        ranges.push({
          blockquote: true,
          anchor: { path, offset },
          focus: { path, offset: offset + distance },
        });
      } else if (token.type === 'strong') {
        let type = 'strong';
        if (token.raw.startsWith('__')) {
          // Discord treats double-underline as underline, rather than strong.
          // We'll do likewise.
          type = 'underline';
        }
        ranges.push({
          [type]: true,
          anchor: { path, offset },
          focus: { path, offset: offset + token.raw.length },
        });
      } else if (token.type === 'code') {
        let distance = token.raw.length;
        if (token.raw.endsWith('\n')) {
          // Avoid including a trailing newline in the code span decoration;
          // it makes the <code> block's background appear to extend too far.
          distance -= 1;
        }
        ranges.push({
          code: true,
          anchor: { path, offset },
          focus: { path, offset: offset + distance },
        });
      } else if (token.type === 'em' || token.type === 'codespan' || token.type === 'del') {
        ranges.push({
          [token.type]: true,
          anchor: { path, offset },
          focus: { path, offset: offset + token.raw.length },
        });
      }
    }
  }, 0);

  if (DEBUG_EDITOR) {
    // eslint-disable-next-line no-console
    console.log('decorated', ranges);
  }
  return ranges;
};

const Portal = ({ children }: { children: React.ReactNode }) => {
  return createPortal(children, document.body);
};

export interface FancyEditorHandle {
  clearInput: () => void;
}

const FancyEditor = React.forwardRef(({
  className, initialContent, placeholder, users, onContentChange, onSubmit,
}: {
  className?: string,
  initialContent: Descendant[],
  placeholder?: string,
  users: Meteor.User[],
  onContentChange: (content: Descendant[]) => void,
  onSubmit: () => void,
}, forwardedRef: React.Ref<FancyEditorHandle>) => {
  const [editor] = useState(() => {
    const upstreamEditor = withReact(withHistory(createEditor()));
    return withSingleMessage(withMentions(upstreamEditor));
  });

  // The floating autocomplete box for @-mentions
  const ref = useRef<HTMLDivElement>(null);
  // selection target?
  const [target, setTarget] = useState<Range | undefined>(undefined);
  // Offset into the list of potentially-matching usernames
  const [index, setIndex] = useState<number>(0);
  // current needle for search in display names
  const [search, setSearch] = useState('');

  const usersById = useMemo(() => indexedById(users), [users]);

  const clearInput = useCallback(() => {
    // Reset the document by removing all nodes under the root editor node.
    const children = [...editor.children];
    children.forEach((node) => {
      editor.apply({ type: 'remove_node', path: [0], node });
    });

    // Insert an empty paragraph.
    editor.apply({
      type: 'insert_node',
      path: [0],
      node: { type: 'message', children: [{ text: '' }] },
    });

    // Make the selection be empty
    Transforms.select(editor, {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    // editor.splitBlock();
    editor.history = {
      redos: [],
      undos: [],
    };
  }, [editor]);
  useImperativeHandle(forwardedRef, () => ({
    clearInput,
  }));

  const renderElement = useCallback((props: RenderElementProps) => {
    switch (props.element.type) {
      case 'mention':
        return (
          <EditableMentionRenderer
            users={usersById}
            {...props as ElementRendererProps<MentionElement>}
          />
        );
      case 'message':
      default:
        return (
          <StyledMessage {...props.attributes}>
            {props.children}
          </StyledMessage>
        );
    }
  }, [usersById]);

  const onChange = useCallback((value: Descendant[]) => {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      // Look backwards.  Does the word the cursor is in start with an `@`?
      const [start] = Range.edges(selection);
      const wordBefore = Editor.before(editor, start, { unit: 'word' });
      const before = wordBefore && Editor.before(editor, wordBefore);
      const beforeRange = before && Editor.range(editor, before, start);
      const beforeText = beforeRange && Editor.string(editor, beforeRange);
      const beforeMatch = beforeText?.match(/^@(\w+)$/);
      // Look forwards from the cursor to the end of the word.
      // Is the cursor at the end of the word?
      const after = Editor.after(editor, start);
      const afterRange = Editor.range(editor, start, after);
      const afterText = Editor.string(editor, afterRange);
      const afterMatch = afterText.match(/^(\s|$)/);

      if (beforeMatch && afterMatch) {
        // Do @-completion. Anchor the popup to the start of the @.
        // The user's search string to attempt to match on is the string that
        // follows between the @ and the cursor.
        // Start by highlighting the top entry in the autocomplete list.
        setTarget(beforeRange);
        setSearch(beforeMatch[1]!);
        setIndex(0);
      } else {
        setTarget(undefined);
      }
    }

    const isAstChange = editor.operations.some((op) => op.type !== 'set_selection');
    if (isAstChange) {
      onContentChange(value);
    }
  }, [editor, onContentChange]);

  const matchingUsers: AugmentedUser[] = useMemo(() => matchUsers(users, search), [users, search]);

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = useCallback((event) => {
    if (target && matchingUsers.length > 0) {
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          const nextIndex = index >= matchingUsers.length - 1 ? 0 : index + 1;
          setIndex(nextIndex);
          return;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const prevIndex = index === 0 ? matchingUsers.length - 1 : index - 1;
          setIndex(prevIndex);
          return;
        }
        case 'Tab':
        case 'Enter': {
          event.preventDefault();
          Transforms.select(editor, target);
          const user = matchingUsers[index]!;
          insertMention(editor, user._id);
          setTarget(undefined);
          return;
        }
        case 'Escape': {
          event.preventDefault();
          setTarget(undefined);
          return;
        }
        default: break;
      }
    }

    if (event.key === 'Enter') {
      if (event.shiftKey) {
        // Insert soft break.  Avoid hard breaks entirely.
        event.preventDefault();
        editor.insertText('\n');
      } else {
        // submit contents.  clear the editor.
        event.preventDefault();
        onSubmit();
        clearInput();
      }
    }
  }, [target, matchingUsers, index, editor, onSubmit, clearInput]);

  useEffect(() => {
    if (target && matchingUsers.length > 0) {
      const el = ref.current;
      const domRange = ReactEditor.toDOMRange(editor, target);
      const rect = domRange.getBoundingClientRect();
      if (el) {
        const elRect = el.getBoundingClientRect();
        // We wish to place the list of completions immediately above the area
        // from which the completion was initiated.
        //                  _______________________
        //                 | completion candidate 1| \
        //                 | completion candidate 2|  |-- elRect.height
        // +---------------|_______________________| /
        // | input box here @search        |
        // +-------------------------------+
        // rect.top and rect.left are the top-left of the @
        // We're using absolute positioning, so we need to add in the viewport
        // offset (window.scrollX and window.scrollY).  Then, we need to subtract
        // out the height of the completion box, so that we're not on top of the
        // @-mention, but just above it.
        el.style.top = `${rect.top + window.scrollY - elRect.height}px`;
        el.style.left = `${rect.left + window.scrollX}px`;
      }
    }
  }, [matchingUsers.length, editor, index, search, target]);

  const onUserSelected = useCallback((u: Meteor.User) => {
    Transforms.select(editor, target!);
    insertMention(editor, u._id);
    setTarget(undefined);
    ReactEditor.focus(editor);
  }, [editor, target]);

  const debugPane = DEBUG_EDITOR ? (
    <div style={{ position: 'fixed', bottom: '0', right: '0' }}>
      <div style={{ width: '800px', overflowX: 'auto', overflowY: 'auto' }}>
        <pre>{JSON.stringify(editor.children, null, 2)}</pre>
      </div>
      <div>{`target: ${JSON.stringify(target)}`}</div>
      <div>{`search: ${search}`}</div>
      <div>{`index: ${index}`}</div>
    </div>
  ) : undefined;

  return (
    <Slate
      editor={editor}
      value={initialContent}
      onChange={onChange}
    >
      {debugPane}
      {target && matchingUsers.length > 0 && (
        <Portal>
          <AutocompleteContainer
            ref={ref}
            style={{
              top: '-9999px',
              left: '-9999px',
            }}
          >
            {matchingUsers.map((user, i) => {
              return (
                <MatchCandidate
                  key={user._id}
                  user={user}
                  selected={i === index}
                  onSelected={onUserSelected}
                />
              );
            })}
          </AutocompleteContainer>
        </Portal>
      )}
      <Editable
        className={className}
        placeholder={placeholder}
        decorate={decorate}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        onKeyDown={onKeyDown}
      />
    </Slate>
  );
});

export default FancyEditor;
