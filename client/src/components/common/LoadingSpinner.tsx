import { SpinnerGap } from '@phosphor-icons/react';

export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-12">
      <SpinnerGap size={32} className="animate-spin text-primary" />
    </div>
  );
}
