"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Post } from "@/lib/posts";

// Custom components for markdown rendering with proper types
const MarkdownComponents = {
  h1: ({ children, ...props }: any) => (
    <h1 className="font-display text-3xl md:text-4xl font-bold mt-8 mb-4 text-foreground" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="font-display text-2xl font-bold mt-8 mb-3 text-foreground" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="font-display text-xl font-semibold mt-6 mb-2 text-foreground" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }: any) => (
    <p className="text-muted-foreground leading-relaxed my-4" {...props}>
      {children}
    </p>
  ),
  a: ({ href, children, ...props }: any) => (
    <a href={href} className="text-primary hover:underline" {...props}>
      {children}
    </a>
  ),
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc list-inside space-y-1 text-muted-foreground my-4" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal list-inside space-y-1 text-muted-foreground my-4" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="text-muted-foreground" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 text-muted-foreground italic" {...props}>
      {children}
    </blockquote>
  ),
  code: ({ children, className, ...props }: any) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-card/50 px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>
          {children}
        </code>
      );
    }
    return (
      <pre className="bg-card/50 p-4 rounded-lg overflow-x-auto text-sm font-mono text-foreground my-4" {...props}>
        <code className={className}>{children}</code>
      </pre>
    );
  },
  hr: (props: any) => <hr className="my-8 border-border" {...props} />,
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto my-4" {...props}>
      <table className="w-full border-collapse border border-border text-sm">{children}</table>
    </div>
  ),
  th: ({ children, ...props }: any) => (
    <th className="border border-border px-4 py-2 text-left font-display text-muted-foreground bg-card/20" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: any) => (
    <td className="border border-border px-4 py-2 text-muted-foreground" {...props}>
      {children}
    </td>
  ),
};

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
          ← Back to blog
        </Link>
      </div>
    );
  }

  return (
    <div className="container section-padding max-w-3xl mx-auto">
      <Link href="/blog" className="text-primary hover:underline text-sm mb-4 inline-block">
        ← Back to blog
      </Link>
      <h1 className="font-display text-3xl md:text-4xl font-bold">{post.title}</h1>
      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
        <time dateTime={post.date}>{post.date}</time>
        <span>·</span>
        <span>{post.readingTime}</span>
      </div>
      <hr className="my-8 border-border" />
      <article className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents as any}>
          {post.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
