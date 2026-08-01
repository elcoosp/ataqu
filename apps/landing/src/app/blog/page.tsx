import { Trans } from "@lingui/react/macro";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata = {
  title: "Ataqu Engineering Blog",
  description: "Deep dives into our architecture, design decisions, and the philosophy behind Ataqu.",
};

export default function BlogIndex() {
  const posts = getAllPosts();

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
