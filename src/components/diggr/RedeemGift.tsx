import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { redeemGiftCode } from "@/lib/account/gifts.functions";

export function RedeemGift() {
  const redeem = useServerFn(redeemGiftCode);
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMsg(null);
    const r = await redeem({ data: { code } });
    setBusy(false);
    if ("error" in r) return setMsg({ ok: false, text: r.error });
    setCode("");
    setMsg({ ok: true, text: "Gift applied. Enjoy!" });
    await qc.invalidateQueries({ queryKey: ["account"] });
  }

  return (
    <div className="gap-space-sm flex flex-col">
      <label htmlFor="gift-code" className="font-label-stamp text-label-stamp text-on-surface-variant uppercase">
        Have a gift code?
      </label>
      <div className="gap-space-sm flex flex-wrap">
        <input
          id="gift-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXXX-XXXXX"
          className="font-code-terminal text-code-terminal text-paper-distressed! p-space-sm border-2 border-outline-variant bg-grit-black! flex-1 outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
        />
        <button
          onClick={submit}
          disabled={busy || code.trim().length < 4}
          className="font-label-stamp text-label-stamp bg-primary-container text-on-primary-container px-space-md py-space-xs uppercase"
        >
          {busy ? "Redeeming…" : "Redeem"}
        </button>
      </div>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`font-code-terminal text-body-sm ${msg.ok ? "text-cyber-cyan" : "text-hazard-orange"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
