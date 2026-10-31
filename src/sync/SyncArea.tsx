import { useState, type FormEvent, type ReactNode } from "react";
import { cloudTarget } from "../serviceConfig";
import {
  AccountExistsError,
  CloudRefusedError,
  CloudUnreachableError,
  KeyBundleConflictError,
  SignInRequiredError,
  type StoredKeyBundle,
} from "./cloudClient";
import { MIN_PASSPHRASE_LENGTH, UnlockFailedError } from "./crypto";
import { useSyncState } from "./engine";
import {
  createAccount,
  findKeyBundle,
  finishFirstDevice,
  joinWithPassphrase,
  passphraseProblem,
  prepareFirstDevice,
  recoverWithCode,
  signIn,
  signInAgain,
  signInOnThisDevice,
  type NewBundle,
  type SignedInAccount,
} from "./setup";

export function SyncArea() {
  const { status } = useSyncState();

  if (!cloudTarget.available) {
    return (
      <div className="area-content">
        <p className="muted">
          {cloudTarget.reason === "insecure"
            ? "Sync is switched off because this version of the app is set up with a cloud address that is not secure. Your learning data stays on this device."
            : "Sync is not available in this version of the app. Your learning data stays on this device."}
        </p>
      </div>
    );
  }
  if (status === "checking") return null;
  if (status === "not-set-up") return <SetupFlow />;
  return <SyncedDevice />;
}

const signInExplanation =
  "Sign-in only identifies you to the sync service. It is separate from your passphrase, and resetting it cannot restore your encrypted learning data.";

const recoveryLimit =
  "If you forget your passphrase and also lose your recovery code and every device, your synced learning data cannot be recovered by anyone, including us.";

const passphraseRule = `Use at least ${MIN_PASSPHRASE_LENGTH} characters, and not just one short pattern repeated, such as "aaaa..." or "abcabc...".`;

function describeError(error: unknown) {
  if (error instanceof CloudUnreachableError) {
    return "The cloud cannot be reached right now. Check your connection and try again. You can keep studying in the meantime.";
  }
  if (error instanceof CloudRefusedError) {
    return "The cloud refused this request, so nothing changed. Try again. If it keeps happening, the sync service may need attention.";
  }
  if (error instanceof SignInRequiredError) return "That email and password were not recognised.";
  if (error instanceof AccountExistsError) return "That email already has an account. Sign in instead.";
  if (error instanceof KeyBundleConflictError) {
    return "Your encryption was set up from another device just now. Start again to unlock it with that passphrase.";
  }
  console.error("Sync setup failed", error);
  return "Something went wrong. Try again.";
}

/** Runs one step of a form, showing its failure and keeping the button from a double press. */
function useStep() {
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function run(step: () => Promise<void>) {
    setError(null);
    setIsBusy(true);
    try {
      await step();
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setIsBusy(false);
    }
  }

  return { error, setError, isBusy, run };
}

function StepForm({
  title,
  onSubmit,
  error,
  children,
}: {
  title: string;
  onSubmit: () => void;
  error: string | null;
  children: ReactNode;
}) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="area-content stack-form" onSubmit={submit}>
      <h3>{title}</h3>
      {children}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  );
}

function SecretField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <label>
      {props.label}
      <input
        type="password"
        required
        autoComplete={props.autoComplete}
        autoCapitalize="off"
        spellCheck={false}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

type Step =
  | { name: "sign-in" }
  | { name: "new-passphrase"; account: SignedInAccount }
  | { name: "save-code"; account: SignedInAccount; prepared: NewBundle }
  | { name: "unlock"; account: SignedInAccount; stored: StoredKeyBundle }
  | { name: "recover"; account: SignedInAccount; stored: StoredKeyBundle };

function SetupFlow() {
  const [step, setStep] = useState<Step>({ name: "sign-in" });

  switch (step.name) {
    case "sign-in":
      return (
        <SignInStep
          onSignedIn={async (account) => {
            const stored = await findKeyBundle(account);
            setStep(
              stored
                ? { name: "unlock", account, stored }
                : { name: "new-passphrase", account },
            );
          }}
        />
      );
    case "new-passphrase":
      return (
        <NewPassphraseStep
          account={step.account}
          onPrepared={(prepared) => setStep({ ...step, name: "save-code", prepared })}
        />
      );
    case "save-code":
      return <SaveCodeStep account={step.account} prepared={step.prepared} />;
    case "unlock":
      return (
        <UnlockStep
          account={step.account}
          stored={step.stored}
          onForgot={() => setStep({ ...step, name: "recover" })}
        />
      );
    case "recover":
      return (
        <RecoverStep
          account={step.account}
          stored={step.stored}
          onBack={() => setStep({ ...step, name: "unlock" })}
        />
      );
  }
}

function SignInStep({ onSignedIn }: { onSignedIn: (account: SignedInAccount) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { error, isBusy, run } = useStep();

  return (
    <StepForm
      title="Sync across your devices"
      error={error}
      onSubmit={() => void run(async () => onSignedIn(await signIn(email, password)))}
    >
      <p className="muted">
        Sync is optional. Everything keeps working on this device without it, online or offline.
      </p>
      <p className="muted">{signInExplanation}</p>
      <label>
        Email
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <SecretField
        label="Sign-in password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={isBusy}>
          Sign in
        </button>
        <button
          type="button"
          className="action-button"
          disabled={isBusy || !email || !password}
          onClick={() => void run(async () => onSignedIn(await createAccount(email, password)))}
        >
          Create account
        </button>
      </div>
    </StepForm>
  );
}

function NewPassphraseStep({
  account,
  onPrepared,
}: {
  account: SignedInAccount;
  onPrepared: (prepared: NewBundle) => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [repeated, setRepeated] = useState("");
  const { error, setError, isBusy, run } = useStep();

  function submit() {
    const problem = passphraseProblem(passphrase, repeated, account);
    if (problem) setError(problem);
    else void run(async () => onPrepared(await prepareFirstDevice(passphrase)));
  }

  return (
    <StepForm title="Set your passphrase" error={error} onSubmit={submit}>
      <p className="muted">
        Your passphrase encrypts your learning data on this device before it goes to the cloud, and
        unlocks it on your other devices. Nobody else ever receives it.
      </p>
      <p className="muted">{passphraseRule}</p>
      <p className="muted">
        Choose a passphrase you use nowhere else, not even for your sign-in. The app cannot check
        that it is unique, so that part is up to you.
      </p>
      <SecretField
        label="Passphrase"
        value={passphrase}
        onChange={setPassphrase}
        autoComplete="new-password"
      />
      <SecretField
        label="Repeat passphrase"
        value={repeated}
        onChange={setRepeated}
        autoComplete="new-password"
      />
      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={isBusy}>
          Set passphrase
        </button>
      </div>
    </StepForm>
  );
}

function SaveCodeStep({ account, prepared }: { account: SignedInAccount; prepared: NewBundle }) {
  const [hasSaved, setHasSaved] = useState(false);
  const { error, isBusy, run } = useStep();

  return (
    <StepForm
      title="Save your recovery code"
      error={error}
      onSubmit={() => void run(() => finishFirstDevice(account, prepared))}
    >
      <p className="muted">
        This code is the only way to set a new passphrase if you forget this one. Save it now
        somewhere you control, such as a password manager or a printed copy kept safe. Keep it apart
        from your passphrase. It will not be shown again.
      </p>
      <output aria-label="Your recovery code" className="recovery-code">
        {prepared.recoveryCode}
      </output>
      <p className="muted">{recoveryLimit}</p>
      <p className="muted">Resetting your sign-in cannot restore encrypted learning data.</p>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={hasSaved}
          onChange={(event) => setHasSaved(event.target.checked)}
        />
        I have saved my recovery code
      </label>
      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={!hasSaved || isBusy}>
          Finish setup
        </button>
      </div>
    </StepForm>
  );
}

function UnlockStep({
  account,
  stored,
  onForgot,
}: {
  account: SignedInAccount;
  stored: StoredKeyBundle;
  onForgot: () => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const { error, setError, isBusy, run } = useStep();

  function submit() {
    void run(async () => {
      try {
        await joinWithPassphrase(account, stored, passphrase);
      } catch (failure) {
        if (!(failure instanceof UnlockFailedError)) throw failure;
        setError("That passphrase did not unlock your data. Check it and try again.");
      }
    });
  }

  return (
    <StepForm title="Unlock your learning data" error={error} onSubmit={submit}>
      <p className="muted">
        Enter your passphrase to add this device. You will not need to approve it from another
        device, and you will not be asked again here.
      </p>
      <SecretField
        label="Passphrase"
        value={passphrase}
        onChange={setPassphrase}
        autoComplete="current-password"
      />
      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={isBusy}>
          Unlock
        </button>
      </div>
      <button type="button" className="link-button" onClick={onForgot}>
        I forgot my passphrase
      </button>
    </StepForm>
  );
}

function RecoverStep({
  account,
  stored,
  onBack,
  onRecovered,
}: {
  account: SignedInAccount;
  stored: StoredKeyBundle;
  onBack: () => void;
  /** Setup leaves this step by itself once the device is enrolled. */
  onRecovered?: () => void;
}) {
  const [code, setCode] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [repeated, setRepeated] = useState("");
  const { error, setError, isBusy, run } = useStep();

  function submit() {
    const problem = passphraseProblem(passphrase, repeated, account);
    if (problem) {
      setError(problem);
      return;
    }
    void run(async () => {
      try {
        await recoverWithCode(account, stored, code, passphrase);
        onRecovered?.();
      } catch (failure) {
        if (!(failure instanceof UnlockFailedError)) throw failure;
        setError("That recovery code did not unlock your data. Check it and try again.");
      }
    });
  }

  return (
    <StepForm title="Use your recovery code" error={error} onSubmit={submit}>
      <p className="muted">
        Enter the recovery code you saved and choose a new passphrase. Your old passphrase stops
        working. Your recovery code stays the same, and devices you have already unlocked keep
        working.
      </p>
      <p className="muted">{recoveryLimit}</p>
      <p className="muted">{passphraseRule}</p>
      <label>
        Recovery code
        <input
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      <SecretField
        label="New passphrase"
        value={passphrase}
        onChange={setPassphrase}
        autoComplete="new-password"
      />
      <SecretField
        label="Repeat new passphrase"
        value={repeated}
        onChange={setRepeated}
        autoComplete="new-password"
      />
      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={isBusy}>
          Set new passphrase
        </button>
        <button type="button" className="action-button" onClick={onBack}>
          Back
        </button>
      </div>
    </StepForm>
  );
}

function SyncedDevice() {
  const { status, unreadableRecords } = useSyncState();
  const [isRecovering, setIsRecovering] = useState(false);
  const [hasRecovered, setHasRecovered] = useState(false);

  if (isRecovering) {
    return (
      <RecoverThisDevice
        onBack={() => setIsRecovering(false)}
        onRecovered={() => {
          setIsRecovering(false);
          setHasRecovered(true);
        }}
      />
    );
  }

  return (
    <div className="area-content">
      {status === "sign-in-required" ? (
        <SignInAgain />
      ) : (
        <p>This device is set up. Your changes sync automatically whenever it is connected.</p>
      )}
      {hasRecovered && (
        <p role="status" aria-label="Recovery">
          Your new passphrase is set. Your old one no longer works.
        </p>
      )}
      {status === "refused" && (
        <p role="alert" className="form-error">
          The cloud refused the last sync. This is not a connection problem. Your changes are safe on
          this device, and the app keeps trying. If it keeps happening, the sync service may need
          attention.
        </p>
      )}
      {unreadableRecords > 0 && (
        <p role="alert" className="form-error">
          {unreadableRecords === 1
            ? "1 synced record failed its integrity check and was ignored."
            : `${unreadableRecords} synced records failed their integrity check and were ignored.`}{" "}
          The copy in the cloud may have been altered. Your data on this device is unchanged.
        </p>
      )}
      <h3>If you lose access</h3>
      <p className="muted">
        A new device needs your passphrase. If you forget it, use your recovery code.
      </p>
      <button type="button" className="link-button" onClick={() => setIsRecovering(true)}>
        I forgot my passphrase
      </button>
      <p className="muted">{recoveryLimit}</p>
      <p className="muted">{signInExplanation}</p>
    </div>
  );
}

/**
 * The sign-in password comes first: a new passphrase must differ from it, and the
 * device does not keep it. Its learning data stays as it is throughout.
 */
function RecoverThisDevice({
  onBack,
  onRecovered,
}: {
  onBack: () => void;
  onRecovered: () => void;
}) {
  const [found, setFound] = useState<{ account: SignedInAccount; stored: StoredKeyBundle } | null>(null);
  const [password, setPassword] = useState("");
  const { error, setError, isBusy, run } = useStep();

  function submit() {
    void run(async () => {
      const account = await signInOnThisDevice(password);
      const stored = await findKeyBundle(account);
      if (stored) setFound({ account, stored });
      else setError("The cloud holds no key bundle for this account, so a code cannot open it.");
    });
  }

  if (found) return <RecoverStep {...found} onBack={onBack} onRecovered={onRecovered} />;

  return (
    <StepForm title="Use your recovery code" error={error} onSubmit={submit}>
      <p className="muted">
        A new passphrase replaces the old one on all your devices. Nothing on this device is lost.
        Sign in first to continue.
      </p>
      <SecretField
        label="Sign-in password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={isBusy}>
          Continue
        </button>
        <button type="button" className="action-button" onClick={onBack}>
          Back
        </button>
      </div>
    </StepForm>
  );
}

function SignInAgain() {
  const [password, setPassword] = useState("");
  const { error, isBusy, run } = useStep();

  return (
    <StepForm
      title="Sign in again"
      error={error}
      onSubmit={() => void run(() => signInAgain(password))}
    >
      <p className="muted">
        Your sign-in has expired, so changes are waiting on this device. Your passphrase is not
        needed, and you can keep studying.
      </p>
      <SecretField
        label="Sign-in password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={isBusy}>
          Sign in
        </button>
      </div>
    </StepForm>
  );
}
