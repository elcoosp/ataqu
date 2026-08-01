"use client";

import { Trans } from "@lingui/react/macro";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Post } from "@/lib/posts";

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    async function fetchPost() {
      try {
        const res = await fetch(`/api/posts/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setPost(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="container section-padding max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted/30 rounded w-32"></div>
          <div className="h-12 bg-muted/30 rounded w-3/4"></div>
          <div className="h-4 bg-muted/20 rounded w-1/3"></div>
          <div className="h-64 bg-muted/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container section-padding max-w-3xl mx-auto text-center">
        <h1 className="font-display text-2xl font-bold">Post not found</h1>
        <Link href="/blog" className="text-primary hover:underline mt-4 inline-block">
          <Trans>← Back to blog</Trans>
        </Link>
      </div>
    );
  }

  return (
    <div className="container section-padding max-w-3xl mx-auto">
      <Link href="/blog" className="text-primary hover:underline text-sm mb-4 inline-block">
        <Trans>← Back to blog</Trans>
      </Link>
      <h1 className="font-display text-3xl md:text-4xl font-bold">{post.title}</h1>
      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
        <time dateTime={post.date}>{post.date}</time>
        <span>·</span>
        <span>{post.readingTime}</span>
      </div>
      <hr className="my-8 border-border" />
      <article className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
