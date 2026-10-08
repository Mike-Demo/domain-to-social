import { WaCopyButton } from "@/design-system/font-awsome-web-awesome-171158/webawesome/react/copy-button";

const btn = "font-label-stamp text-label-stamp px-space-md py-space-sm uppercase";

/** One-time display of freshly issued backup codes. */
export function BackupCodes({ codes, onDone }: { codes: string[]; onDone?: () => void }) {
  const all = codes.join("\n");
  return (
    <div className="gap-space-sm flex flex-col">
      <p className="font-code-terminal text-body-sm text-on-surface-variant">
        Each code works once if you lose your phone. Store them in your password manager or print them. You won't see them again.
      </p>
      <ul aria-label="Backup codes" className="gap-space-xs p-space-sm grid grid-cols-2 border-2 border-outline-variant bg-grit-black">
        {codes.map((c) => (
          <li key={c} className="font-code-terminal text-code-terminal text-paper-distressed select-all">{c}</li>
        ))}
      </ul>
      <span className="gap-space-xs font-code-terminal text-body-sm text-cyber-cyan flex items-center">
        <WaCopyButton value={all} copy-label="Copy all backup codes" success-label="Copied" /> Copy all codes
      </span>
      {onDone && (
        <button type="button" onClick={onDone} className={`${btn} bg-primary-container text-on-primary-container shadow-stamp`}>
          I've saved them — continue
        </button>
      )}
    </div>
  );
}
