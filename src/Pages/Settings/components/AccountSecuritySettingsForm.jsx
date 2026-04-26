import { useMemo, useState } from "react";
import { api } from "../../../utils/api.js";

const initialPasswordValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const tabs = [
  { id: "account", label: "Account" },
  { id: "password", label: "Password" },
  { id: "security", label: "Security" },
];

function AccountSecuritySettingsForm({
  initialValues,
  onSaveAccount,
  onSavePassword,
  disabled = false,
}) {
  const [accountValues, setAccountValues] = useState(initialValues);
  const [passwordValues, setPasswordValues] = useState(initialPasswordValues);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState("account");
  const [unlockStatus, setUnlockStatus] = useState("idle");
  const [unlockMessage, setUnlockMessage] = useState("");
  const [accountStatus, setAccountStatus] = useState("idle");
  const [accountMessage, setAccountMessage] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("idle");
  const [passwordMessage, setPasswordMessage] = useState("");

  const accountDirty =
    accountValues.name !== initialValues.name ||
    accountValues.email !== initialValues.email;
  const hasPasswordValues =
    passwordValues.currentPassword ||
    passwordValues.newPassword ||
    passwordValues.confirmPassword;
  const canUnlock = Boolean(unlockPassword.trim());
  const sectionDisabled = disabled || !isUnlocked;
  const unlockFeedback =
    unlockStatus === "saving" ? "Unlocking..." : unlockMessage;
  const accountFeedback =
    accountStatus === "saving" ? "Saving account details..." : accountMessage;
  const passwordFeedback =
    passwordStatus === "saving" ? "Updating password..." : passwordMessage;

  const lockSection = () => {
    setIsUnlocked(false);
    setActiveTab("account");
    setUnlockPassword("");
    setPasswordValues(initialPasswordValues);
    setUnlockStatus("idle");
    setUnlockMessage("");
  };

  const unlockButtonLabel = useMemo(() => {
    if (unlockStatus === "saving") {
      return "Unlocking...";
    }

    return "Unlock";
  }, [unlockStatus]);

  const handleAccountChange = (event) => {
    const { name, value } = event.target;
    setAccountValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
    setAccountStatus("idle");
    setAccountMessage("");
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
    setPasswordStatus("idle");
    setPasswordMessage("");
  };

  const handleUnlock = async (event) => {
    event.preventDefault();
    setUnlockStatus("saving");
    setUnlockMessage("");

    try {
      await api.signin({
        email: initialValues.email,
        password: unlockPassword,
      });
      setIsUnlocked(true);
      setUnlockStatus("success");
      setUnlockMessage("Unlocked. Sensitive controls are now available.");
      setPasswordValues((currentValues) => ({
        ...currentValues,
        currentPassword: unlockPassword,
      }));
    } catch (error) {
      setUnlockStatus("error");
      setUnlockMessage(error.message || "Unable to unlock account settings.");
    }
  };

  const handleSaveAccount = async (event) => {
    event.preventDefault();
    setAccountStatus("saving");
    setAccountMessage("");

    try {
      await onSaveAccount({
        name: accountValues.name,
        email: accountValues.email,
      });
      setAccountStatus("success");
      setAccountMessage("Account details updated.");
      lockSection();
    } catch (error) {
      setAccountStatus("error");
      setAccountMessage(error.message || "Unable to update account details.");
    }
  };

  const handleSavePassword = async (event) => {
    event.preventDefault();
    setPasswordStatus("saving");
    setPasswordMessage("");

    try {
      await onSavePassword(passwordValues);
      setPasswordStatus("success");
      setPasswordMessage("Password changed successfully.");
      lockSection();
    } catch (error) {
      setPasswordStatus("error");
      setPasswordMessage(error.message || "Unable to change your password.");
    }
  };

  return (
    <article className="settings-card settings-card--account-security">
      <div className="settings-card__header settings-card__header--account-security">
        <div>
          <p className="settings-card__eyebrow">Account and security</p>
          <h2>Account and security</h2>
          <p className="settings-card__copy">
            Unlock once, make your change, then the section locks itself again.
          </p>
        </div>
      </div>

      <div className="settings-account-security">
        <div className="settings-lockbar">
          {!isUnlocked ? (
            <form className="settings-lockbar__form" onSubmit={handleUnlock}>
              <input
                className="settings-input settings-input--lock"
                type="password"
                name="unlockPassword"
                value={unlockPassword}
                onChange={(event) => {
                  setUnlockPassword(event.target.value);
                  setUnlockStatus("idle");
                  setUnlockMessage("");
                }}
                autoComplete="current-password"
                disabled={disabled || unlockStatus === "saving"}
                placeholder="Enter your password to unlock account settings"
                required
              />
              <button
                className="settings-button"
                type="submit"
                disabled={disabled || unlockStatus === "saving" || !canUnlock}
              >
                {unlockButtonLabel}
              </button>
            </form>
          ) : (
            <div className="settings-lockbar__status">
              <span className="settings-lockbar__badge">Unlocked</span>
              <p>{unlockMessage}</p>
              <button
                className="settings-button settings-button--ghost"
                type="button"
                onClick={lockSection}
                disabled={disabled}
              >
                Lock
              </button>
            </div>
          )}
          {!isUnlocked && unlockStatus !== "idle" ? (
            <p className={`settings-feedback settings-feedback--${unlockStatus}`}>
              {unlockFeedback}
            </p>
          ) : null}
        </div>

        <div className="settings-tabs" role="tablist" aria-label="Account tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`settings-tab ${isActive ? "settings-tab--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="settings-tab-panel">
          {activeTab === "account" ? (
            <form className="settings-form settings-form--tabbed" onSubmit={handleSaveAccount}>
              <div className="settings-inline-fields settings-inline-fields--account">
                <label className="settings-field">
                  <span>Account name</span>
                  <input
                    className="settings-input"
                    type="text"
                    name="name"
                    value={accountValues.name}
                    onChange={handleAccountChange}
                    placeholder="Your Crossworld account name"
                    disabled={sectionDisabled || accountStatus === "saving"}
                    required
                  />
                </label>

                <label className="settings-field">
                  <span>Email</span>
                  <input
                    className="settings-input"
                    type="email"
                    name="email"
                    value={accountValues.email}
                    onChange={handleAccountChange}
                    placeholder="you@example.com"
                    disabled={sectionDisabled || accountStatus === "saving"}
                    required
                  />
                </label>
              </div>

              <div className="settings-form__footer settings-form__footer--compact-actions">
                <p className={`settings-feedback settings-feedback--${accountStatus}`}>
                  {accountFeedback}
                </p>
                <button
                  className="settings-button"
                  type="submit"
                  disabled={
                    sectionDisabled ||
                    accountStatus === "saving" ||
                    !accountDirty
                  }
                >
                  {accountStatus === "saving" ? "Saving..." : "Save account"}
                </button>
              </div>
            </form>
          ) : null}

          {activeTab === "password" ? (
            <form className="settings-form settings-form--tabbed" onSubmit={handleSavePassword}>
              <label className="settings-field">
                <span>Current password</span>
                <input
                  className="settings-input"
                  type="password"
                  name="currentPassword"
                  value={passwordValues.currentPassword}
                  onChange={handlePasswordChange}
                  autoComplete="current-password"
                  disabled={sectionDisabled || passwordStatus === "saving"}
                  required
                />
              </label>

              <div className="settings-inline-fields settings-inline-fields--security">
                <label className="settings-field">
                  <span>New password</span>
                  <input
                    className="settings-input"
                    type="password"
                    name="newPassword"
                    value={passwordValues.newPassword}
                    onChange={handlePasswordChange}
                    autoComplete="new-password"
                    disabled={sectionDisabled || passwordStatus === "saving"}
                    required
                  />
                </label>

                <label className="settings-field">
                  <span>Confirm password</span>
                  <input
                    className="settings-input"
                    type="password"
                    name="confirmPassword"
                    value={passwordValues.confirmPassword}
                    onChange={handlePasswordChange}
                    autoComplete="new-password"
                    disabled={sectionDisabled || passwordStatus === "saving"}
                    required
                  />
                </label>
              </div>

              <div className="settings-form__footer settings-form__footer--compact-actions">
                <p className={`settings-feedback settings-feedback--${passwordStatus}`}>
                  {passwordFeedback}
                </p>
                <button
                  className="settings-button"
                  type="submit"
                  disabled={
                    sectionDisabled ||
                    passwordStatus === "saving" ||
                    !hasPasswordValues
                  }
                >
                  {passwordStatus === "saving"
                    ? "Saving..."
                    : "Change password"}
                </button>
              </div>
            </form>
          ) : null}

          {activeTab === "security" ? (
            <div className="settings-security-panel">
              <div className="settings-security-row">
                <div>
                  <strong>Two-factor authentication</strong>
                  <p>Not enabled yet for Crossworld accounts.</p>
                </div>
                <span className="settings-pill">Coming later</span>
              </div>

              <div className="settings-security-row">
                <div>
                  <strong>Sessions</strong>
                  <p>Session history and remote sign-out controls will live here.</p>
                </div>
                <span className="settings-pill">Placeholder</span>
              </div>

              <div className="settings-security-row">
                <div>
                  <strong>Future controls</strong>
                  <p>Recovery methods, device trust, and deeper security controls.</p>
                </div>
                <span className="settings-pill">Planned</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default AccountSecuritySettingsForm;
