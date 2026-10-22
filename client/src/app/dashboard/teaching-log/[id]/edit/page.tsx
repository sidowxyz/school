import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import TeachingLogForm from '@/components/teaching-log/TeachingLogForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { teachingLogService } from '@/services/teachingLog.service';
import { TeachingLog, TeachingLogStatus } from '@/types/teachingLog.types';
import { Button } from '@/components/ui/button';


export default function TeachingLogEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [log, setLog] = useState<TeachingLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadLog() {
      if (!id) return;
      try {
        const data = await teachingLogService.getLogById(id);
        setLog(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to retrieve teaching log details');
      } finally {
        setLoading(false);
      }
    }
    loadLog();
  }, [id]);

  const handleSubmit = async (
    formData: any,
    status: TeachingLogStatus
  ) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await teachingLogService.updateLog(id, { ...formData, status });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !log) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-center max-w-xl mx-auto my-12">
        <h3 className="font-bold text-base mb-2">Error Loading Details</h3>
        <p className="text-sm mb-4">{error || 'Teaching log entry not found'}</p>
        <Button variant="plain"
          onClick={() => navigate('/teaching-log')}
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg text-xs"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Edit Teaching Log"
        subtitle="Modify lesson outcomes, academic progress, and student participation details"
      />

      {/* validated Form with populated data */}
      <TeachingLogForm
        initialData={log}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </div>
  );
}
