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
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Save these credentials now — the password won't be shown again.
        </p>
      </div>

      <div className="bg-muted/50 border border-border rounded-xl p-5 space-y-3 font-mono text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Email</span>
          <span className="text-foreground">{email}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Password</span>
          <span className="text-foreground">{password}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="plain"
          type="button"
          onClick={copy}
          className="h-12 px-6 rounded-xl border border-border hover:bg-muted/50 transition font-medium flex items-center gap-2"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="plain"
          type="button"
          onClick={onDone}
          className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition"
        >
          Done
        </Button>
      </div>
    </div>
  );
}