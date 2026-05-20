import { useCallback, useState } from 'react';

export function useClipboardCopy(getText: () => Promise<string>) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  const copy = useCallback(async () => {
    try {
      const text = await getText();
      await navigator.clipboard.writeText(text);
      setStatus('ok');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  }, [getText]);

  return { status, copy };
}
