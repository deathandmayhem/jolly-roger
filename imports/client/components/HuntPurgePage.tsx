import { useTracker } from "meteor/react-meteor-data";
import { faInfo } from "@fortawesome/free-solid-svg-icons/faInfo";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useCallback, useRef, useState } from "react";
import { Modal, ModalBody, ModalFooter } from "react-bootstrap";
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
import Row from "react-bootstrap/Row";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import Select, { ActionMeta } from "react-select";
import DiscordCache from "../../lib/models/DiscordCache";
import Hunts from "../../lib/models/Hunts";
import type {
  EditableHuntType,
  SavedDiscordObjectType,
} from "../../lib/models/Hunts";
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
import ModalForm, { ModalFormHandle } from "./ModalForm";
import purgeHunt from "../../methods/purgeHunt";

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
  id: string;
  value: SavedDiscordObjectType | undefined;
  onChange: (next: SavedDiscordObjectType | undefined) => void;
}

interface DiscordSelectorProps extends DiscordSelectorParams {
  loading: boolean;
  options: SavedDiscordObjectType[];
}

const DiscordSelector = ({
  disable,
  id: formId,
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
        id={formId}
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
        // We want only text channels, since those are the only ones we can bridge chat messages to.
        "object.type": "text",
      },
      {
        // We want to sort them in the same order they're provided in the Discord UI.
        sort: { "object.rawPosition": 1 },
        fields: { "object.id": 1, "object.name": 1 },
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
        fields: { "object.id": 1, "object.name": 1 },
      },
    ).map((c) => c.object as SavedDiscordObjectType);

    return {
      options: discordRoles,
    };
  }, [guildId]);
  return <DiscordSelector loading={loading} options={options} {...rest} />;
};

const HuntPurgePage = () => {
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

  const navigate = useNavigate();

  const footer = useRef<HTMLDivElement>(null);

  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [name, setName] = useState<string>(hunt?.name ?? "");
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
  const [submitTemplate, setSubmitTemplate] = useState<string>(
    hunt?.submitTemplate ?? "",
  );
  const [puzzleCreationDiscordChannel, setPuzzleCreationDiscordChannel] =
    useState<SavedDiscordObjectType | undefined>(
      hunt?.puzzleCreationDiscordChannel,
    );
  const [puzzleHooksDiscordChannel, setPuzzleHooksDiscordChannel] = useState<
    SavedDiscordObjectType | undefined
  >(hunt?.puzzleHooksDiscordChannel);
  const [firehoseDiscordChannel, setFirehoseDiscordChannel] = useState<
    SavedDiscordObjectType | undefined
  >(hunt?.firehoseDiscordChannel);
  const [memberDiscordRole, setMemberDiscordRole] = useState<
    SavedDiscordObjectType | undefined
  >(hunt?.memberDiscordRole);

  const purgeHuntRef = useRef<ModalFormHandle>(null);

  const onNameChanged = useCallback<NonNullable<FormControlProps["onChange"]>>(
    (e) => {
      setName(e.currentTarget.value);
    },
    [],
  );

  const showPurgeHuntModal = useCallback(() => {
    if (purgeHuntRef.current) {
      purgeHuntRef.current.show();
    }
  }, []);

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
        puzzleHooksDiscordChannel,
        firehoseDiscordChannel,
        memberDiscordRole,
        isArchived,
        defaultRoles,
        moreInfo: moreInfo === "" ? undefined : moreInfo,
      };

      if (huntId) {
        updateHunt.call({ huntId, value: state }, onFormCallback);
      } else {
        createHunt.call(state, onFormCallback);
      }
    },
    [
      huntId,
      name,
      mailingLists,
      signupMessage,
      openSignups,
      hasGuessQueue,
      isArchived,
      termsOfUse,
      homepageUrl,
      submitTemplate,
      puzzleCreationDiscordChannel,
      puzzleHooksDiscordChannel,
      firehoseDiscordChannel,
      memberDiscordRole,
      onFormCallback,
      defaultRoles,
      moreInfo,
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
      <ModalBody>
        <Markdown text={termsOfUse} />
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={toggleShowTermsOfUsePreview}>
          Close
        </Button>
      </ModalFooter>
    </Modal>,
    document.body,
  );

  const doPurgeHuntContent = useCallback(
    (callback: () => void) => {
      purgeHunt.call({ huntId }, callback);
    },
    [huntId],
  );

  return (
    <Container>
      <ModalForm
        ref={purgeHuntRef}
        title="Purge Hunt content?"
        submitLabel="Purge"
        submitStyle="danger"
        onSubmit={doPurgeHuntContent}
      >
        <p>Are you sure you want to purge all content from this Hunt?</p>
        <p>
          This will permanently delete all content associated with this Hunt,
          but keep the Hunt itself.
        </p>
      </ModalForm>

      <h1>Reset hunt</h1>

      <p>Warning: this will delete all content!</p>

      <Form onSubmit={onFormSubmit}>
        <div ref={footer}>
          <ActionButtonRow>
            <FormGroup className="mb-3">
              {huntId && (
                <Button variant="danger" onClick={showPurgeHuntModal}>
                  Reset Hunt
                </Button>
              )}
            </FormGroup>
          </ActionButtonRow>
        </div>
      </Form>
    </Container>
  );
};

export default HuntPurgePage;
