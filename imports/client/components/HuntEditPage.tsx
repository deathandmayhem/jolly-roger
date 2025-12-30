import { useTracker } from "meteor/react-meteor-data";
import { faInfo } from "@fortawesome/free-solid-svg-icons/faInfo";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type React from "react";
import { useCallback, useId, useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import type { FormProps } from "react-bootstrap/Form";
import Form from "react-bootstrap/Form";
import FormCheck from "react-bootstrap/FormCheck";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormText from "react-bootstrap/FormText";
import Modal from "react-bootstrap/Modal";
import Row from "react-bootstrap/Row";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import type { ActionMeta } from "react-select";
import Select from "react-select";
import DiscordCache from "../../lib/models/DiscordCache";
import type {
  EditableHuntType,
  SavedDiscordObjectType,
} from "../../lib/models/Hunts";
import Hunts from "../../lib/models/Hunts";
import Settings from "../../lib/models/Settings";
import discordChannelsForConfiguredGuild from "../../lib/publications/discordChannelsForConfiguredGuild";
import discordRolesForConfiguredGuild from "../../lib/publications/discordRolesForConfiguredGuild";
import settingsByName from "../../lib/publications/settingsByName";
import createHunt from "../../methods/createHunt";
import updateHunt from "../../methods/updateHunt";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import ActionButtonRow from "./ActionButtonRow";
import Markdown from "./Markdown";

enum SubmitState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  SUCCESS = "success",
  FAILED = "failed",
}

const huntRolesList = ["operator"];

type RoleSelectOption = { value: string; label: string };

const splitLists = function (lists: string): string[] {
  const strippedLists = lists.trim();
  if (strippedLists === "") {
    return [];
  }

  return strippedLists.split(/[, ]+/);
};

interface DiscordSelectorParams {
  disable: boolean;
  value: SavedDiscordObjectType | undefined;
  onChange: (next: SavedDiscordObjectType | undefined) => void;
}

interface DiscordSelectorProps extends DiscordSelectorParams {
  loading: boolean;
  options: SavedDiscordObjectType[];
}

const DiscordSelector = ({
  disable,
  value,
  onChange,
  loading,
  options,
}: DiscordSelectorProps) => {
  const onValueChanged: NonNullable<FormControlProps["onChange"]> = useCallback(
    (e) => {
      if (e.currentTarget.value === "empty") {
        onChange(undefined);
      } else {
        const match = options.find((obj) => {
          return obj.id === e.currentTarget.value;
        });
        if (match) {
          onChange(match);
        }
      }
    },
    [onChange, options],
  );

  const formOptions = useCallback((): SavedDiscordObjectType[] => {
    // List of the options.  Be sure to include the saved option if it's (for
    // some reason) not present in the channel list.
    const noneOption = {
      id: "empty",
      name: "disabled",
    } as SavedDiscordObjectType;

    if (value) {
      if (
        !options.find((opt) => {
          return opt.id === value.id;
        })
      ) {
        return [noneOption, value, ...options];
      }
    }
    return [noneOption, ...options];
  }, [value, options]);

  if (loading) {
    return <div>Loading discord resources...</div>;
  } else {
    return (
      <FormControl
        as="select"
        type="text"
        value={value?.id}
        disabled={disable}
        onChange={onValueChanged}
      >
        {formOptions().map(({ id, name }) => {
          return (
            <option key={id} value={id}>
              {name}
            </option>
          );
        })}
      </FormControl>
    );
  }
};

const DiscordChannelSelector = ({
  guildId,
  ...rest
}: DiscordSelectorParams & { guildId: string }) => {
  const cacheLoading = useTypedSubscribe(discordChannelsForConfiguredGuild);
  const loading = cacheLoading();

  const { options } = useTracker(() => {
    const discordChannels: SavedDiscordObjectType[] = DiscordCache.find(
      {
        type: "channel",
        "object.guild": guildId,
        // We want only text channels, since those are the only ones we can
        // bridge chat messages to. (0 is GUILD_TEXT, but we can't import
        // discordjs into client code because of server-only dependencies)
        "object.type": 0,
      },
      {
        // We want to sort them in the same order they're provided in the Discord UI.
        sort: { "object.rawPosition": 1 },
        projection: { "object.id": 1, "object.name": 1 },
      },
    ).map((c) => c.object as SavedDiscordObjectType);

    return {
      options: discordChannels,
    };
  }, [guildId]);
  return <DiscordSelector loading={loading} options={options} {...rest} />;
};

const DiscordRoleSelector = ({
  guildId,
  ...rest
}: DiscordSelectorParams & { guildId: string }) => {
  const cacheLoading = useTypedSubscribe(discordRolesForConfiguredGuild);
  const loading = cacheLoading();
  const { options } = useTracker(() => {
    const discordRoles: SavedDiscordObjectType[] = DiscordCache.find(
      {
        type: "role",
        "object.guild": guildId,
        // The role whose id is the same as the guild is the @everyone role, don't want that
        "object.id": { $ne: guildId },
        // Managed roles are owned by an integration
        "object.managed": false,
      },
      {
        // We want to sort them in the same order they're provided in the Discord UI.
        sort: { "object.rawPosition": 1 },
        projection: { "object.id": 1, "object.name": 1 },
      },
    ).map((c) => c.object as SavedDiscordObjectType);

    return {
      options: discordRoles,
    };
  }, [guildId]);
  return <DiscordSelector loading={loading} options={options} {...rest} />;
};

const HuntEditPage = () => {
  const huntId = useParams<{ huntId: string }>().huntId;
  const hunt = useTracker(
    () => (huntId ? Hunts.findOne(huntId) : null),
    [huntId],
  );

  useBreadcrumb({
    title: huntId ? "Edit Hunt" : "Create Hunt",
    path: `/hunts/${huntId ? `${huntId}/edit` : "new"}`,
  });

  useTypedSubscribe(settingsByName, { name: "discord.guild" });
  const guildId = useTracker(() => {
    const setting = Settings.findOne({ name: "discord.guild" });
    return setting?.value.guild.id;
  }, []);

  const defaultHuntTags = useTracker(() => {
    const settings = Settings.findOne({ name: "server.settings" });
    return (
      settings?.value.defaultHuntTags ??
      "is:meta, is:metameta, is:runaround, priority:high, priority:low, group:events, needs:extraction, needs:onsite"
    );
  }, []);

  const navigate = useNavigate();

  const footer = useRef<HTMLDivElement>(null);

  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [name, setName] = useState<string>(hunt?.name ?? "");
  const [initialTags, setInitialTags] = useState<string>(defaultHuntTags);
  const [mailingLists, setMailingLists] = useState<string>(
    hunt?.mailingLists.join(", ") ?? "",
  );
  const [moreInfo, setMoreInfo] = useState<string>(hunt?.moreInfo ?? "");

  const [defaultRoles, setDefaultRoles] = useState<string[]>(
    hunt?.defaultRoles ?? [],
  );

  const [signupMessage, setSignupMessage] = useState<string>(
    hunt?.signupMessage ?? "",
  );
  const [openSignups, setOpenSignups] = useState<boolean>(
    hunt?.openSignups ?? false,
  );
  const [hasGuessQueue, setHasGuessQueue] = useState<boolean>(
    hunt?.hasGuessQueue ?? true,
  );
  const [isArchived, setIsArchived] = useState<boolean>(
    hunt?.isArchived ?? false,
  );
  const [allowPuzzleEmbed, setAllowPuzzleEmbed] = useState<boolean>(
    hunt?.allowPuzzleEmbed ?? true,
  );
  const [termsOfUse, setTermsOfUse] = useState<string>(hunt?.termsOfUse ?? "");
  const [showTermsOfUsePreview, setShowTermsOfUsePreview] =
    useState<boolean>(false);
  const toggleShowTermsOfUsePreview = useCallback(
    () => setShowTermsOfUsePreview((prev) => !prev),
    [],
  );
  const [homepageUrl, setHomepageUrl] = useState<string>(
    hunt?.homepageUrl ?? "",
  );
  const [archivedHuntUrl, setArchivedHuntUrl] = useState<string>(
    hunt?.archivedHuntUrl ?? "",
  );
  const [originalHuntUrlRegex, setOriginalHuntUrlRegex] = useState<string>(
    hunt?.originalHuntUrlRegex ?? "",
  );
  const [submitTemplate, setSubmitTemplate] = useState<string>(
    hunt?.submitTemplate ?? "",
  );
  const [puzzleCreationDiscordChannel, setPuzzleCreationDiscordChannel] =
    useState<SavedDiscordObjectType | undefined>(
      hunt?.puzzleCreationDiscordChannel,
    );
  const [announcementDiscordChannel, setAnnouncementDiscordChannel] = useState<
    SavedDiscordObjectType | undefined
  >(hunt?.announcementDiscordChannel);
  const [puzzleHooksDiscordChannel, setPuzzleHooksDiscordChannel] = useState<
    SavedDiscordObjectType | undefined
  >(hunt?.puzzleHooksDiscordChannel);
  const [firehoseDiscordChannel, setFirehoseDiscordChannel] = useState<
    SavedDiscordObjectType | undefined
  >(hunt?.firehoseDiscordChannel);
  const [memberDiscordRole, setMemberDiscordRole] = useState<
    SavedDiscordObjectType | undefined
  >(hunt?.memberDiscordRole);

  const onNameChanged = useCallback<NonNullable<FormControlProps["onChange"]>>(
    (e) => {
      setName(e.currentTarget.value);
    },
    [],
  );

  const onTagsChanged = useCallback<NonNullable<FormControlProps["onChange"]>>(
    (e) => {
      setInitialTags(e.currentTarget.value);
    },
    [],
  );

  const onMailingListsChanged = useCallback<
    NonNullable<FormControlProps["onChange"]>
  >((e) => {
    setMailingLists(e.currentTarget.value);
  }, []);

  const onDefaultRolesChanged = useCallback(
    (
      value: readonly RoleSelectOption[],
      action: ActionMeta<RoleSelectOption>,
    ) => {
      let newRoles = [];
      switch (action.action) {
        case "clear":
        case "deselect-option":
        case "remove-value":
        case "create-option":
        case "pop-value":
        case "select-option":
          newRoles = value.map((v) => v.value);
          break;
        default:
          return;
      }
      setDefaultRoles(newRoles);
    },
    [],
  );

  const onSignupMessageChanged = useCallback<
    NonNullable<FormControlProps["onChange"]>
  >((e) => {
    setSignupMessage(e.currentTarget.value);
  }, []);

  const onMoreInfoChanged = useCallback<
    NonNullable<FormControlProps["onChange"]>
  >((e) => {
    setMoreInfo(e.currentTarget.value);
  }, []);

  const onOpenSignupsChanged = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setOpenSignups(e.currentTarget.checked);
    },
    [],
  );

  const onHasGuessQueueChanged = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasGuessQueue(e.currentTarget.checked);
    },
    [],
  );

  const onIsArchivedChanged = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsArchived(e.currentTarget.checked);
    },
    [],
  );

  const onAllowEmbedChanged = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAllowPuzzleEmbed(e.currentTarget.checked);
    },
    [],
  );

  const onTermsOfUseChanged = useCallback<
    NonNullable<FormControlProps["onChange"]>
  >((e) => {
    setTermsOfUse(e.currentTarget.value);
  }, []);

  const onHomepageUrlChanged = useCallback<
    NonNullable<FormControlProps["onChange"]>
  >((e) => {
    setHomepageUrl(e.currentTarget.value);
  }, []);

  const onArchivedHuntUrlChanged = useCallback<
    NonNullable<FormControlProps["onChange"]>
  >((e) => {
    setArchivedHuntUrl(e.currentTarget.value);
  }, []);

  const onOriginalHuntUrlRegexChanged = useCallback<
    NonNullable<FormControlProps["onChange"]>
  >((e) => {
    setOriginalHuntUrlRegex(e.currentTarget.value);
  }, []);

  const onSubmitTemplateChanged = useCallback<
    NonNullable<FormControlProps["onChange"]>
  >((e) => {
    setSubmitTemplate(e.currentTarget.value);
  }, []);

  const onPuzzleCreationDiscordChannelChanged = useCallback(
    (next: SavedDiscordObjectType | undefined) => {
      setPuzzleCreationDiscordChannel(next);
    },
    [],
  );
  const onAnnnouncementDiscordChannelChanged = useCallback(
    (next: SavedDiscordObjectType | undefined) => {
      setAnnouncementDiscordChannel(next);
    },
    [],
  );

  const onPuzzleHooksDiscordChannelChanged = useCallback(
    (next: SavedDiscordObjectType | undefined) => {
      setPuzzleHooksDiscordChannel(next);
    },
    [],
  );

  const onFirehoseDiscordChannelChanged = useCallback(
    (next: SavedDiscordObjectType | undefined) => {
      setFirehoseDiscordChannel(next);
    },
    [],
  );

  const onMemberDiscordRoleChanged = useCallback(
    (next: SavedDiscordObjectType | undefined) => {
      setMemberDiscordRole(next);
    },
    [],
  );

  const onFormCallback = useCallback(
    (error?: Error, newHuntId?: string) => {
      if (error) {
        setErrorMessage(error.message);
        setSubmitState(SubmitState.FAILED);
      } else {
        setSubmitState(SubmitState.SUCCESS);
        setErrorMessage("");

        // If there's a result, that means we created a new hunt - redirect to it.
        // Otherwise stay on this page and let people navigate themselves
        if (newHuntId) {
          navigate(`/hunts/${newHuntId}`);
        }
      }

      setTimeout(() => {
        // Scroll to bottom of the page so people can see whatever banners we show
        footer.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    },
    [navigate],
  );

  const onFormSubmit = useCallback<NonNullable<FormProps["onSubmit"]>>(
    (e) => {
      e.preventDefault();

      setSubmitState(SubmitState.SUBMITTING);
      const state: EditableHuntType = {
        name,
        mailingLists: splitLists(mailingLists),
        signupMessage: signupMessage === "" ? undefined : signupMessage,
        openSignups,
        hasGuessQueue,
        termsOfUse: termsOfUse === "" ? undefined : termsOfUse,
        homepageUrl: homepageUrl === "" ? undefined : homepageUrl,
        submitTemplate: submitTemplate === "" ? undefined : submitTemplate,
        puzzleCreationDiscordChannel,
        announcementDiscordChannel,
        puzzleHooksDiscordChannel,
        firehoseDiscordChannel,
        memberDiscordRole,
        isArchived,
        allowPuzzleEmbed,
        defaultRoles,
        moreInfo: moreInfo === "" ? undefined : moreInfo,
        archivedHuntUrl: archivedHuntUrl === "" ? undefined : archivedHuntUrl,
        originalHuntUrlRegex:
          originalHuntUrlRegex === "" ? undefined : originalHuntUrlRegex,
      };

      if (huntId) {
        updateHunt.call({ huntId, value: state }, onFormCallback);
      } else {
        const createPayload = {
          ...state,
          initialTags,
        };
        createHunt.call(createPayload, onFormCallback);
      }
    },
    [
      onFormCallback,
      puzzleCreationDiscordChannel,
      announcementDiscordChannel,
      puzzleHooksDiscordChannel,
      firehoseDiscordChannel,
      memberDiscordRole,
      allowPuzzleEmbed,
      archivedHuntUrl,
      defaultRoles,
      hasGuessQueue,
      homepageUrl,
      huntId,
      initialTags,
      isArchived,
      mailingLists,
      moreInfo,
      name,
      openSignups,
      originalHuntUrlRegex,
      signupMessage,
      submitTemplate,
      termsOfUse,
    ],
  );

  const onSuccessDismiss = useCallback(
    () => setSubmitState(SubmitState.IDLE),
    [],
  );

  const disableForm = submitState === SubmitState.SUBMITTING;

  const termsOfUsePreview = createPortal(
    <Modal
      show={showTermsOfUsePreview}
      size="lg"
      onHide={toggleShowTermsOfUsePreview}
    >
      <Modal.Body>
        <Markdown text={termsOfUse} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={toggleShowTermsOfUsePreview}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>,
    document.body,
  );

  const idPrefix = useId();

  return (
    <Container>
      <h1>{huntId ? "Edit Hunt" : "New Hunt"}</h1>

      <Form onSubmit={onFormSubmit}>
        <FormGroup
          as={Row}
          className="mb-3"
          controlId={`${idPrefix}-hunt-form-name`}
        >
          <FormLabel column xs={3}>
            Name
          </FormLabel>
          <Col xs={9}>
            <FormControl
              type="text"
              value={name}
              onChange={onNameChanged}
              disabled={disableForm}
            />
          </Col>
        </FormGroup>
        {huntId ? null : (
          <FormGroup as={Row} className="mb-3">
            <FormLabel column xs={3} htmlFor="hunt-form-name">
              Initial tags
            </FormLabel>
            <Col xs={9}>
              <FormControl
                id={`${idPrefix}-hunt-form-name`}
                type="text"
                value={initialTags}
                onChange={onTagsChanged}
                disabled={disableForm}
              />
            </Col>
          </FormGroup>
        )}

        <h3>Users and permissions</h3>

        <FormGroup
          as={Row}
          className="mb-3"
          controlId={`${idPrefix}-hunt-form-signup-message`}
        >
          <FormLabel column xs={3}>
            Signup message
          </FormLabel>
          <Col xs={9}>
            <FormControl
              as="textarea"
              value={signupMessage}
              onChange={onSignupMessageChanged}
              disabled={disableForm}
            />
            <FormText>
              This message (rendered as markdown) will be shown to users who
              aren&apos;t part of the hunt. This is a good place to put
              directions for how to sign up.
            </FormText>
          </Col>
        </FormGroup>

        <FormGroup as={Row} className="mb-3">
          <FormLabel column xs={3} htmlFor="hunt-form-more-info">
            More Information
          </FormLabel>
          <Col xs={9}>
            <FormControl
              id={`${idPrefix}-hunt-form-more-info`}
              as="textarea"
              value={moreInfo}
              onChange={onMoreInfoChanged}
              disabled={disableForm}
            />
            <FormText>
              This message (rendered as markdown) will be shown to users on the
              More page of the hunt. This could include things like links to
              resources, or other more or less static information.
            </FormText>
          </Col>
        </FormGroup>

        <FormGroup as={Row} className="mb-3">
          <FormLabel column xs={3} htmlFor="hunt-form-default-roles">
            Default roles
          </FormLabel>
          <Col xs={9}>
            <Select
              id={`${idPrefix}-hunt-form-default-roles`}
              isMulti
              options={huntRolesList.map((r) => {
                return { label: r, value: r };
              })}
              value={defaultRoles.map((r) => {
                return { label: r, value: r };
              })}
              onChange={onDefaultRolesChanged}
            />
            <FormText>
              Users joining this hunt will be automatically assigned these
              roles.
            </FormText>
          </Col>
        </FormGroup>
        <FormGroup
          as={Row}
          className="mb-3"
          controlId={`${idPrefix}-hunt-form-open-signups`}
        >
          <FormLabel column xs={3}>
            Open invites
          </FormLabel>
          <Col xs={9}>
            <FormCheck
              id={`${idPrefix}-hunt-form-open-signups`}
              checked={openSignups}
              onChange={onOpenSignupsChanged}
              disabled={disableForm}
            />
            <FormText>
              If open invites are enabled, then any current member of the hunt
              can add a new member to the hunt. Otherwise, only operators can
              add new members.
            </FormText>
          </Col>
        </FormGroup>

        <FormGroup
          as={Row}
          className="mb-3"
          controlId={`${idPrefix}-hunt-form-has-guess-queue`}
        >
          <FormLabel column xs={3}>
            Guess queue
          </FormLabel>
          <Col xs={9}>
            <FormCheck
              id={`${idPrefix}-hunt-form-has-guess-queue`}
              checked={hasGuessQueue}
              onChange={onHasGuessQueueChanged}
              disabled={disableForm}
            />
            <FormText>
              If enabled, users can submit guesses for puzzles but operators
              must mark them as correct. If disabled, any user can enter the
              puzzle answer.
            </FormText>
          </Col>
        </FormGroup>

        <FormGroup
          as={Row}
          className="mb-3"
          controlId={`${idPrefix}-hunt-form-terms-of-use`}
        >
          <FormLabel column xs={3}>
            Terms of use
          </FormLabel>
          <Col xs={9}>
            <FormControl
              as="textarea"
              value={termsOfUse}
              onChange={onTermsOfUseChanged}
              disabled={disableForm}
            />
            <FormText>
              If specified, this text (rendered as Markdown) will be shown to
              users when the first visit the hunt website, and they will be
              required to accept it before they can proceed.
              <ActionButtonRow>
                <Button
                  variant="secondary"
                  onClick={toggleShowTermsOfUsePreview}
                >
                  Preview
                </Button>
              </ActionButtonRow>
            </FormText>
          </Col>
        </FormGroup>

        {termsOfUsePreview}

        <h3>Hunt website</h3>

        <FormGroup
          as={Row}
          className="mb-3"
          controlId={`${idPrefix}-hunt-form-homepage-url`}
        >
          <FormLabel column xs={3}>
            Homepage URL
          </FormLabel>
          <Col xs={9}>
            <FormControl
              type="text"
              value={homepageUrl}
              onChange={onHomepageUrlChanged}
              disabled={disableForm}
            />
            <FormText>
              If provided, a link to the hunt homepage will be placed on the
              landing page.
            </FormText>
          </Col>
        </FormGroup>

        <FormGroup
          as={Row}
          className="mb-3"
          controlId={`${idPrefix}-hunt-form-submit-template`}
        >
          <FormLabel column xs={3}>
            Submit URL template
          </FormLabel>
          <Col xs={9}>
            <FormControl
              type="text"
              value={submitTemplate}
              onChange={onSubmitTemplateChanged}
              disabled={disableForm}
            />
            <FormText>
              If provided, this{" "}
              <a href="https://mustache.github.io/mustache.5.html">
                Mustache template
              </a>{" "}
              is used to generate the link to the guess submission page. It gets
              as context a{" "}
              <a href="https://developer.mozilla.org/en-US/docs/Web/API/URL">
                parsed URL
              </a>
              {", "}
              providing variables like <code>hostname</code> or{" "}
              <code>pathname</code>
              {". "}
              Because this will be used as a link directly, make sure to use
              &quot;triple-mustaches&quot; so that the URL components
              aren&apos;t escaped. As an example, setting this to{" "}
              <code>{"{{{origin}}}/submit{{{pathname}}}"}</code> would work for
              the 2018 Mystery Hunt. If not specified, the puzzle URL is used as
              the link to the guess submission page.
            </FormText>
          </Col>
        </FormGroup>

        <FormGroup as={Row} className="mb-3">
          <FormLabel column xs={3} htmlFor="hunt-form-allow-embed">
            Allow puzzle embedding
          </FormLabel>
          <Col xs={9}>
            <FormCheck
              id={`${idPrefix}-hunt-form-allow-embed`}
              checked={allowPuzzleEmbed}
              onChange={onAllowEmbedChanged}
              disabled={disableForm}
              type="switch"
              label={allowPuzzleEmbed ? "Allowed" : "Not allowed"}
            />
            <FormText>
              If enabled, we will allow users to view puzzle pages in Jolly
              Roger. This should be disabled where site security settings (e.g.
              CORS) prevent us from iFraming the website.
            </FormText>
          </Col>
        </FormGroup>

        <FormGroup as={Row} className="mb-3">
          <FormLabel column xs={3} htmlFor="hunt-form-is-archived">
            Archive hunt
          </FormLabel>
          <Col xs={9}>
            <FormCheck
              id={`${idPrefix}-hunt-form-is-archived`}
              checked={isArchived}
              onChange={onIsArchivedChanged}
              disabled={disableForm}
            />
            <FormText>
              If archived, this hunt will be displayed below non-archived hunts.
            </FormText>
          </Col>
        </FormGroup>

        <FormGroup as={Row} className="mb-3">
          <FormLabel column xs={3} htmlFor="hunt-form-archive-url">
            Archive URL
          </FormLabel>
          <Col xs={9}>
            <FormControl
              id={`${idPrefix}-hunt-form-archive-url`}
              type="text"
              value={archivedHuntUrl}
              onChange={onArchivedHuntUrlChanged}
              disabled={disableForm}
            />
            <FormText>
              If provided, this will replace the Homepage URL in various places
              in the site.
            </FormText>
          </Col>
        </FormGroup>

        <FormGroup as={Row} className="mb-3">
          <FormLabel column xs={3} htmlFor="hunt-form-original-pattern">
            Original Hunt URL Regex
          </FormLabel>
          <Col xs={9}>
            <FormControl
              id={`${idPrefix}-hunt-form-original-pattern`}
              type="text"
              value={originalHuntUrlRegex}
              onChange={onOriginalHuntUrlRegexChanged}
              disabled={disableForm}
            />
            <FormText>
              If an archive URL (above), then it will replace this pattern
              instead of the Homepage URL.
            </FormText>
          </Col>
        </FormGroup>

        <h3>External integrations</h3>

        <FormGroup
          as={Row}
          className="mb-3"
          controlId={`${idPrefix}-hunt-form-mailing-lists`}
        >
          <FormLabel column xs={3}>
            Mailing lists
          </FormLabel>
          <Col xs={9}>
            <FormControl
              type="text"
              value={mailingLists}
              onChange={onMailingListsChanged}
              disabled={disableForm}
            />
            <FormText>
              Users joining this hunt will be automatically added to all of
              these (comma-separated) lists
            </FormText>
          </Col>
        </FormGroup>

        {guildId ? (
          <>
            <FormGroup
              as={Row}
              className="mb-3"
              controlId={`${idPrefix}-hunt-form-puzzle-hooks-discord-channel`}
            >
              <FormLabel
                column
                xs={3}
                htmlFor="hunt-form-puzzle-hooks-discord-channel"
              >
                Puzzle creation Discord channel
              </FormLabel>
              <Col xs={9}>
                <DiscordChannelSelector
                  guildId={guildId}
                  disable={disableForm}
                  value={puzzleCreationDiscordChannel}
                  onChange={onPuzzleCreationDiscordChannelChanged}
                />
                <FormText>
                  If this field is specified, when a puzzle in this hunt is{" "}
                  <strong>added</strong>, a message will be sent to the
                  specified channel.
                </FormText>
              </Col>
            </FormGroup>
            <FormGroup
              as={Row}
              className="mb-3"
              controlId={`${idPrefix}-hunt-form-announcement-discord-channel`}
            >
              <FormLabel column xs={3}>
                Puzzle notifications Discord channel
              </FormLabel>
              <Col xs={9}>
                <DiscordChannelSelector
                  guildId={guildId}
                  disable={disableForm}
                  value={announcementDiscordChannel}
                  onChange={onAnnnouncementDiscordChannelChanged}
                />
                <FormText>
                  If this field is specified, announcements made on Jolly Meow
                  will be mirrored to this channel.
                </FormText>
              </Col>
            </FormGroup>

            <FormGroup
              as={Row}
              className="mb-3"
              controlId={`${idPrefix}-hunt-form-puzzle-hooks-discord-channel`}
            >
              <FormLabel column xs={3}>
                Puzzle notifications Discord channel
              </FormLabel>
              <Col xs={9}>
                <DiscordChannelSelector
                  guildId={guildId}
                  disable={disableForm}
                  value={puzzleHooksDiscordChannel}
                  onChange={onPuzzleHooksDiscordChannelChanged}
                />
                <FormText>
                  If this field is specified, when a puzzle in this hunt is{" "}
                  <strong>solved</strong>, a message will be sent to the
                  specified channel.
                </FormText>
              </Col>
            </FormGroup>

            <FormGroup
              as={Row}
              className="mb-3"
              controlId={`${idPrefix}-hunt-form-firehose-discord-channel`}
            >
              <FormLabel column xs={3}>
                Firehose Discord channel
              </FormLabel>
              <Col xs={9}>
                <DiscordChannelSelector
                  guildId={guildId}
                  disable={disableForm}
                  value={firehoseDiscordChannel}
                  onChange={onFirehoseDiscordChannelChanged}
                />
                <FormText>
                  If this field is specified, all chat messages written in
                  puzzles associated with this hunt will be mirrored to the
                  specified Discord channel.
                </FormText>
              </Col>
            </FormGroup>

            <FormGroup
              as={Row}
              className="mb-3"
              controlId={`${idPrefix}-hunt-form-member-discord-role`}
            >
              <FormLabel column xs={3}>
                Discord role for members
              </FormLabel>
              <Col xs={9}>
                <DiscordRoleSelector
                  guildId={guildId}
                  disable={disableForm}
                  value={memberDiscordRole}
                  onChange={onMemberDiscordRoleChanged}
                />
                <FormText>
                  If set, then members of the hunt that have linked their
                  Discord profile are added to the specified Discord role. Note
                  that for continuity, if this setting is changed, Jolly Roger
                  will not touch the old role (e.g. to remove members)
                </FormText>
              </Col>
            </FormGroup>
          </>
        ) : (
          <Alert variant="info">
            <FontAwesomeIcon icon={faInfo} fixedWidth />
            Discord has not been configured, so Discord settings are disabled.
          </Alert>
        )}

        <div ref={footer}>
          {submitState === SubmitState.FAILED && (
            <Alert variant="danger">{errorMessage}</Alert>
          )}
          {submitState === SubmitState.SUCCESS && (
            <Alert variant="success" dismissible onClose={onSuccessDismiss}>
              Hunt information successfully updated
            </Alert>
          )}

          <ActionButtonRow>
            <FormGroup className="mb-3">
              <Button variant="primary" type="submit" disabled={disableForm}>
                {huntId ? "Save" : "Create"}
              </Button>
            </FormGroup>
          </ActionButtonRow>
        </div>
      </Form>
    </Container>
  );
};

export default HuntEditPage;
