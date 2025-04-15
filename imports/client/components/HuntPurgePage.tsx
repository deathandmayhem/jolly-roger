import { useTracker } from "meteor/react-meteor-data";
import React, { useCallback, useRef, useState } from "react";
import { Alert, Modal, ModalBody, ModalFooter } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import type { FormProps } from "react-bootstrap/Form";
import Form from "react-bootstrap/Form";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import type { ActionMeta } from "react-select";
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
import purgeHunt from "../../methods/purgeHunt";
import updateHunt from "../../methods/updateHunt";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import ActionButtonRow from "./ActionButtonRow";
import Markdown from "./Markdown";
import type { ModalFormHandle } from "./ModalForm";
import ModalForm from "./ModalForm";

enum SubmitState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  SUCCESS = "success",
  FAILED = "failed",
}

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

const HuntPurgePage = () => {
  const huntId = useParams<{ huntId: string }>().huntId;

  useBreadcrumb({
    title: "Purge Hunt",
    path: `/hunts/${huntId ? `${huntId}/purge` : "new"}`,
  });

  const purgeHuntRef = useRef<ModalFormHandle>(null);

  const showPurgeHuntModal = useCallback(() => {
    if (purgeHuntRef.current) {
      purgeHuntRef.current.show();
    }
  }, []);

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
          This will permanently delete all objects (puzzles, tags, messages,
          etc.) associated with this Hunt, but keep the Hunt itselt, as well as
          any users.
        </p>
        <Alert variant="danger">This action cannot be undone.</Alert>
      </ModalForm>

      <h1>Reset hunt</h1>

      <p>Warning: this will delete all content!</p>

      <Form>
        <ActionButtonRow>
          <FormGroup className="mb-3">
            <Button variant="danger" onClick={showPurgeHuntModal}>
              Reset Hunt
            </Button>
          </FormGroup>
        </ActionButtonRow>
      </Form>
    </Container>
  );
};

export default HuntPurgePage;
