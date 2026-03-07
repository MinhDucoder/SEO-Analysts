'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';

interface AuditProgress {
  status: string;
  progress: number;
  message?: string;
}

interface SeoIssue {
  ruleId: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  recommendation: string;
  fix?: string;
  priority?: number;
  affectedElements?: string[];
}

interface CategoryScoreItem {
  category: string;
  score: number;
  weight: number;
  issueCount: number;
}

const STAGE_LABELS: Record<string, string> = {
  pending: 'Queued',
  crawling: 'Crawling',
  analyzing: 'Analyzing',
  scoring: 'Scoring',
  generating_report: 'Generating Report',
  completed: 'Complete',
  failed: 'Failed',
};

function ScoreGauge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'var(--score-good)'
      : score >= 50
        ? 'var(--score-warning)'
        : 'var(--score-bad)';

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <span
        className="absolute text-3xl font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
    info: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[severity] || colors.info}`}>
      {severity.toUpperCase()}
    </span>
  );
}

export default function AuditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [progress, setProgress] = useState<AuditProgress>({
    status: 'pending',
    progress: 0,
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'priority'>('priority');

  // Socket.IO for real-time progress
  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    socket.emit('join-audit', { jobId: id });

    socket.on('audit-progress', (data: AuditProgress & { jobId: string }) => {
      if (data.jobId === id) {
        setProgress(data);
        if (data.status === 'completed') {
          setIsCompleted(true);
        }
      }
    });

    return () => {
      socket.off('audit-progress');
      socket.disconnect();
    };
  }, [id]);

  // Fetch report once completed
  const { data: report } = useQuery({
    queryKey: ['report', id],
    queryFn: () => api.getReport(id),
    enabled: isCompleted,
  });

  // Also poll for status in case socket misses events
  const { data: auditJob } = useQuery({
    queryKey: ['audit', id],
    queryFn: () => api.getAudit(id),
    refetchInterval: isCompleted ? false : 3000,
  });

  useEffect(() => {
    if (auditJob?.status === 'completed') {
      setIsCompleted(true);
      setProgress({ status: 'completed', progress: 100 });
    }
    if (auditJob?.status === 'failed') {
      setProgress({
        status: 'failed',
        progress: 0,
        message: auditJob.errorMessage,
      });
    }
  }, [auditJob]);

  // Progress view
  if (!isCompleted) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h2 className="mb-6 text-2xl font-bold">
            {progress.status === 'failed' ? 'Audit Failed' : 'Analyzing...'}
          </h2>

          {progress.status === 'failed' ? (
            <div>
              <p className="mb-4 text-[var(--destructive)]">
                {progress.message || 'An error occurred during the audit.'}
              </p>
              <button
                onClick={() => router.push('/')}
                className="rounded-lg bg-[var(--primary)] px-6 py-2 text-white hover:opacity-90"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div className="mb-4 h-3 overflow-hidden rounded-full bg-[var(--secondary)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>

              {/* Stage indicators */}
              <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                {['crawling', 'analyzing', 'scoring', 'generating_report'].map(
                  (stage) => (
                    <span
                      key={stage}
                      className={
                        progress.status === stage
                          ? 'font-semibold text-[var(--primary)]'
                          : ''
                      }
                    >
                      {STAGE_LABELS[stage]}
                    </span>
                  ),
                )}
              </div>

              {progress.message && (
                <p className="mt-4 text-sm text-[var(--muted-foreground)]">
                  {progress.message}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Results view
  if (!report) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] items-center justify-center">
        <p>Loading results...</p>
      </div>
    );
  }

  const filteredIssues = report.issues
    .filter((issue: SeoIssue) =>
      severityFilter === 'all' ? true : issue.severity === severityFilter,
    )
    .sort((a: SeoIssue, b: SeoIssue) =>
      sortBy === 'priority'
        ? (b.priority || 0) - (a.priority || 0)
        : 0,
    );

  const categoryLabels: Record<string, string> = {
    technical: 'Technical SEO',
    on_page: 'On-Page SEO',
    performance: 'Performance',
    content: 'Content',
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">SEO Audit Results</h1>
        <p className="mt-1 text-[var(--muted-foreground)]">{report.url}</p>
      </div>

      {/* Score section */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Overall score */}
        <div className="flex flex-col items-center rounded-lg border border-[var(--border)] p-6">
          <h2 className="mb-4 text-lg font-semibold">Overall Score</h2>
          <ScoreGauge score={report.overallScore} />
        </div>

        {/* Category scores */}
        <div className="rounded-lg border border-[var(--border)] p-6">
          <h2 className="mb-4 text-lg font-semibold">Category Breakdown</h2>
          <div className="space-y-3">
            {report.categoryScores.map((cat: CategoryScoreItem) => (
              <div key={cat.category}>
                <div className="flex justify-between text-sm">
                  <span>
                    {categoryLabels[cat.category] || cat.category} ({Math.round(cat.weight * 100)}%)
                  </span>
                  <span className="font-medium">{cat.score}/100</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--secondary)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${cat.score}%`,
                      backgroundColor:
                        cat.score >= 80
                          ? 'var(--score-good)'
                          : cat.score >= 50
                            ? 'var(--score-warning)'
                            : 'var(--score-bad)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">
          Issues ({filteredIssues.length})
        </h2>
        <div className="flex gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'severity' | 'priority')}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
          >
            <option value="priority">Sort by Priority</option>
            <option value="severity">Sort by Severity</option>
          </select>
          <a
            href={api.getReportPdfUrl(id)}
            className="rounded-md bg-[var(--primary)] px-4 py-1.5 text-sm text-white hover:opacity-90"
            download
          >
            Download PDF
          </a>
        </div>
      </div>

      {/* Issues list */}
      <div className="space-y-3">
        {filteredIssues.map((issue: SeoIssue, i: number) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--border)] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={issue.severity} />
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {categoryLabels[issue.category] || issue.category}
                  </span>
                </div>
                <h3 className="mt-1 font-medium">{issue.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {issue.description}
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
              <strong>Fix:</strong> {issue.fix || issue.recommendation}
            </div>
          </div>
        ))}

        {filteredIssues.length === 0 && (
          <p className="py-8 text-center text-[var(--muted-foreground)]">
            No issues found{severityFilter !== 'all' ? ' for this severity level' : ''}.
          </p>
        )}
      </div>
    </div>
  );
}
