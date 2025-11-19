// components/admin/ViewQuizLinks.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, ExternalLink, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface QuizLink {
  id: number;
  token: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
}

interface ViewQuizLinksProps {
  quizId: number;
}

export default function ViewQuizLinks({ quizId }: ViewQuizLinksProps) {
  const [links, setLinks] = useState<QuizLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    loadLinks();
  }, [quizId]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/quizzes/${quizId}/generate-link`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch links');
      }

      const data = await response.json();
      setLinks(data.links);
    } catch (error) {
      console.error('Load links error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (url: string, linkId: number) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(linkId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No links generated yet</p>
        <p className="text-sm mt-1">Click "Generate Link" to create your first quiz link</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-indigo-600">Link URL</TableHead>
            <TableHead className="text-indigo-600">Usage</TableHead>
            <TableHead className="text-indigo-600">Created</TableHead>
            <TableHead className="text-indigo-600">Status</TableHead>
            <TableHead className="text-right text-indigo-600">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((link) => (
            <TableRow key={link.id}>
              <TableCell className="font-mono text-sm max-w-xs truncate">
                {link.url}
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {link.usedCount} {link.maxUses ? `/ ${link.maxUses}` : ''}
                </span>
              </TableCell>
              <TableCell className="text-sm">
                {formatDate(link.createdAt)}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    link.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {link.isActive ? 'Active' : 'Inactive'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(link.url, link.id)}
                    className="text-indigo-600 hover:bg-indigo-50"
                  >
                    {copiedId === link.id ? (
                      <Check size={16} className="text-green-600" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(link.url, '_blank')}
                    className="text-indigo-600 hover:bg-indigo-50"
                  >
                    <ExternalLink size={16} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}