interface VerifyErrorSectionProps {
  message: string;
}

export function VerifyErrorSection({ message }: VerifyErrorSectionProps) {
  return <p className="text-sm text-amber-400">{message}</p>;
}
