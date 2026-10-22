import { useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import TeachingLogForm from '@/components/teaching-log/TeachingLogForm';
import { teachingLogService } from '@/services/teachingLog.service';
import { TeachingLogStatus } from '@/types/teachingLog.types';


export default function TeachingLogCreatePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    formData: any,
    status: TeachingLogStatus
  ) => {
    setIsSubmitting(true);
    try {
      // createdBy is derived server-side from the authenticated teacher, not sent by the client.
      await teachingLogService.createLog({ ...formData, status });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Create Teaching Log"
        subtitle="Log lesson outcomes, academic progress, and student participation details"
      />

      {/* Renders validated Form */}
      <TeachingLogForm onSubmit={handleSubmit} isLoading={isSubmitting} />
    </div>
  );
}
