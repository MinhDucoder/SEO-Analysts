import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IssueCard } from '../src/components/playground/issue-card';
import type { PublicCheckIssue } from '../src/types/api';

const issueWithSuggestion: PublicCheckIssue = {
  ruleId: 'title_tag',
  severity: 'warning',
  category: 'meta',
  audience: ['writer'],
  title: 'Title quá ngắn',
  description: 'Title chỉ 25 ký tự, khuyến nghị 50-60.',
  evidence: { currentLength: 25 },
  suggestion: {
    type: 'rewrite',
    text: 'Cách viết SEO 2026: hướng dẫn cho beginner',
    rationale: 'Thêm năm + đối tượng để tăng tính thời sự',
  },
  docRef: 'https://docs/r/title_tag',
};

const issueNoSuggestion: PublicCheckIssue = { ...issueWithSuggestion, suggestion: null };

describe('IssueCard', () => {
  it('renders rule metadata (severity, category, audience badges)', () => {
    render(<IssueCard issue={issueWithSuggestion} canApply={false} />);
    expect(screen.getByText('Title quá ngắn')).toBeInTheDocument();
    expect(screen.getByText('warning')).toBeInTheDocument();
    expect(screen.getByText('meta')).toBeInTheDocument();
    expect(screen.getByText('writer')).toBeInTheDocument();
  });

  it('renders suggestion text + rationale when suggestion present', () => {
    render(<IssueCard issue={issueWithSuggestion} canApply={false} />);
    expect(screen.getByText(/Cách viết SEO 2026/)).toBeInTheDocument();
    expect(screen.getByText(/tăng tính thời sự/)).toBeInTheDocument();
  });

  it('omits the suggestion block when suggestion is null', () => {
    render(<IssueCard issue={issueNoSuggestion} canApply={false} />);
    expect(screen.queryByText(/rationale/i)).not.toBeInTheDocument();
  });

  it('does not render Apply button when canApply=false', () => {
    render(<IssueCard issue={issueWithSuggestion} canApply={false} />);
    expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument();
  });

  it('renders Apply button when canApply=true and calls onApply with suggestion text', () => {
    const onApply = vi.fn();
    render(<IssueCard issue={issueWithSuggestion} canApply onApply={onApply} />);
    screen.getByRole('button', { name: /apply/i }).click();
    expect(onApply).toHaveBeenCalledWith(issueWithSuggestion);
  });
});
