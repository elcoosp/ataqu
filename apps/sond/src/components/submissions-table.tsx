import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ataqu/ui';
import { Download } from 'lucide-react';
import { Trans, t } from '@lingui/core/macro';
import type { Submission, AnswerInput } from '@ataqu/api-client';

interface Props {
  submissions: Submission[];
  onExport: () => void;
}

function answerToString(a: AnswerInput): string {
  const v = a.value.value;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.join(', ');
  return String(v ?? '');
}

export function SubmissionsTable({ submissions, onExport }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          <Trans>Export CSV</Trans>
        </Button>
      </div>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Trans>Submitted At</Trans></TableHead>
              <TableHead><Trans>Answer 1</Trans></TableHead>
              <TableHead><Trans>Answer 2</Trans></TableHead>
              <TableHead><Trans>Answer 3</Trans></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((s) => {
              const answers = s.answers.slice(0, 3);
              return (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.submitted_at).toLocaleString()}</TableCell>
                  <TableCell>{answers[0] ? answerToString(answers[0]) : '—'}</TableCell>
                  <TableCell>{answers[1] ? answerToString(answers[1]) : '—'}</TableCell>
                  <TableCell>{answers[2] ? answerToString(answers[2]) : '—'}</TableCell>
                </TableRow>
              );
            })}
            {submissions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  <Trans>No submissions</Trans>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
