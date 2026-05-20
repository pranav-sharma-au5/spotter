import { useNavigate, useParams } from 'react-router-dom';
import { PageShell, PageScrollContent } from '../components/layout';
import { VerifyLoadingSection } from '../components/verify-route/VerifyLoadingSection';
import { VerifyErrorSection } from '../components/verify-route/VerifyErrorSection';
import { VerifyContentSection } from '../components/verify-route/VerifyContentSection';
import { useVerificationRoute } from '../hooks/useVerificationRoute';

export function VerifyRoute() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { detail, loading, error } = useVerificationRoute(slug);

  if (!slug) return null;

  return (
    <PageShell backTo="/" backLabel="Dashboard" variant="minHeight">
      <PageScrollContent maxWidth="3xl">
        {loading && <VerifyLoadingSection />}
        {error && <VerifyErrorSection message={error} />}
        {detail && !loading && (
          <VerifyContentSection
            detail={detail}
            onViewSummary={() => navigate('/summary')}
            onViewDetail={() => navigate('/detail')}
          />
        )}
      </PageScrollContent>
    </PageShell>
  );
}
