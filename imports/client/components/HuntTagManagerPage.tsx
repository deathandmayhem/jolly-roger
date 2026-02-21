import { useTracker } from "meteor/react-meteor-data";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faTags } from "@fortawesome/free-solid-svg-icons/faTags";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, {
  type ChangeEvent,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import FormCheck from "react-bootstrap/FormCheck";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import InputGroup from "react-bootstrap/InputGroup";
import Row from "react-bootstrap/Row";
import Table from "react-bootstrap/Table";
import { useTranslation } from "react-i18next";
import type { FormProps } from "react-router-dom";
import { useParams } from "react-router-dom";
import type { ActionMeta, SingleValue } from "react-select";
import Select from "react-select";
import styled, { css, useTheme } from "styled-components";
import { indexedById } from "../../lib/listUtils";
import type { PuzzleType } from "../../lib/models/Puzzles";
import Puzzles from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import Tags from "../../lib/models/Tags";
import puzzlesForPuzzleList from "../../lib/publications/puzzlesForPuzzleList";
import type { Solvedness } from "../../lib/solvedness";
import { computeSolvedness } from "../../lib/solvedness";
import addPuzzleTag from "../../methods/addPuzzleTag";
import removePuzzleTag from "../../methods/removePuzzleTag";
import renameTag from "../../methods/renameTag";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import { compilePuzzleMatcher } from "../search";
import { mediaBreakpointDown } from "./styling/responsive";
import TagList from "./TagList";

enum SubmitState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  SUCCESS = "success",
  FAILED = "failed",
}

type TagSelectOption = { value: string; label: string };

const SearchFormGroup = styled(FormGroup)`
  grid-column: -3;
  ${mediaBreakpointDown(
    "sm",
    css`
      grid-column: 1 / -1;
    `,
  )}
`;

const PuzzleListToolbar = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5em;
`;

const TagManagerTagListColumn = styled(TagList)`
  padding: 0 2px;
  display: inline-block;
  flex: 3;
  margin: -2px -4px -2px 0;
  ${mediaBreakpointDown(
    "xs",
    css`
      flex: 0 0 100%;
    `,
  )}
`;

const RenameTagSection = ({ huntId }: { huntId: string }) => {
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);

  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [newTagName, setNewTagName] = useState<string>("");

  const allTags = useTracker(
    () => Tags.find({ hunt: huntId }).fetch(),
    [huntId],
  );

  const tagToRename = useTracker(
    () => (selectedTagId ? Tags.findOne({ _id: selectedTagId }) : undefined),
    [selectedTagId],
  );

  const selectOptions: TagSelectOption[] = useTracker(
    () =>
      allTags
        .map((t) => {
          return { value: t._id, label: t.name };
        })
        .sort((a, b) =>
          a.label.toLowerCase().localeCompare(b.label.toLowerCase()),
        ),
    [allTags],
  );
  const selectedOption = useMemo(() => {
    return tagToRename
      ? { value: tagToRename._id, label: tagToRename.name }
      : undefined;
  }, [tagToRename]);

  const dismissAlert = useCallback(() => {
    setSubmitState(SubmitState.IDLE);
  }, []);

  const onSelectedTagChanged = useCallback((value: TagSelectOption | null) => {
    if (value) {
      setSelectedTagId(value.value);
      setNewTagName(value.label);
    } else {
      setSelectedTagId("");
      setNewTagName("");
    }
  }, []);

  const onNameChanged = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewTagName(e.currentTarget.value);
    },
    [],
  );

  const onFormSubmit = useCallback<NonNullable<FormProps["onSubmit"]>>(
    (e) => {
      e.preventDefault();
      setSubmitState(SubmitState.SUBMITTING);
      renameTag.call(
        { tagId: selectedTagId, name: newTagName },
        (error?: Error) => {
          if (error) {
            setSubmitState(SubmitState.FAILED);
            setErrorMessage(error.message);
          } else {
            setSubmitState(SubmitState.SUCCESS);
            setErrorMessage("");
          }
        },
      );
    },
    [selectedTagId, newTagName],
  );

  const isNameDirtied = tagToRename?.name.trim() !== newTagName.trim();
  const disableRename =
    !isNameDirtied || submitState === SubmitState.SUBMITTING;

  const idPrefix = useId();
  const theme = useTheme();

  const { t } = useTranslation();

  return (
    <section>
      <h2>{t("tags.renameTagSection.title", "Rename tag")}</h2>
      <p>
        {t(
          "tags.renameTagSection.description",
          'Select a tag from the drop-down, then type its new name, and choose "Rename".',
        )}
      </p>
      <Form onSubmit={onFormSubmit}>
        {submitState === SubmitState.FAILED ? (
          <Alert variant="danger" dismissible onClose={dismissAlert}>
            {errorMessage}
          </Alert>
        ) : null}
        <Row className="mb-3 align-items-end">
          <Col xs={5}>
            <FormGroup className="mb-3" controlId={`${idPrefix}-rename-source`}>
              <FormLabel>
                {t("tags.renameTagSection.selectLabel", "Tag to rename")}
              </FormLabel>
              <Select
                inputId={`${idPrefix}-rename-source`}
                options={selectOptions}
                value={selectedOption}
                onChange={onSelectedTagChanged}
                theme={theme.reactSelectTheme}
              />
            </FormGroup>
          </Col>
          <Col xs={5}>
            <FormGroup
              className="mb-3"
              controlId={`${idPrefix}-rename-destination`}
            >
              <FormLabel>
                {t("tags.renameTagSection.newNameLabel", "New name")}
              </FormLabel>
              <FormControl
                type="text"
                onChange={onNameChanged}
                placeholder={tagToRename?.name}
                value={newTagName}
              />
            </FormGroup>
          </Col>
          <Col xs={2}>
            <FormGroup className="mb-3">
              <Button variant="primary" type="submit" disabled={disableRename}>
                {t("tags.renameTagSection.renameButton", "Rename")}
              </Button>
            </FormGroup>
          </Col>
        </Row>
      </Form>
    </section>
  );
};

const SolveColoredTr = styled.tr<{ $solvedness: Solvedness }>`
  td {
    background-color: ${({ theme, $solvedness }) => {
      return theme.colors.solvedness[$solvedness];
    }};
  }
`;

const SelectablePuzzle = ({
  puzzle,
  tagsById,
  isSelected,
  onSelectedChanged,
}: {
  puzzle: PuzzleType;
  tagsById: Map<string, TagType>;
  isSelected: boolean;
  onSelectedChanged: (puzzleId: string, isSelected: boolean) => void;
}) => {
  const onCheckChanged = useCallback(() => {
    onSelectedChanged(puzzle._id, !isSelected);
  }, [onSelectedChanged, puzzle._id, isSelected]);
  const id = useId();
  const puzzleTags: TagType[] = puzzle.tags
    .map((tagId) => tagsById.get(tagId)!)
    .filter(Boolean);
  const solvedness = computeSolvedness(puzzle);

  return (
    <SolveColoredTr $solvedness={solvedness}>
      <td>
        <FormCheck
          type="checkbox"
          id={id}
          checked={isSelected}
          onChange={onCheckChanged}
        />
      </td>
      <td>
        <label htmlFor={id}>{puzzle.title}</label>
      </td>
      <td>
        <TagManagerTagListColumn
          puzzle={puzzle}
          tags={puzzleTags}
          linkToSearch
          popoverRelated={false}
        />
      </td>
    </SolveColoredTr>
  );
};

const TableContainer = styled.div`
  height: 500px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const StyledTable = styled(Table)`
  thead tr th {
    position: sticky;
    top: 0;

    &:nth-child(1) {
      width: 28px;
    }

    &:nth-child(2) {
      text-align: left;
    }

    &:nth-child(3) {
      text-align: right;
    }
  }

  tbody tr td {
    &:nth-child(1) {
      width: 28px;
    }

    &:nth-child(2) {
      text-align: left;
    }

    &:nth-child(3) {
      text-align: right;
    }
  }
`;

const SelectablePuzzleList = ({
  puzzles,
  tagsById,
  selected,
  onSelectionChange,
  selectAll,
  deselectAll,
}: {
  puzzles: PuzzleType[];
  tagsById: Map<string, TagType>;
  selected: Set<string>;
  onSelectionChange: (puzzleId: string, isSelected: boolean) => void;
  selectAll: (puzzleIds: string[]) => void;
  deselectAll: (puzzleIds: string[]) => void;
}) => {
  const id = useId();
  const allSelected =
    puzzles.length > 0 && puzzles.every((p) => selected.has(p._id));
  const onHeaderCheckClicked = useCallback(() => {
    if (allSelected) {
      deselectAll(puzzles.map((p) => p._id));
    } else {
      selectAll(puzzles.map((p) => p._id));
    }
  }, [puzzles, allSelected, selectAll, deselectAll]);

  const selectablePuzzles = puzzles.map((p) => {
    const isSelected = selected.has(p._id);
    return (
      <SelectablePuzzle
        key={p._id}
        puzzle={p}
        tagsById={tagsById}
        isSelected={isSelected}
        onSelectedChanged={onSelectionChange}
      />
    );
  });

  const { t } = useTranslation();

  return (
    <TableContainer className="mb-3">
      <StyledTable>
        <thead>
          <tr>
            <th>
              <FormCheck
                type="checkbox"
                id={id}
                checked={allSelected}
                onChange={onHeaderCheckClicked}
              />
            </th>
            <th>{t("common.puzzle", "Puzzle")}</th>
            <th>{t("tags.tags", "Tags")}</th>
          </tr>
        </thead>
        <tbody>{selectablePuzzles}</tbody>
      </StyledTable>
    </TableContainer>
  );
};

const BulkAddRemoveSection = ({
  loading,
  huntId,
}: {
  loading: boolean;
  huntId: string;
}) => {
  // List of tag IDs
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [searchString, setSearchString] = useState<string>("");

  // Selected puzzles will be listed with a checkmark.
  const [selectedPuzzleIds, setSelectedPuzzleIds] = useState<Set<string>>(
    new Set(),
  );

  const searchBarRef = useRef<HTMLInputElement>(null);

  const setPuzzleSelected = useCallback(
    (puzzleId: string, isSelected: boolean) => {
      setSelectedPuzzleIds((prevSelected) => {
        const next = new Set(prevSelected);
        if (isSelected) {
          next.add(puzzleId);
        } else {
          next.delete(puzzleId);
        }
        return next;
      });
    },
    [],
  );

  const selectAllOf = useCallback((puzzleIds: string[]) => {
    setSelectedPuzzleIds((prevSelected) => {
      const next = new Set(prevSelected);
      puzzleIds.forEach((puzzleId) => {
        next.add(puzzleId);
      });
      return next;
    });
  }, []);

  const deselectAllOf = useCallback((puzzleIds: string[]) => {
    setSelectedPuzzleIds((prevSelected) => {
      const next = new Set(prevSelected);
      puzzleIds.forEach((puzzleId) => {
        next.delete(puzzleId);
      });
      return next;
    });
  }, []);

  const allPuzzles = useTracker(
    () => Puzzles.find({ hunt: huntId }).fetch(),
    [huntId],
  );
  const allTags = useTracker(
    () => Tags.find({ hunt: huntId }).fetch(),
    [huntId],
  );
  const tagsById = useMemo(() => {
    return indexedById(allTags);
  }, [allTags]);

  const selectOptions: TagSelectOption[] = useTracker(
    () =>
      allTags
        .map((t) => {
          return { value: t._id, label: t.name };
        })
        .sort((a, b) =>
          a.label.toLowerCase().localeCompare(b.label.toLowerCase()),
        ),
    [allTags],
  );

  const onSearchStringChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setSearchString(e.currentTarget.value);
    },
    [],
  );

  const clearSearch = useCallback(() => {
    setSearchString("");
  }, []);

  const onSelectedTagsChanged = useCallback(
    (
      newValue: SingleValue<TagSelectOption>,
      action: ActionMeta<TagSelectOption>,
    ) => {
      let newRoles = [];
      switch (action.action) {
        case "clear":
        case "deselect-option":
        case "remove-value":
        case "create-option":
        case "pop-value":
        case "select-option":
          newRoles = newValue ? [newValue.value] : [];
          break;
        default:
          return;
      }
      setBulkTags(newRoles);
    },
    [],
  );

  const puzzlesMatchingSearchString = useCallback(
    (puzzles: PuzzleType[]): PuzzleType[] => {
      const searchKeys = searchString.split(" ");
      if (searchKeys.length === 1 && searchKeys[0] === "") {
        // No search query, so no need to do fancy search computation
        return puzzles;
      } else {
        const searchKeysWithEmptyKeysRemoved = searchKeys.filter((key) => {
          return key.length > 0;
        });
        const isInteresting = compilePuzzleMatcher(
          allTags,
          searchKeysWithEmptyKeysRemoved,
        );
        return puzzles.filter(isInteresting);
      }
    },
    [searchString, allTags],
  );

  const matchingSearch = puzzlesMatchingSearchString(allPuzzles);

  const selectedAndMatchingSearch = useMemo(() => {
    return matchingSearch.filter((p) => selectedPuzzleIds.has(p._id));
  }, [matchingSearch, selectedPuzzleIds]);

  const tagNamesForIds = useCallback(
    (tagIds: string[]) => {
      const tagNames: Record<string, string> = {};
      allTags.forEach((t) => {
        tagNames[t._id] = t.name;
      });
      return tagIds.map((t) => tagNames[t] ?? t);
    },
    [allTags],
  );

  // You can add if one of the selected puzzles lacks the selected tag.
  const canAddTag = useMemo(() => {
    return bulkTags.length > 0
      ? selectedAndMatchingSearch.filter((puzzle) => {
          return bulkTags.some((tagId) => !puzzle.tags.includes(tagId));
        })
      : [];
  }, [bulkTags, selectedAndMatchingSearch]);

  // You can remove if at least one of the selected puzzles
  const canRemoveTag = useMemo(() => {
    return bulkTags.length > 0
      ? selectedAndMatchingSearch.filter((puzzle) => {
          return bulkTags.every((tagId) => puzzle.tags.includes(tagId));
        })
      : [];
  }, [bulkTags, selectedAndMatchingSearch]);

  const addTagsToSelectedAndVisible = useCallback(() => {
    canAddTag.forEach((puzzle) => {
      const tagNames = tagNamesForIds(bulkTags);
      tagNames.forEach((tagName) => {
        const puzzleId = puzzle._id;
        addPuzzleTag.call({ puzzleId, tagName }, () => {
          /* intentionally empty */
        });
      });
    });
  }, [canAddTag, bulkTags, tagNamesForIds]);

  const removeTagsFromSelectedAndVisible = useCallback(() => {
    canRemoveTag.forEach((puzzle) => {
      bulkTags.forEach((tagId) => {
        const puzzleId = puzzle._id;
        removePuzzleTag.call({ puzzleId, tagId }, () => {
          /* intentionally empty */
        });
      });
    });
  }, [canRemoveTag, bulkTags]);

  const idPrefix = useId();
  const theme = useTheme();

  const { t } = useTranslation();

  return (
    <section>
      <h2>{t("tags.bulkAddRemoveSection.title", "Bulk add/remove tags")}</h2>
      <p>
        {t(
          "tags.bulkAddRemoveSection.description",
          "Select puzzles to modify, then select tag to add or remove",
        )}
      </p>
      <SearchFormGroup controlId={`${idPrefix}-puzzle-search`}>
        <InputGroup>
          <FormControl
            as="input"
            type="text"
            ref={searchBarRef}
            placeholder={t("tags.filterBy", "Filter by title, answer, or tag")}
            value={searchString}
            onChange={onSearchStringChange}
          />
          <Button variant="secondary" onClick={clearSearch}>
            <FontAwesomeIcon icon={faEraser} />
          </Button>
        </InputGroup>
      </SearchFormGroup>
      <PuzzleListToolbar>
        <span>
          {t(
            "tags.bulkAddRemoveSection.showCount",
            "Showing {{matchCount}} of {{totalCount}} items",
            {
              matchCount: matchingSearch.length,
              totalCount: allPuzzles.length,
            },
          )}
        </span>
        <span>
          {t("tags.bulkAddRemoveSection.selected", "{{count}} selected", {
            count: selectedAndMatchingSearch.length,
          })}
        </span>
      </PuzzleListToolbar>
      {!loading && (
        <SelectablePuzzleList
          puzzles={matchingSearch}
          tagsById={tagsById}
          selected={selectedPuzzleIds}
          onSelectionChange={setPuzzleSelected}
          selectAll={selectAllOf}
          deselectAll={deselectAllOf}
        />
      )}
      <Row className="mb-3 align-items-end">
        <FormGroup as={Col} xs={5} controlId={`${idPrefix}-bulk-selected-tags`}>
          <label
            className="form-label"
            htmlFor={`${idPrefix}-bulk-selected-tags`}
          >
            {t("tags.bulkAddRemoveSection.tagsToApply", "Tag to apply")}:
          </label>
          <Select
            inputId={`${idPrefix}-bulk-selected-tags`}
            options={selectOptions}
            menuPlacement="auto"
            onChange={onSelectedTagsChanged}
            theme={theme.reactSelectTheme}
          />
        </FormGroup>
        <FormGroup as={Col} xs={7}>
          <ButtonGroup>
            <Button
              variant="success"
              disabled={canAddTag.length === 0}
              onClick={addTagsToSelectedAndVisible}
            >
              <FontAwesomeIcon icon={faTags} />
              {t("tags.bulkAddRemoveSection.add", "Add to {{count}} selected", {
                count: canAddTag.length,
              })}
            </Button>
            <Button
              variant="danger"
              disabled={canRemoveTag.length === 0}
              onClick={removeTagsFromSelectedAndVisible}
            >
              <FontAwesomeIcon icon={faTimes} />
              {t(
                "tags.bulkAddRemoveSection.remove",
                "Remove from {{count}} selected",
                { count: canRemoveTag.length },
              )}
            </Button>
          </ButtonGroup>
        </FormGroup>
      </Row>
    </section>
  );
};

const HuntTagManagerPage = React.memo(() => {
  const huntId = useParams<{ huntId: string }>().huntId!;
  const { t } = useTranslation();
  useBreadcrumb({
    title: t("tags.breadcrumbTitle", "Tags"),
    path: `/hunts/${huntId}/tags`,
  });

  const puzzlesLoading = useTypedSubscribe(puzzlesForPuzzleList, {
    huntId,
    includeDeleted: true,
  });
  const loading = puzzlesLoading();

  return (
    <Container>
      <h1>{t("tags.title", "Tag Manager")}</h1>
      <RenameTagSection huntId={huntId} />
      <hr />
      <BulkAddRemoveSection loading={loading} huntId={huntId} />
    </Container>
  );
});

export default HuntTagManagerPage;
