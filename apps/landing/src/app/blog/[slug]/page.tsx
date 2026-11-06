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
		<h1
			className="display mt-10 mb-4 text-3xl leading-tight text-ink-strong md:text-4xl"
			{...props}
		>
			{children}
		</h1>
	),
	h2: ({ children, ...props }: any) => (
		<h2
			className="display mt-10 mb-3 border-b border-hairline-strong pb-2 text-2xl text-ink-strong"
			{...props}
		>
			{children}
		</h2>
	),
	h3: ({ children, ...props }: any) => (
		<h3
			className="display mt-8 mb-2 text-xl font-semibold tracking-tight text-ink-strong"
			{...props}
		>
			{children}
		</h3>
	),
	p: ({ children, ...props }: any) => (
		<p className="my-4 leading-relaxed text-ink-soft" {...props}>
			{children}
		</p>
	),
	a: ({ href, children, ...props }: any) => (
		<a href={href} className="link-redline" {...props}>
			{children}
		</a>
	),
	ul: ({ children, ...props }: any) => (
		<ul
			className="my-4 space-y-1.5 pl-5 leading-relaxed text-ink-soft [&>li]:list-disc"
			{...props}
		>
			{children}
		</ul>
	),
	ol: ({ children, ...props }: any) => (
		<ol
			className="my-4 space-y-1.5 pl-5 leading-relaxed text-ink-soft [&>li]:list-decimal"
			{...props}
		>
			{children}
		</ol>
	),
	li: ({ children, ...props }: any) => (
		<li className="text-ink-soft" {...props}>
			{children}
		</li>
	),
	blockquote: ({ children, ...props }: any) => (
		<blockquote
			className="my-4 border-l-2 border-redline py-1 pl-4 text-ink italic"
			{...props}
		>
			{children}
		</blockquote>
	),
	code: ({ children, className, ...props }: any) => {
		const isInline = !className;
		if (isInline) {
			return (
				<code
					className="rounded-[2px] bg-paper-sunken px-1.5 py-0.5 font-mono text-[0.875em] text-ink"
					{...props}
				>
					{children}
				</code>
			);
		}
		return (
			<pre
				className="my-4 overflow-x-auto rounded-[2px] border border-hairline-strong bg-paper-sunken p-4 font-mono text-sm text-ink"
				{...props}
			>
				<code className={className}>{children}</code>
			</pre>
		);
	},
	hr: (props: any) => (
		<hr className="my-10 border-hairline-strong" {...props} />
	),
	table: ({ children, ...props }: any) => (
		<div className="my-4 overflow-x-auto" {...props}>
			<table className="w-full border-collapse border border-hairline-strong text-sm">
				{children}
			</table>
		</div>
	),
	th: ({ children, ...props }: any) => (
		<th
			className="meta border border-hairline-strong bg-paper-sunken px-4 py-2.5 text-left text-ink-soft"
			{...props}
		>
			{children}
		</th>
	),
	td: ({ children, ...props }: any) => (
		<td className="border border-hairline px-4 py-2.5 text-ink" {...props}>
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
			<div className="container section-padding">
				<div className="mx-auto max-w-[68ch] animate-pulse space-y-4">
					<div className="h-6 w-32 bg-hairline" />
					<div className="h-12 w-3/4 bg-hairline" />
					<div className="h-4 w-1/3 bg-hairline" />
					<div className="h-64 bg-hairline" />
				</div>
			</div>
		);
	}

	if (!post) {
		return (
			<div className="container section-padding text-center">
				<h1 className="display text-2xl text-ink-strong">Post not found</h1>
				<Link href="/blog" className="link-redline mt-4 inline-block">
					← Back to blog
				</Link>
			</div>
		);
	}

	return (
		<div className="container section-padding">
			<div className="mx-auto max-w-[68ch]">
				<Link
					href="/blog"
					className="meta text-ink-soft transition-colors hover:text-redline-ink"
				>
					← Back to blog
				</Link>
				<h1 className="display mt-8 text-3xl leading-tight text-ink-strong md:text-4xl">
					{post.title}
				</h1>
				<div className="meta mt-3 flex items-center gap-3 text-ink-soft">
					<time dateTime={post.date}>{post.date}</time>
					<span aria-hidden="true">·</span>
					<span>{post.readingTime}</span>
				</div>
				<hr className="mt-8 border-hairline-strong" />
				<article className="max-w-none">
					<ReactMarkdown
						remarkPlugins={[remarkGfm]}
						components={MarkdownComponents as any}
					>
						{post.content}
					</ReactMarkdown>
				</article>
			</div>
		</div>
	);
}
