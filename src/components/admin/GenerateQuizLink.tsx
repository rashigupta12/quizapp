// components/admin/GenerateQuizLink.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link, Copy, Check, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GenerateQuizLinkProps {
  quizId: number;
  quizTitle: string;
}

export default function GenerateQuizLink({ quizId, quizTitle }: GenerateQuizLinkProps) {
  const [open, setOpen] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateLink = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/admin/quizzes/${quizId}/generate-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to generate link');
      }

      const data = await response.json();
      setGeneratedUrl(data.link.url);
    } catch (err) {
      console.error('Generate link error:', err);
      setError('Failed to generate quiz link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleOpenLink = () => {
    window.open(generatedUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
          <Link size={16} />
          Generate Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-indigo-600">Generate Quiz Link</DialogTitle>
          <DialogDescription>
            Create a unique link for <strong>{quizTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        {!generatedUrl ? (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                This will create a unique link that students can use to:
              </p>
              <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
                <li>Register and access only this quiz</li>
                <li>Take the quiz exactly once</li>
                <li>Be tracked separately from regular dashboard users</li>
              </ul>
            </div>

            <Button
              onClick={handleGenerateLink}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                'Generate Link'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium mb-2">
                ✓ Link generated successfully!
              </p>
              <p className="text-xs text-green-700">
                Share this link with students who should take this quiz.
              </p>
            </div>

            <div>
              <Label htmlFor="link" className="text-sm font-medium text-gray-700 mb-2 block">
                Quiz Link
              </Label>
              <div className="flex gap-2">
                <Input
                  id="link"
                  value={generatedUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check size={16} className="text-green-600" />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenLink}
                  className="flex-shrink-0"
                >
                  <ExternalLink size={16} />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedUrl('');
                  setCopied(false);
                }}
                className="flex-1"
              >
                Generate Another
              </Button>
              <Button
                onClick={() => setOpen(false)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}