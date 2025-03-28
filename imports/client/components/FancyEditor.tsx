import type { Meteor } from "meteor/meteor";
import { type Tokens, type Token } from "marked";
import { marked } from "marked";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { BaseEditor, Descendant, NodeEntry, Node, Path } from "slate";
import { createEditor, Editor, Text, Transforms, Range } from "slate";
import type { HistoryEditor } from "slate-history";
import { withHistory } from "slate-history";
import type {
  RenderLeafProps,
  RenderElementProps,
  RenderPlaceholderProps,
} from "slate-react";
import {
  Slate,
  Editable,
  ReactEditor,
  withReact,
  useSelected,
  useFocused,
} from "slate-react";
import styled, { css } from "styled-components";
import { formatDiscordName } from "../../lib/discord";
import { indexedById, sortedBy } from "../../lib/listUtils";
import Avatar from "./Avatar";

// This implements a markdown-inspired input editor with live formatting preview
// and autocompleting @-mentions.

export const DEBUG_EDITOR = false;

export type CustomText = { text: string };
export type MessageElement = {
  type: "message";
  children: (MentionElement | CustomText)[];
};
export type MentionElement = {
  type: "mention";
  userId: string; // user._id of the mentioned user
  children: CustomText[];
};
export type CustomElement = MessageElement | MentionElement;
declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

interface ElementRendererProps<T> {
  attributes: any;
  children: any;
  element: T;
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
  $isSelf: boolean;
}>`
  padding: 2px 3px 3px;
  margin: 0 1px;
  vertical-align: baseline;
  display: inline-block;
  overflow-wrap: break-word;
  border-radius: 4px;
  color: #4649ef;
  background-color: #ced0ed;
  ${({ $isSelf }) =>
    $isSelf &&
    css`
      background-color: #4649ef;
      color: #fff;
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
      {children}@{`${user?.displayName ?? element.userId}`}
    </Elem>
  );
};

// Composed, layered reassignment is how Slate plugins are designed to work.
const withMentions = (editor: Editor) => {
  const { isInline, isVoid, markableVoid } = editor;
  editor.isInline = (element) => {
    return element.type === "mention" ? true : isInline(element);
  };
  editor.isVoid = (element) => {
    return element.type === "mention" ? true : isVoid(element);
  };
  editor.markableVoid = (element) => {
    return element.type === "mention" || markableVoid(element);
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

const insertMention = (editor: Editor, userId: string) => {
  const mention: MentionElement = {
    type: "mention",
    userId,
    children: [{ text: "" }],
  };
  Transforms.insertNodes(editor, mention);
  Transforms.move(editor);
};

const MatchCandidateRow = styled.div<{ $selected: boolean }>`
  padding: 2px 3px;
  border-radius: 3px;
  height: 28px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
  ${({ $selected }) => css`
    background: ${$selected ? "#e0ecfc" : "transparent"};
  `}
`;

const MatchCandidateDisplayName = styled.div`
  /* We want to keep display names to a single row, and if they overflow, clip */
  white-space: nowrap;
  overflow-x: hidden;
  margin-left: 0.25rem;
`;

const StyledAvatar = styled(Avatar)`
  /* Avatar width should not be flexed up nor down */
  flex: none;
`;

const MatchCandidate = ({
  user,
  selected,
  onSelected,
}: {
  user: Meteor.User;
  selected: boolean;
  onSelected: (u: Meteor.User) => void;
}) => {
  const onClick = useCallback(() => {
    onSelected(user);
  }, [onSelected, user]);
  return (
    <MatchCandidateRow key={user._id} $selected={selected} onClick={onClick}>
      <StyledAvatar size={24} {...user} />
      <MatchCandidateDisplayName>{user.displayName}</MatchCandidateDisplayName>
    </MatchCandidateRow>
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

function matchUsers(
  users: Meteor.User[],
  searchString: string,
): AugmentedUser[] {
  // No point doing all this matching work if there's no search string to match against.
  if (!searchString) return [];

  // We approximate case-insensitive search by converting both needles and
  // haystacks to lowercase.
  const needle = searchString.toLowerCase();

  // Augment users with whether assorted fields match the search string or not, and where.
  const augmentedUsers: AugmentedUser[] = users.map((u) => {
    // Note which user fields case-insensitively match the current search
    // string, and whether that match was at the start of the field.
    const displayName = u.displayName?.toLowerCase() ?? "";
    const foundDisplayName = displayName.includes(needle);
    const startsDisplayName = displayName.startsWith(needle);
    const emails =
      u.emails?.map((addrObj) => addrObj.address.toLowerCase()) ?? [];
    const foundEmail = emails.some((addr) => addr.includes(needle));
    const startsEmail = emails.some((addr) => addr.startsWith(needle));
    const googEmail = u.googleAccount?.toLowerCase() ?? "";
    const foundGoogle = googEmail.includes(needle);
    const startsGoogle = googEmail.startsWith(needle);
    const discordName = formatDiscordName(u.discordAccount) ?? "";
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
    return (
      u.foundDisplayName || u.foundEmail || u.foundGoogle || u.foundDiscord
    );
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
  max-width: 100%;
  overflow-x: hidden;
  box-shadow: 0 1px 5px rgb(0 0 0 / 20%);
`;

// TraverseCallback should return the offset into its raw text at which its
// children's text starts
type TraverseCallback = (token: Token, offset: number) => number;

// Walks the tokens provided, calling callback, and keeping track of the raw offset
// into the input string along the way.
const walkTokenList = (
  tokens: Token[],
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

const walkToken = (
  token: Token,
  callback: TraverseCallback,
  offset: number,
) => {
  const innerOffset = callback(token, offset);
  if ("tokens" in token && token.tokens) {
    // compute relative offset of any leading formatting option so that nested
    // marks will have the right offsets
    walkTokenList(token.tokens, callback, offset + innerOffset);
  }
};

const renderLeaf = (props: RenderLeafProps) => {
  const { attributes, leaf } = props;
  let { children } = props;
  const { link, strong, code, codespan, em, del, underline } =
    leaf as LeafProps;
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
  walkTokenList(
    tokensList,
    (token: Token, offset: number) => {
      if (token.type !== "text") {
        if (token.type === "link") {
          ranges.push({
            link: { href: token.href },
            anchor: { path, offset },
            focus: { path, offset: offset + (token as Tokens.Link).raw.length },
          });
          return 0; // links consume no formatting characters
        } else if (token.type === "blockquote") {
          let distance = token.raw.length;
          if (token.raw.endsWith("\n\n")) {
            distance -= 1;
          }
          ranges.push({
            blockquote: true,
            anchor: { path, offset },
            focus: { path, offset: offset + distance },
          });
          // Attempt to find the first line of the quoted substring to determine offset
          const firstLineText = token.text.split("\n")[0]!.trimEnd();
          const firstLineOffset = token.raw.indexOf(firstLineText);
          // If we can't find the substring, just return 0
          return Math.max(0, firstLineOffset);
        } else if (token.type === "strong") {
          let type = "strong";
          if (token.raw.startsWith("__")) {
            // Discord treats double-underline as underline, rather than strong.
            // We'll do likewise.
            type = "underline";
          }
          ranges.push({
            [type]: true,
            anchor: { path, offset },
            focus: { path, offset: offset + token.raw.length },
          });
          return 2; // Both __ and ** take two characters
        } else if (token.type === "code") {
          let distance = token.raw.length;
          if (token.raw.endsWith("\n")) {
            // Avoid including a trailing newline in the code span decoration;
            // it makes the <code> block's background appear to extend too far.
            distance -= 1;
          }
          ranges.push({
            code: true,
            anchor: { path, offset },
            focus: { path, offset: offset + distance },
          });
          return 0; // code blocks should have no children, so this value doesn't matter
        } else if (token.type === "em" || token.type === "codespan") {
          ranges.push({
            [token.type]: true,
            anchor: { path, offset },
            focus: { path, offset: offset + token.raw.length },
          });
          return 1; // both em and codespan have one leading formatting character
        } else if (token.type === "del") {
          ranges.push({
            del: true,
            anchor: { path, offset },
            focus: { path, offset: offset + token.raw.length },
          });
          return 2; // two leading ~~
        }
      }
      return 0;
    },
    0,
  );

  if (DEBUG_EDITOR) {
    // eslint-disable-next-line no-console
    console.log("decorated", ranges);
  }
  return ranges;
};

const renderPlaceholder = ({
  attributes,
  children,
}: RenderPlaceholderProps) => {
  // Override the `style` from `attributes` -- the value provided by default by
  // slate-react carries a top: 0 that causes the placeholder text to not sit
  // on the baseline correctly.  9px appears to be about right.
  const { style: givenStyle, ...rest } = attributes;
  const style = {
    ...givenStyle,
    top: "9px",
  };
  const attrs = {
    ...rest,
    style,
  };
  return <span {...attrs}>{children}</span>;
};

const Portal = ({ children }: { children: React.ReactNode }) => {
  return createPortal(children, document.body);
};

export interface FancyEditorHandle {
  clearInput: () => void;
}

const FancyEditor = React.forwardRef(
  (
    {
      className,
      initialContent,
      placeholder,
      users,
      onContentChange,
      onSubmit,
      disabled,
    }: {
      className?: string;
      initialContent: Descendant[];
      placeholder?: string;
      users: Meteor.User[];
      onContentChange: (content: Descendant[]) => void;
      onSubmit: () => void;
      disabled?: boolean;
    },
    forwardedRef: React.Ref<FancyEditorHandle>,
  ) => {
    const [editor] = useState(() => {
      const upstreamEditor = withReact(withHistory(createEditor()));
      return withSingleMessage(withMentions(upstreamEditor));
    });

    // The floating autocomplete box for @-mentions
    const ref = useRef<HTMLDivElement>(null);
    // The range in the document which an autocompletion overlay should be positioned relative to
    const [completionAnchorRange, setCompletionAnchorRange] = useState<
      Range | undefined
    >(undefined);
    // Offset into the list of potentially-matching usernames
    const [completionCursorIndex, setCompletionCursorIndex] =
      useState<number>(0);
    // The current needle to search for in user display names, emails, etc.
    const [completionSearchString, setCompletionSearchString] = useState("");

    const usersById = useMemo(() => indexedById(users), [users]);
    const editableRef = useRef<React.ElementRef<typeof Editable>>(null);

    const clearInput = useCallback(() => {
      // Reset the document by removing all nodes under the root editor node.
      const children = [...editor.children];
      children.forEach((node) => {
        editor.apply({ type: "remove_node", path: [0], node });
      });

      // Insert an empty paragraph.
      editor.apply({
        type: "insert_node",
        path: [0],
        node: { type: "message", children: [{ text: "" }] },
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
      focus: () => {
        if (editableRef.current) {
          ReactEditor.focus(editor);
        }
      },
    }));

    const renderElement = useCallback(
      (props: RenderElementProps) => {
        switch (props.element.type) {
          case "mention":
            return (
              <EditableMentionRenderer
                users={usersById}
                {...(props as ElementRendererProps<MentionElement>)}
              />
            );
          case "message":
          default:
            return (
              <StyledMessage {...props.attributes}>
                {props.children}
              </StyledMessage>
            );
        }
      },
      [usersById],
    );

    const onChange = useCallback(
      (value: Descendant[]) => {
        const { selection } = editor;
        if (selection && Range.isCollapsed(selection)) {
          // Look backwards.  Does the word the cursor is in start with an `@`?
          const [start] = Range.edges(selection);
          const wordBefore = Editor.before(editor, start, { unit: "word" });
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
            setCompletionAnchorRange(beforeRange);
            setCompletionSearchString(beforeMatch[1]!);
            setCompletionCursorIndex(0);
          } else {
            setCompletionAnchorRange(undefined);
          }
        }

        const isAstChange = editor.operations.some(
          (op) => op.type !== "set_selection",
        );
        if (isAstChange) {
          onContentChange(value);
        }
      },
      [editor, onContentChange],
    );

    const matchingUsers: AugmentedUser[] = useMemo(
      () => matchUsers(users, completionSearchString),
      [users, completionSearchString],
    );

    const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = useCallback(
      (event) => {
        if (completionAnchorRange && matchingUsers.length > 0) {
          switch (event.key) {
            case "ArrowDown": {
              event.preventDefault();
              const nextIndex =
                completionCursorIndex >= matchingUsers.length - 1
                  ? 0
                  : completionCursorIndex + 1;
              setCompletionCursorIndex(nextIndex);
              return;
            }
            case "ArrowUp": {
              event.preventDefault();
              const prevIndex =
                completionCursorIndex === 0
                  ? matchingUsers.length - 1
                  : completionCursorIndex - 1;
              setCompletionCursorIndex(prevIndex);
              return;
            }
            case "Tab":
            case "Enter": {
              event.preventDefault();
              Transforms.select(editor, completionAnchorRange);
              const user = matchingUsers[completionCursorIndex]!;
              insertMention(editor, user._id);
              setCompletionAnchorRange(undefined);
              return;
            }
            case "Escape": {
              event.preventDefault();
              setCompletionAnchorRange(undefined);
              return;
            }
            default:
              break;
          }
        }

        if (event.key === "Enter") {
          if (event.shiftKey) {
            // Insert soft break.  Avoid hard breaks entirely.
            event.preventDefault();
            editor.insertText("\n");
          } else {
            // submit contents.  clear the editor.
            event.preventDefault();
            onSubmit();
            clearInput();
          }
        }
      },
      [
        completionAnchorRange,
        matchingUsers,
        completionCursorIndex,
        editor,
        onSubmit,
        clearInput,
      ],
    );

    useEffect(() => {
      if (completionAnchorRange && matchingUsers.length > 0) {
        const el = ref.current;
        const domRange = ReactEditor.toDOMRange(editor, completionAnchorRange);
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

          // On mobile, our completion candidates may get stuffed against the
          // right border of the viewport.  Allow it to start farther left if
          // we're up against the edge of the viewport.
          const idealLeft = rect.left + window.scrollX;
          let left = idealLeft;
          if (idealLeft + elRect.width > window.innerWidth) {
            left = window.innerWidth - elRect.width;
          }
          // But if the completion is too wide, make sure we keep it at least on screen.
          if (left < 0) left = 0;

          const top = rect.top + window.scrollY - elRect.height;

          el.style.top = `${top}px`;
          el.style.left = `${left}px`;
        }
      }
    }, [
      matchingUsers.length,
      editor,
      completionCursorIndex,
      completionSearchString,
      completionAnchorRange,
    ]);

    const onUserSelected = useCallback(
      (u: Meteor.User) => {
        Transforms.select(editor, completionAnchorRange!);
        insertMention(editor, u._id);
        setCompletionAnchorRange(undefined);
        ReactEditor.focus(editor);
      },
      [editor, completionAnchorRange],
    );

    const debugPane = DEBUG_EDITOR ? (
      <div style={{ position: "fixed", bottom: "0", right: "0" }}>
        <div style={{ width: "800px", overflowX: "auto", overflowY: "auto" }}>
          <pre>{JSON.stringify(editor.children, null, 2)}</pre>
        </div>
        <div>{`completionAnchorRange: ${JSON.stringify(
          completionAnchorRange,
        )}`}</div>
        <div>{`completionSearchString: ${completionSearchString}`}</div>
        <div>{`completionCursorIndex: ${completionCursorIndex}`}</div>
      </div>
    ) : undefined;

    return (
      <Slate editor={editor} initialValue={initialContent} onChange={onChange}>
        {debugPane}
        {completionAnchorRange && matchingUsers.length > 0 && (
          <Portal>
            <AutocompleteContainer
              ref={ref}
              style={{
                top: "-9999px",
                left: "-9999px",
              }}
            >
              {matchingUsers.map((user, i) => {
                return (
                  <MatchCandidate
                    key={user._id}
                    user={user}
                    selected={i === completionCursorIndex}
                    onSelected={onUserSelected}
                  />
                );
              })}
            </AutocompleteContainer>
          </Portal>
        )}
        <Editable
          ref={editableRef}
          className={className}
          placeholder={placeholder}
          decorate={decorate}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          renderPlaceholder={renderPlaceholder}
          onKeyDown={onKeyDown}
          readOnly={disabled}
        />
      </Slate>
    );
  },
);

export default FancyEditor;
