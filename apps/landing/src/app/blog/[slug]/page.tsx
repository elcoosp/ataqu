import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Trans } from "@lingui/react/macro";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { getPostBySlug, getAllPosts } from "@/lib/posts";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not Found" };
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

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
        <MDXRemote
          source={post.content}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
            },
          }}
        />
      </article>
    </div>
  );
}
