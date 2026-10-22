import { Check, Copy } from '@phosphor-icons/react';
import { useState } from "react";
import { Button } from '@/components/ui/button';

interface Props {
  title?: string;
  email: string;
  password: string;
  onDone: () => void;
}

export default function CredentialsReveal({ title = "Account created", email, password, onDone }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="text-slate-500 mt-1 text-sm">
          FloppyDisk these credentials now â€” the password won't be shown again.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 font-mono text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Email</span>
          <span className="text-slate-900">{email}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Password</span>
          <span className="text-slate-900">{password}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="plain"
          type="button"
          onClick={copy}
          className="h-12 px-6 rounded-xl border border-slate-300 hover:bg-slate-50 transition font-medium flex items-center gap-2"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="plain"
          type="button"
          onClick={onDone}
          className="h-12 px-8 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition"
        >
          Done
        </Button>
      </div>
    </div>
  );
}