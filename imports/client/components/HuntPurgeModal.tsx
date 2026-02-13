import { useCallback, useId, useState } from "react";
import Alert from "react-bootstrap/Alert";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import { Trans, useTranslation } from "react-i18next";
import type { HuntType } from "../../lib/models/Hunts";
import purgeHunt from "../../methods/purgeHunt";
import ModalForm, { type ModalFormHandle } from "./ModalForm";

const HuntPurgeModal = ({
  ref,
  hunt,
}: {
  ref: React.RefObject<ModalFormHandle | null>;
  hunt: HuntType;
}) => {
  const [confirmText, setConfirmText] = useState<string>("");
  const idPrefix = useId();
  const { t } = useTranslation();

  const onConfirmTextChanged = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfirmText(e.target.value);
    },
    [],
  );

  const onPurge = useCallback(
    (callback: () => void) => {
      purgeHunt.call({ huntId: hunt._id }, callback);
    },
    [hunt._id],
  );

  return (
    <ModalForm
      ref={ref}
      title={t("huntList.purge.confirm.title", "Purge hunt")}
      submitLabel={t("huntList.purge.confirm.submit", "Purge")}
      submitStyle="danger"
      onSubmit={onPurge}
      closeDisabled={false}
      submitDisabled={confirmText !== hunt.name}
    >
      <div>
        {t(
          "huntList.purge.confirm.text",
          'Are you sure you want to purge all content from "{{huntName}}"? This will additionally delete all puzzles and associated state, including Google documents and files associated with this hunt stored in S3.',
          { huntName: hunt.name },
        )}
        <Alert variant="danger">
          {t("huntList.purge.confirm.warning", "This action cannot be undone.")}
        </Alert>
        <FormGroup controlId={`${idPrefix}-confirm`}>
          <FormLabel>
            <Trans
              i18nKey="huntList.purge.confirm.instructions"
              t={t}
              defaults={"Type <code>{{huntName}}</code> below to confirm"}
              components={{
                code: <code />,
              }}
              values={{ huntName: hunt.name }}
            />
          </FormLabel>
          <FormControl
            type="text"
            value={confirmText}
            onChange={onConfirmTextChanged}
            placeholder={hunt.name}
          />
        </FormGroup>
      </div>
    </ModalForm>
  );
};

export default HuntPurgeModal;
