import { Accounts } from "meteor/accounts-base";
import { Google } from "meteor/google-oauth";
import { Meteor } from "meteor/meteor";
import { OAuth } from "meteor/oauth";
import { useTracker } from "meteor/react-meteor-data";
import { ServiceConfiguration } from "meteor/service-configuration";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faEye } from "@fortawesome/free-solid-svg-icons/faEye";
import { faEyeSlash } from "@fortawesome/free-solid-svg-icons/faEyeSlash";
import { faLock } from "@fortawesome/free-solid-svg-icons/faLock";
import { faMicrophone } from "@fortawesome/free-solid-svg-icons/faMicrophone";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Trans, useTranslation } from "react-i18next";
import Flags from "../../Flags";
import { calendarTimeFormat } from "../../lib/calendarTimeFormat";
import { formatDiscordName } from "../../lib/discord";
import type { APIKeyType } from "../../lib/models/APIKeys";
import { primaryEmail } from "../../lib/models/User";
import addUserAccountEmail from "../../methods/addUserAccountEmail";
import createAPIKey from "../../methods/createAPIKey";
import destroyAPIKey from "../../methods/destroyAPIKey";
import linkUserDiscordAccount from "../../methods/linkUserDiscordAccount";
import linkUserGoogleAccount from "../../methods/linkUserGoogleAccount";
import makeUserEmailPrimary from "../../methods/makeUserEmailPrimary";
import removeUserAccountEmail from "../../methods/removeUserAccountEmail";
import sendUserVerificationEmail from "../../methods/sendUserVerificationEmail";
import unlinkUserDiscordAccount from "../../methods/unlinkUserDiscordAccount";
import unlinkUserGoogleAccount from "../../methods/unlinkUserGoogleAccount";
import updateProfile from "../../methods/updateProfile";
import { requestDiscordCredential } from "../discord";
import getAudioStream, {
  PREFERRED_AUDIO_DEVICE_STORAGE_KEY,
} from "../getAudioStream";
import useTailwindTheme from "../hooks/useTailwindTheme";
import useTeamName from "../hooks/useTeamName";
import Avatar from "./Avatar";

// Collapsible settings section component
const SettingsSection = ({
  title,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) => {
  return (
    <details
      className="collapse collapse-arrow bg-base-100 shadow-sm"
      open={defaultOpen || undefined}
    >
      <summary className="collapse-title font-semibold bg-base-300">
        {title}
        {badge && (
          <span className="badge badge-sm badge-ghost ml-2">{badge}</span>
        )}
      </summary>
      <div className="collapse-content">
        <div className="pt-4 space-y-4">{children}</div>
      </div>
    </details>
  );
};

// Field save status type
type FieldStatus = "idle" | "saving" | "saved" | "error";

// Form field wrapper component with inline status indicator
const FormField = ({
  label,
  hint,
  status,
  error,
  children,
}: {
  label: string;
  hint?: string;
  status?: FieldStatus;
  error?: string;
  children: ReactNode;
}) => {
  const { t } = useTranslation();

  return (
    <fieldset className="fieldset w-full min-w-0">
      <div className="label flex justify-between">
        <span className="font-medium">{label}</span>
        {status === "saving" && (
          <span className="flex items-center gap-1 text-info text-xs">
            <span className="loading loading-spinner loading-xs" />
            {t("common.saving", "Saving")}
          </span>
        )}
        {status === "saved" && (
          <span className="flex items-center gap-1 text-success text-xs">
            <FontAwesomeIcon icon={faCheck} size="xs" />
            {t("common.saved", "Saved")}
          </span>
        )}
        {status === "error" && (
          <span className="text-error text-xs">
            {error ?? t("common.saveFailed", "Save failed")}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="label whitespace-normal">{hint}</p>}
    </fieldset>
  );
};

// Linked account row component
const LinkedAccountRow = ({
  provider,
  linked,
  username,
  linkLabel,
  linkDisabled,
  linkLoading,
  onLink,
  onUnlink,
}: {
  provider: string;
  linked: boolean;
  username?: string;
  linkLabel: string;
  linkDisabled?: boolean;
  linkLoading?: boolean;
  onLink: () => void;
  onUnlink: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between py-3 border-b border-base-200 last:border-b-0">
      <div>
        <div className="font-medium">{provider}</div>
        <div className="text-sm opacity-60">
          {linked
            ? t("profile.linkedAccounts.linkedTo", "Linked to {{username}}", {
                username,
              })
            : t("profile.linkedAccounts.notLinked", "Not linked")}
        </div>
      </div>
      <div className="flex gap-2">
        {linked ? (
          <>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={onLink}
              disabled={linkDisabled ?? linkLoading}
            >
              {t("profile.linkedAccounts.change", "Change")}
            </button>
            <button
              type="button"
              onClick={onUnlink}
              className="btn btn-sm btn-outline btn-error"
            >
              {t("profile.linkedAccounts.unlink", "Unlink")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onLink}
            className="btn btn-sm btn-primary"
            disabled={linkDisabled ?? linkLoading}
          >
            {linkLoading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : null}
            {linkLabel}
          </button>
        )}
      </div>
    </div>
  );
};

enum LinkState {
  IDLE = "idle",
  LINKING = "linking",
  ERROR = "error",
}

type LinkBlockState =
  | { state: LinkState.IDLE | LinkState.LINKING }
  | { state: LinkState.ERROR; error: Error };

// API Key row component
const APIKeyRow = ({ apiKey }: { apiKey: APIKeyType }) => {
  const [requestState, setRequestState] = useState<
    "idle" | "in-flight" | "error"
  >("idle");
  const [requestError, setRequestError] = useState<string | undefined>(
    undefined,
  );
  const [keyShown, setKeyShown] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const { t, i18n } = useTranslation();

  const toggleShown = useCallback(() => {
    setKeyShown((prev) => !prev);
  }, []);

  const copyToClipboard = useCallback(() => {
    void navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [apiKey.key]);

  const destroy = useCallback(() => {
    setRequestState("in-flight");
    destroyAPIKey.call({ apiKeyId: apiKey._id }, (error) => {
      if (error) {
        setRequestState("error");
        setRequestError(error.message);
      } else {
        setRequestState("idle");
        setShowDeleteConfirm(false);
      }
    });
  }, [apiKey._id]);

  const disabled = requestState === "in-flight";

  return (
    <>
      {requestState === "error" && (
        <tr>
          <td colSpan={4}>
            <div className="alert alert-error py-2 text-sm">
              <span>
                {t(
                  "profile.apiKeys.destroyFailed",
                  "Destroying API key failed: {{error}}",
                  { error: requestError },
                )}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setRequestState("idle")}
              >
                ✕
              </button>
            </div>
          </td>
        </tr>
      )}
      <tr>
        <td>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-base-200 px-2 py-1 rounded font-mono inline-block max-w-[34ch] truncate align-middle">
              {keyShown ? apiKey.key : "••••••••••••••••••••••••••••••••"}
            </code>
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square"
              onClick={copyToClipboard}
              title={t("profile.apiKeys.copyToClipboard", "Copy to clipboard")}
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} size="xs" />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square"
              onClick={toggleShown}
              title={
                keyShown ? t("common.hide", "Hide") : t("common.show", "Show")
              }
            >
              <FontAwesomeIcon icon={keyShown ? faEye : faEyeSlash} size="xs" />
            </button>
          </div>
        </td>
        <td className="hidden sm:table-cell text-sm opacity-60">
          {calendarTimeFormat(apiKey.createdAt, t, i18n.language)}
        </td>
        <td className="hidden sm:table-cell text-sm opacity-60">
          {apiKey.lastUsedAt
            ? calendarTimeFormat(apiKey.lastUsedAt, t, i18n.language)
            : t("profile.apiKeys.never", "Never")}
        </td>
        <td>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs">
                {t("profile.apiKeys.confirmDelete", "Delete?")}
              </span>
              <button
                type="button"
                className="btn btn-error btn-xs"
                onClick={destroy}
                disabled={disabled}
              >
                {t("common.yes", "Yes")}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t("common.no", "No")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-xs text-error"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <FontAwesomeIcon icon={faTrash} size="sm" />
            </button>
          )}
        </td>
      </tr>
    </>
  );
};

// Audio level meter component for microphone testing
const AudioLevelMeter = ({
  stream,
  onStop,
}: {
  stream: MediaStream;
  onStop: () => void;
}) => {
  const { t } = useTranslation();
  const [level, setLevel] = useState(0);
  const animationRef = useRef<number | null>(null);
  const displayLevelRef = useRef(0);

  useEffect(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return undefined;

    const audioContext = new AudioContextClass();
    void audioContext.resume(); // Required by some browsers

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0; // No smoothing - we handle decay ourselves

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.fftSize);
    // Meter range: FLOOR_DB to 0 dBFS
    const FLOOR_DB = -40;
    // Constant decay per frame (at ~60fps, 0.5/frame ≈ empties in ~3s)
    const DECAY_PER_FRAME = 0.5;

    const updateLevel = () => {
      analyser.getByteTimeDomainData(dataArray);

      // Find peak amplitude in this frame
      let peak = 0;
      for (const value of dataArray) {
        const amplitude = Math.abs(value - 128) / 128;
        if (amplitude > peak) {
          peak = amplitude;
        }
      }

      // Convert linear peak to dBFS, clamped to floor
      const dbfs = peak > 0 ? 20 * Math.log10(peak) : FLOOR_DB;

      // Map dBFS range to 0-100%
      const currentLevel = Math.max(
        0,
        Math.min(100, ((dbfs - FLOOR_DB) / -FLOOR_DB) * 100),
      );

      // Fast attack, slow decay
      if (currentLevel > displayLevelRef.current) {
        displayLevelRef.current = currentLevel;
      } else {
        displayLevelRef.current = Math.max(
          0,
          displayLevelRef.current - DECAY_PER_FRAME,
        );
      }

      setLevel(displayLevelRef.current);
      animationRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      void audioContext.close();
    };
  }, [stream]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 rounded-full overflow-hidden relative">
        {/* Colored zone background */}
        <div className="absolute inset-0 flex">
          <div className="h-full bg-base-content/10" style={{ width: "50%" }} />
          <div className="h-full bg-success/30" style={{ width: "35%" }} />
          <div className="h-full bg-warning/30" style={{ width: "8%" }} />
          <div className="h-full bg-error/30" style={{ width: "7%" }} />
        </div>
        {/* Level indicator */}
        <div
          className="absolute inset-y-0 left-0 bg-base-content/70 rounded-full"
          style={{ width: `${level}%` }}
        />
      </div>
      <button type="button" className="btn btn-sm btn-ghost" onClick={onStop}>
        {t("profile.audioConfig.testAudio.stop", "Stop")}
      </button>
    </div>
  );
};

// Simplified audio device selector component with inline level meter
const AudioDeviceSelector = () => {
  const { t } = useTranslation();
  const [preferredDeviceId, setPreferredDeviceId] = useState<
    string | undefined
  >(() => {
    return (
      localStorage.getItem(PREFERRED_AUDIO_DEVICE_STORAGE_KEY) ?? undefined
    );
  });
  const [knownDevices, setKnownDevices] = useState<MediaDeviceInfo[]>([]);
  const [testState, setTestState] = useState<
    "idle" | "requesting" | "testing" | "error"
  >("idle");
  const [testError, setTestError] = useState<string | undefined>(undefined);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const updateDeviceList = useCallback(() => {
    void (async () => {
      if (navigator.mediaDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(
          (dev) => dev.kind === "audioinput" && dev.label !== "",
        );
        // Sort "default" to the top if present (Chrome provides this
        // pseudo-device but doesn't guarantee its position in the list).
        inputs.sort((a, b) => {
          if (a.deviceId === "default") return -1;
          if (b.deviceId === "default") return 1;
          return 0;
        });
        setKnownDevices(inputs);
      }
    })();
  }, []);

  // Fetch available audio devices and listen for changes
  useEffect(() => {
    updateDeviceList();

    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener("devicechange", updateDeviceList);
      return () => {
        navigator.mediaDevices.removeEventListener(
          "devicechange",
          updateDeviceList,
        );
      };
    }
    return undefined;
  }, [updateDeviceList]);

  const handleDeviceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newDeviceId = e.target.value;
      if (newDeviceId === "") {
        // Clear the stored preference so we fall back to the system default.
        localStorage.removeItem(PREFERRED_AUDIO_DEVICE_STORAGE_KEY);
        setPreferredDeviceId(undefined);
      } else {
        localStorage.setItem(PREFERRED_AUDIO_DEVICE_STORAGE_KEY, newDeviceId);
        setPreferredDeviceId(newDeviceId);
      }
    },
    [],
  );

  const startTest = useCallback(async () => {
    if (!navigator.mediaDevices) {
      setTestState("error");
      setTestError(
        t(
          "profile.audioConfig.noMediaDevices",
          "Media devices not available (requires HTTPS)",
        ),
      );
      return;
    }

    setTestState("requesting");
    setTestError(undefined);

    try {
      const freshPreferredDeviceId =
        localStorage.getItem(PREFERRED_AUDIO_DEVICE_STORAGE_KEY) ?? undefined;
      const mediaStream = await getAudioStream(freshPreferredDeviceId);
      setStream(mediaStream);
      setTestState("testing");
      // Re-fetch device list now that we have permission (labels may be available)
      updateDeviceList();
    } catch (e) {
      setTestState("error");
      setTestError(
        t(
          "profile.audioConfig.micError",
          "Could not access microphone: {{message}}",
          {
            message: (e as Error).message,
          },
        ),
      );
    }
  }, [t, updateDeviceList]);

  const stopTest = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setTestState("idle");
  }, [stream]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Compute the dropdown value:
  // - Use preferredDeviceId if set
  // - Otherwise, default to "default" on Chrome (if available)
  // - Otherwise, empty string (system default)
  const selectValue =
    preferredDeviceId ??
    (knownDevices.some((dev) => dev.deviceId === "default") ? "default" : "");

  return (
    <div className="space-y-4">
      <FormField
        label={t("profile.audioConfig.selectedInput", "Audio input device")}
        hint={t(
          "profile.audioConfig.deviceHint",
          "Select the microphone to use for voice calls.",
        )}
      >
        <select
          className="select w-full"
          value={selectValue}
          onChange={handleDeviceChange}
        >
          {/* Show "System default" option if Chrome's "default" pseudo-device isn't present */}
          {!knownDevices.some((dev) => dev.deviceId === "default") && (
            <option value="">
              {t("profile.audioConfig.systemDefault", "System default")}
            </option>
          )}
          {knownDevices.map((dev) => (
            <option value={dev.deviceId} key={dev.deviceId}>
              {dev.label}
            </option>
          ))}
          {/* Show placeholder if stored preference doesn't match any enumerated device */}
          {preferredDeviceId !== undefined &&
            !knownDevices.some((dev) => dev.deviceId === preferredDeviceId) && (
              <option value={preferredDeviceId}>
                {t(
                  "profile.audioConfig.previouslySelectedDevice",
                  "Previously selected device (fallback to system default)",
                )}
              </option>
            )}
        </select>
      </FormField>

      {testState === "error" && testError && (
        <div className="alert alert-error py-2 text-sm">
          <span>{testError}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setTestState("idle")}
          >
            ✕
          </button>
        </div>
      )}

      {testState === "testing" && stream ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-error" />
            </span>
            {t("profile.audioConfig.listening", "Listening...")}
          </div>
          <AudioLevelMeter stream={stream} onStop={stopTest} />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm">
            {t("profile.audioConfig.testPrompt", "Test your microphone")}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline gap-2"
            onClick={() => void startTest()}
            disabled={testState === "requesting"}
          >
            {testState === "requesting" ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <FontAwesomeIcon icon={faMicrophone} size="sm" />
            )}
            {t("profile.audioConfig.testButton", "Test")}
          </button>
        </div>
      )}
    </div>
  );
};

const ProfileSections = ({ initialUser }: { initialUser: Meteor.User }) => {
  const { t } = useTranslation();

  // Track current field values in state
  const [displayName, setDisplayName] = useState(initialUser.displayName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initialUser.phoneNumber ?? "");
  const [dingwordsFlat, setDingwordsFlat] = useState(
    initialUser.dingwords ? initialUser.dingwords.join(", ") : "",
  );

  // Track save status per field
  const [displayNameStatus, setDisplayNameStatus] =
    useState<FieldStatus>("idle");
  const [displayNameError, setDisplayNameError] = useState<string | undefined>(
    undefined,
  );
  const [phoneNumberStatus, setPhoneNumberStatus] =
    useState<FieldStatus>("idle");
  const [phoneNumberError, setPhoneNumberError] = useState<string | undefined>(
    undefined,
  );
  const [dingwordsStatus, setDingwordsStatus] = useState<FieldStatus>("idle");
  const [dingwordsError, setDingwordsError] = useState<string | undefined>(
    undefined,
  );

  // Track last saved values to detect changes
  const lastSavedDisplayName = useRef(initialUser.displayName ?? "");
  const lastSavedPhoneNumber = useRef(initialUser.phoneNumber ?? "");
  const lastSavedDingwords = useRef(
    initialUser.dingwords ? initialUser.dingwords.join(", ") : "",
  );

  // Helper to parse dingwords string
  const parseDingwords = useCallback((value: string) => {
    return value
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter((x) => x.length > 0);
  }, []);

  // Save all profile fields
  const saveAllFields = useCallback(
    (
      newDisplayName: string,
      newPhoneNumber: string,
      newDingwords: string,
    ): Promise<void> => {
      return new Promise((resolve, reject) => {
        updateProfile.call(
          {
            displayName: newDisplayName.trim(),
            phoneNumber:
              newPhoneNumber.trim() !== "" ? newPhoneNumber.trim() : undefined,
            dingwords: parseDingwords(newDingwords),
          },
          (error) => {
            if (error) reject(error);
            else resolve();
          },
        );
      });
    },
    [parseDingwords],
  );

  // Clear status after timeout
  const clearStatusAfterTimeout = useCallback(
    (setStatus: (s: FieldStatus) => void) => {
      setTimeout(() => setStatus("idle"), 2000);
    },
    [],
  );

  // Handle display name blur
  const handleDisplayNameBlur = useCallback(async () => {
    if (displayName === lastSavedDisplayName.current) return;

    const trimmed = displayName.trim();
    if (trimmed === "") {
      setDisplayNameStatus("error");
      setDisplayNameError(
        t("profile.displayName.required", "Display name must not be empty"),
      );
      return;
    }

    setDisplayNameStatus("saving");
    setDisplayNameError(undefined);
    try {
      await saveAllFields(displayName, phoneNumber, dingwordsFlat);
      lastSavedDisplayName.current = displayName;
      lastSavedPhoneNumber.current = phoneNumber;
      lastSavedDingwords.current = dingwordsFlat;
      setDisplayNameStatus("saved");
      clearStatusAfterTimeout(setDisplayNameStatus);
    } catch (e) {
      setDisplayNameStatus("error");
      setDisplayNameError(
        e instanceof Error ? e.message : t("common.saveFailed", "Save failed"),
      );
    }
  }, [
    displayName,
    phoneNumber,
    dingwordsFlat,
    saveAllFields,
    clearStatusAfterTimeout,
    t,
  ]);

  // Handle phone number blur
  const handlePhoneNumberBlur = useCallback(async () => {
    if (phoneNumber === lastSavedPhoneNumber.current) return;

    setPhoneNumberStatus("saving");
    setPhoneNumberError(undefined);
    try {
      await saveAllFields(displayName, phoneNumber, dingwordsFlat);
      lastSavedDisplayName.current = displayName;
      lastSavedPhoneNumber.current = phoneNumber;
      lastSavedDingwords.current = dingwordsFlat;
      setPhoneNumberStatus("saved");
      clearStatusAfterTimeout(setPhoneNumberStatus);
    } catch (e) {
      setPhoneNumberStatus("error");
      setPhoneNumberError(
        e instanceof Error ? e.message : t("common.saveFailed", "Save failed"),
      );
    }
  }, [
    displayName,
    phoneNumber,
    dingwordsFlat,
    saveAllFields,
    clearStatusAfterTimeout,
    t,
  ]);

  // Handle dingwords blur
  const handleDingwordsBlur = useCallback(async () => {
    if (dingwordsFlat === lastSavedDingwords.current) return;

    setDingwordsStatus("saving");
    setDingwordsError(undefined);
    try {
      await saveAllFields(displayName, phoneNumber, dingwordsFlat);
      lastSavedDisplayName.current = displayName;
      lastSavedPhoneNumber.current = phoneNumber;
      lastSavedDingwords.current = dingwordsFlat;
      setDingwordsStatus("saved");
      clearStatusAfterTimeout(setDingwordsStatus);
    } catch (e) {
      setDingwordsStatus("error");
      setDingwordsError(
        e instanceof Error ? e.message : t("common.saveFailed", "Save failed"),
      );
    }
  }, [
    displayName,
    phoneNumber,
    dingwordsFlat,
    saveAllFields,
    clearStatusAfterTimeout,
    t,
  ]);

  return (
    <>
      <SettingsSection title={t("profile.profile", "Profile")}>
        <FormField
          label={t("profile.displayName.label", "Display name")}
          hint={t(
            "profile.displayName.help",
            "We suggest your full name, to avoid ambiguity.",
          )}
          status={displayNameStatus}
          error={displayNameError}
        >
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={() => void handleDisplayNameBlur()}
            className="input w-full"
          />
        </FormField>

        <FormField
          label={t("profile.phoneNumber.label", "Phone number (optional)")}
          hint={t(
            "profile.phoneNumber.help",
            "In case we need to reach you via phone.",
          )}
          status={phoneNumberStatus}
          error={phoneNumberError}
        >
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onBlur={() => void handlePhoneNumberBlur()}
            className="input w-full"
            placeholder="+1 555-555-5555"
          />
        </FormField>
      </SettingsSection>

      <SettingsSection
        title={t("profile.notifications", "Notifications")}
        defaultOpen={false}
      >
        <FormField
          label={t("profile.dingwords.label", "Dingwords")}
          hint={t(
            "profile.dingwords.help",
            "Get notified when someone mentions one of these words in chat. Comma-separated, case-insensitive.",
          )}
          status={dingwordsStatus}
          error={dingwordsError}
        >
          <input
            type="text"
            value={dingwordsFlat}
            onChange={(e) => setDingwordsFlat(e.target.value)}
            onBlur={() => void handleDingwordsBlur()}
            className="input w-full"
            placeholder="e.g. cryptic, crossword, logic"
          />
        </FormField>
      </SettingsSection>
    </>
  );
};

const LinkedAccountsSection = ({
  initialUser,
  teamName,
}: {
  initialUser: Meteor.User;
  teamName: string;
}) => {
  const { t } = useTranslation();

  // Google account linking state
  const [googleLinkState, setGoogleLinkState] = useState<LinkBlockState>({
    state: LinkState.IDLE,
  });
  const googleConfig = useTracker(
    () => ServiceConfiguration.configurations.findOne({ service: "google" }),
    [],
  );
  const googleDisabled = useTracker(() => Flags.active("disable.google"), []);

  // Discord account linking state
  const [discordLinkState, setDiscordLinkState] = useState<LinkBlockState>({
    state: LinkState.IDLE,
  });
  const discordConfig = useTracker(
    () => ServiceConfiguration.configurations.findOne({ service: "discord" }),
    [],
  );
  const discordDisabled = useTracker(() => Flags.active("disable.discord"), []);

  // Google account handlers
  const onGoogleRequestComplete = useCallback((token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    if (!secret) {
      setGoogleLinkState({ state: LinkState.IDLE });
      return;
    }
    linkUserGoogleAccount.call({ key: token, secret }, (error) => {
      if (error) {
        setGoogleLinkState({ state: LinkState.ERROR, error });
      } else {
        setGoogleLinkState({ state: LinkState.IDLE });
      }
    });
  }, []);

  const onGoogleLink = useCallback(() => {
    setGoogleLinkState({ state: LinkState.LINKING });
    Google.requestCredential(onGoogleRequestComplete);
  }, [onGoogleRequestComplete]);

  const onGoogleUnlink = useCallback(() => {
    unlinkUserGoogleAccount.call();
  }, []);

  // Discord account handlers
  const onDiscordRequestComplete = useCallback((token: string) => {
    const secret = OAuth._retrieveCredentialSecret(token);
    if (!secret) {
      setDiscordLinkState({ state: LinkState.IDLE });
      return;
    }
    linkUserDiscordAccount.call({ key: token, secret }, (error) => {
      if (error) {
        setDiscordLinkState({ state: LinkState.ERROR, error });
      } else {
        setDiscordLinkState({ state: LinkState.IDLE });
      }
    });
  }, []);

  const onDiscordLink = useCallback(() => {
    setDiscordLinkState({ state: LinkState.LINKING });
    requestDiscordCredential(onDiscordRequestComplete);
  }, [onDiscordRequestComplete]);

  const onDiscordUnlink = useCallback(() => {
    unlinkUserDiscordAccount.call();
  }, []);

  return (
    <SettingsSection
      title={t("profile.linkedAccounts.title", "Linked accounts")}
      defaultOpen={
        (!!googleConfig && !initialUser.googleAccount) ||
        (!!discordConfig && !initialUser.discordAccount)
      }
    >
      <p className="text-sm opacity-60 mb-4">
        {t(
          "profile.linkedAccounts.help",
          "Link your accounts to enable additional features like identity on shared documents and Discord integration.",
        )}
      </p>

      {/* Google link error */}
      {googleLinkState.state === LinkState.ERROR && (
        <div className="alert alert-error py-2 mb-4 text-sm">
          <span>
            {t("profile.google.linkFailed", "Linking Google account failed")}:{" "}
            {googleLinkState.error.message}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setGoogleLinkState({ state: LinkState.IDLE })}
          >
            ✕
          </button>
        </div>
      )}

      {/* Discord link error */}
      {discordLinkState.state === LinkState.ERROR && (
        <div className="alert alert-error py-2 mb-4 text-sm">
          <span>
            {t("profile.discord.linkFailed", "Linking Discord account failed")}:{" "}
            {discordLinkState.error.message}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setDiscordLinkState({ state: LinkState.IDLE })}
          >
            ✕
          </button>
        </div>
      )}

      <div>
        {googleConfig && (
          <LinkedAccountRow
            provider="Google"
            linked={!!initialUser.googleAccount}
            username={initialUser.googleAccount}
            linkLabel={t("profile.google.link", "Link account")}
            linkDisabled={googleDisabled}
            linkLoading={googleLinkState.state === LinkState.LINKING}
            onLink={onGoogleLink}
            onUnlink={onGoogleUnlink}
          />
        )}
        {discordConfig && (
          <LinkedAccountRow
            provider="Discord"
            linked={!!initialUser.discordAccount}
            username={
              initialUser.discordAccount
                ? formatDiscordName(initialUser.discordAccount)
                : undefined
            }
            linkLabel={t("profile.discord.link", "Link account")}
            linkDisabled={discordDisabled}
            linkLoading={discordLinkState.state === LinkState.LINKING}
            onLink={onDiscordLink}
            onUnlink={onDiscordUnlink}
          />
        )}
      </div>

      {/* Account linking help text */}
      <div className="text-xs opacity-50 mt-4 space-y-2">
        {googleConfig && (
          <p>
            <Trans
              i18nKey="profile.google.help"
              t={t}
              defaults={`Linking your Google account lets other people see who you are
                on puzzles' Google Spreadsheet docs (instead of being an
                <anonymousLink>anonymous animal</anonymousLink>).`}
              components={{
                anonymousLink: (
                  // oxlint-disable-next-line jsx-a11y/anchor-has-content -- Trans component fills children
                  <a
                    href="https://support.google.com/docs/answer/2494888"
                    rel="noopener noreferrer"
                    target="_blank"
                    className="link"
                  />
                ),
              }}
            />
          </p>
        )}
        {discordConfig && (
          <p>
            {t(
              "profile.discord.help",
              `Linking your Discord account will add you to the {{teamName}}
              Discord server. Additionally, we'll be able to link up your identity
              there and in Jolly Roger chat.`,
              { teamName },
            )}
          </p>
        )}
      </div>
    </SettingsSection>
  );
};

const AccountSection = ({ user }: { user: Meteor.User }) => {
  const { t } = useTranslation();

  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [emailToRemove, setEmailToRemove] = useState<string | null>(null);

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [confirmPasswordValue, setConfirmPasswordValue] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<FieldStatus>("idle");
  const [passwordError, setPasswordError] = useState<string | undefined>(
    undefined,
  );

  // Email handlers
  const handleAddEmail = useCallback(() => {
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(undefined);
    addUserAccountEmail.call({ email: trimmed }, (err) => {
      setBusy(false);
      if (err) {
        if (err instanceof Meteor.Error && err.error === 409) {
          setError(
            t(
              "profile.emails.conflict",
              "That email address belongs to another account. If you'd like to merge the accounts, contact an admin.",
            ),
          );
        } else {
          setError(err.reason ?? err.message);
        }
      } else {
        setNewEmail("");
      }
    });
  }, [newEmail, t]);

  const handleRemoveEmail = useCallback((email: string) => {
    setError(undefined);
    removeUserAccountEmail.call({ email }, (err) => {
      if (err) {
        setError(err.reason ?? err.message);
      }
    });
    setEmailToRemove(null);
  }, []);

  const handleMakePrimary = useCallback((email: string) => {
    setError(undefined);
    makeUserEmailPrimary.call({ email }, (err) => {
      if (err) {
        setError(err.reason ?? err.message);
      }
    });
  }, []);

  const handleResendVerification = useCallback((email: string) => {
    setError(undefined);
    sendUserVerificationEmail.call({ email }, (err) => {
      if (err) {
        setError(err.reason ?? err.message);
      }
    });
  }, []);

  // Password handler
  const handlePasswordChange = useCallback(() => {
    if (!newPasswordValue || newPasswordValue !== confirmPasswordValue) return;

    setPasswordStatus("saving");
    setPasswordError(undefined);
    void Accounts.changePassword(currentPassword, newPasswordValue, (err) => {
      if (err) {
        setPasswordStatus("error");
        setPasswordError(err.message);
      } else {
        setPasswordStatus("saved");
        setShowPasswordForm(false);
        setCurrentPassword("");
        setNewPasswordValue("");
        setConfirmPasswordValue("");
        setTimeout(() => setPasswordStatus("idle"), 2000);
      }
    });
  }, [currentPassword, newPasswordValue, confirmPasswordValue]);

  const dismissPasswordForm = useCallback(() => {
    setShowPasswordForm(false);
    setCurrentPassword("");
    setNewPasswordValue("");
    setConfirmPasswordValue("");
    setPasswordStatus("idle");
    setPasswordError(undefined);
  }, []);

  const emails = user.emails ?? [];
  const primary = emails[0];
  const secondaryEmails = emails.slice(1);

  return (
    <SettingsSection title={t("profile.account.title", "Account")}>
      {error && (
        <div className="alert alert-error py-2 text-sm">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setError(undefined)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Primary email */}
      {primary && (
        <fieldset className="fieldset">
          <div className="label">
            <span className="font-medium">
              {t("profile.account.primaryEmail", "Primary email")}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-base-200 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{primary.address}</div>
              <div className="text-xs opacity-60">
                {t(
                  "profile.account.primaryEmailHint",
                  "Used for login and visible to other hunters",
                )}
              </div>
            </div>
            {primary.verified ? (
              <span className="badge badge-success badge-sm gap-1 self-start sm:self-auto">
                <FontAwesomeIcon icon={faCheck} size="xs" />
                {t("profile.emails.verified", "Verified")}
              </span>
            ) : (
              <span className="badge badge-warning badge-sm self-start sm:self-auto">
                {t("profile.emails.unverified", "Unverified")}
              </span>
            )}
          </div>
        </fieldset>
      )}

      {/* Secondary emails */}
      {secondaryEmails.length > 0 && (
        <fieldset className="fieldset">
          <div className="label">
            <span className="font-medium">
              {t("profile.account.otherEmails", "Other email addresses")}
            </span>
          </div>
          <div className="space-y-2">
            {secondaryEmails.map((entry) => (
              <div
                key={entry.address}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 border border-base-300 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-medium truncate">{entry.address}</span>
                  {entry.verified ? (
                    <span className="badge badge-success badge-sm gap-1">
                      <FontAwesomeIcon icon={faCheck} size="xs" />
                      {t("profile.emails.verified", "Verified")}
                    </span>
                  ) : (
                    <span className="badge badge-warning badge-sm">
                      {t("profile.emails.unverified", "Unverified")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {entry.verified && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleMakePrimary(entry.address)}
                    >
                      {t("profile.emails.makePrimary", "Make primary")}
                    </button>
                  )}
                  {!entry.verified && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleResendVerification(entry.address)}
                    >
                      {t(
                        "profile.emails.resendVerification",
                        "Resend verification",
                      )}
                    </button>
                  )}

                  {emailToRemove === entry.address ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-error btn-xs"
                        onClick={() => handleRemoveEmail(entry.address)}
                      >
                        {t("profile.account.confirmRemove", "Confirm")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setEmailToRemove(null)}
                      >
                        {t("common.cancel", "Cancel")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => setEmailToRemove(entry.address)}
                    >
                      {t("profile.emails.remove", "Remove")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      )}

      {/* Add email */}
      <fieldset className="fieldset">
        <div className="label">
          <span className="font-medium">
            {t("profile.account.addEmail", "Add email address")}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            className="input w-full"
            placeholder={t(
              "profile.emails.addPlaceholder",
              "another@example.com",
            )}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
            disabled={busy}
          />
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleAddEmail}
            disabled={busy || !newEmail.trim()}
          >
            {t("profile.emails.add", "Add")}
          </button>
        </div>
        <p className="label whitespace-normal">
          {t(
            "profile.account.addEmailHint",
            "We'll send a verification email to confirm you own this address",
          )}
        </p>
      </fieldset>

      <div className="divider my-6" />

      {/* Password */}
      <fieldset className="fieldset">
        <div className="label flex justify-between">
          <span className="font-medium">
            {t("profile.account.password", "Password")}
          </span>
          {passwordStatus === "saved" && (
            <span className="flex items-center gap-1 text-success text-xs">
              <FontAwesomeIcon icon={faCheck} size="xs" />
              {t("profile.account.passwordUpdated", "Password updated")}
            </span>
          )}
        </div>

        {showPasswordForm ? (
          <div className="space-y-3 p-4 border border-base-300 rounded-lg">
            {passwordStatus === "error" && passwordError && (
              <div className="alert alert-error py-2 text-sm">
                <span>{passwordError}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setPasswordStatus("idle")}
                >
                  ✕
                </button>
              </div>
            )}
            <fieldset className="fieldset">
              <div className="label py-1">
                <span className="text-sm">
                  {t("profile.account.currentPassword", "Current password")}
                </span>
              </div>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input input-sm w-full"
              />
            </fieldset>
            <fieldset className="fieldset">
              <div className="label py-1">
                <span className="text-sm">
                  {t("profile.account.newPassword", "New password")}
                </span>
              </div>
              <input
                type="password"
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                className="input input-sm w-full"
              />
            </fieldset>
            <fieldset className="fieldset">
              <div className="label py-1">
                <span className="text-sm">
                  {t("profile.account.confirmPassword", "Confirm new password")}
                </span>
              </div>
              <input
                type="password"
                value={confirmPasswordValue}
                onChange={(e) => setConfirmPasswordValue(e.target.value)}
                className="input input-sm w-full"
              />
              {confirmPasswordValue &&
                newPasswordValue !== confirmPasswordValue && (
                  <p className="text-error text-xs mt-1">
                    {t(
                      "profile.account.passwordMismatch",
                      "Passwords don't match",
                    )}
                  </p>
                )}
            </fieldset>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handlePasswordChange}
                disabled={
                  !currentPassword ||
                  !newPasswordValue ||
                  newPasswordValue !== confirmPasswordValue ||
                  passwordStatus === "saving"
                }
              >
                {passwordStatus === "saving" ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : null}
                {t("profile.account.changePassword", "Change password")}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={dismissPasswordForm}
              >
                {t("common.cancel", "Cancel")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 border border-base-300 rounded-lg">
            <FontAwesomeIcon icon={faLock} className="opacity-40" />
            <div className="flex-1">
              <div className="font-mono text-sm">
                &#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowPasswordForm(true)}
            >
              {t("profile.account.changePassword", "Change password")}
            </button>
          </div>
        )}
      </fieldset>
    </SettingsSection>
  );
};

const APIKeysSection = ({ apiKeys }: { apiKeys?: APIKeyType[] }) => {
  const { t } = useTranslation();

  const [createKeyState, setCreateKeyState] = useState<
    "idle" | "requesting" | "error"
  >("idle");
  const [createKeyError, setCreateKeyError] = useState<string | undefined>(
    undefined,
  );

  const createApiKey = useCallback(() => {
    setCreateKeyState("requesting");
    createAPIKey.call({}, (error) => {
      if (error) {
        setCreateKeyState("error");
        setCreateKeyError(error.message);
      } else {
        setCreateKeyState("idle");
      }
    });
  }, []);

  return (
    <SettingsSection
      title={t("profile.advanced", "Advanced")}
      defaultOpen={false}
      badge={
        apiKeys?.length
          ? t("profile.apiKeys.count", "{{count}} key", {
              count: apiKeys.length,
            })
          : undefined
      }
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">
              {t("profile.apiKeys.label", "API Keys")}
            </h3>
            <p className="text-sm opacity-60">
              {t(
                "profile.apiKeys.help",
                "Authorization credentials for API access. Keep them secret!",
              )}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-primary gap-1"
            onClick={createApiKey}
            disabled={createKeyState === "requesting"}
          >
            {createKeyState === "requesting" ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <FontAwesomeIcon icon={faPlus} size="sm" />
            )}
            {t("profile.apiKeys.create", "Create key")}
          </button>
        </div>

        {createKeyState === "error" && (
          <div className="alert alert-error py-2 mb-4 text-sm">
            <span>
              {t("profile.apiKeys.createFailed", "Creating API key failed")}:{" "}
              {createKeyError}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setCreateKeyState("idle")}
            >
              ✕
            </button>
          </div>
        )}

        {apiKeys && apiKeys.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table table-sm table-fixed">
              <thead>
                <tr>
                  <th>{t("profile.apiKeys.key", "Key")}</th>
                  <th className="hidden sm:table-cell w-40">
                    {t("profile.apiKeys.created", "Created")}
                  </th>
                  <th className="hidden sm:table-cell w-32">
                    {t("profile.apiKeys.lastUsed", "Last used")}
                  </th>
                  <th className="w-40" />
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((apiKey) => (
                  <APIKeyRow key={apiKey._id} apiKey={apiKey} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm opacity-60 italic">
            {t("profile.apiKeys.none", "No API keys")}
          </p>
        )}
      </div>
    </SettingsSection>
  );
};

const OwnProfilePageSkeleton = ({ theme }: { theme: string }) => {
  return (
    <div className="tailwind-page" data-theme={theme}>
      <main className="font-body min-h-screen bg-base-200 p-4 pb-16">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header card skeleton */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="flex items-start gap-4">
                <div className="skeleton w-20 h-20 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="skeleton h-7 w-48" />
                  <div className="skeleton h-4 w-64" />
                </div>
              </div>
            </div>
          </div>

          {/* Section skeletons */}
          {[true, true, false, false, false].map((open, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              key={i}
              className={`collapse bg-base-100 shadow-sm${open ? " collapse-open" : ""}`}
            >
              <div className="collapse-title bg-base-300">
                <div className="skeleton h-5 w-36" />
              </div>
              {open && (
                <div className="collapse-content">
                  <div className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <div className="skeleton h-4 w-24" />
                      <div className="skeleton h-10 w-full" />
                      <div className="skeleton h-3 w-72" />
                    </div>
                    <div className="space-y-2">
                      <div className="skeleton h-4 w-32" />
                      <div className="skeleton h-10 w-full" />
                      <div className="skeleton h-3 w-56" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

const OwnProfilePage = ({
  initialUser,
  apiKeys,
}: {
  initialUser?: Meteor.User;
  apiKeys?: APIKeyType[];
}) => {
  const theme = useTailwindTheme();
  const { t } = useTranslation();
  const { teamName } = useTeamName();

  if (!initialUser) {
    return <OwnProfilePageSkeleton theme={theme} />;
  }

  return (
    <div className="tailwind-page" data-theme={theme}>
      <main className="font-body min-h-screen bg-base-200 p-4 pb-16">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header card */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <Avatar
                    size={80}
                    _id={initialUser._id}
                    displayName={initialUser.displayName}
                    discordAccount={initialUser.discordAccount}
                    className="rounded-full"
                  />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold font-display">
                    {initialUser.displayName}
                  </h1>
                  <p className="text-sm opacity-60">
                    {primaryEmail(initialUser)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <AccountSection user={initialUser} />

          <ProfileSections initialUser={initialUser} />
          <LinkedAccountsSection
            initialUser={initialUser}
            teamName={teamName}
          />

          {/* Audio section */}
          <SettingsSection
            title={t("profile.audioConfig.audio", "Audio")}
            defaultOpen={false}
          >
            <AudioDeviceSelector />
          </SettingsSection>

          <APIKeysSection apiKeys={apiKeys} />
        </div>
      </main>
    </div>
  );
};

export default OwnProfilePage;
