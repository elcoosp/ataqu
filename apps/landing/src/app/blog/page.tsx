"use client";

import { Trans } from "@lingui/react/macro";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Post } from "@/lib/posts";

export default function BlogIndex() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/posts");
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        }
      } catch {
        // fallback to empty
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="container section-padding">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-center">
          <Trans>Engineering Blog</Trans>
        </h1>
        <div className="mt-12 max-w-2xl mx-auto space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-lg border border-border bg-card/30 animate-pulse">
              <div className="h-6 bg-muted/30 rounded w-3/4"></div>
              <div className="h-4 bg-muted/20 rounded w-1/2 mt-2"></div>
              <div className="h-3 bg-muted/20 rounded w-1/4 mt-4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container section-padding">
      <h1 className="font-display text-4xl md:text-5xl font-bold text-center">
        <Trans>Engineering Blog</Trans>
      </h1>
      <p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
        <Trans>Deep dives into our architecture, design decisions, and the philosophy behind Ataqu.</Trans>
      </p>
      <div className="mt-12 max-w-2xl mx-auto space-y-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block p-6 rounded-lg border border-border bg-card/30 hover:bg-card/60 transition-colors"
          >
            <h2 className="font-display text-xl font-bold hover:text-primary transition-colors">
              {post.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground/60">
              <time dateTime={post.date}>{post.date}</time>
              <span>·</span>
              <span>{post.readingTime}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
