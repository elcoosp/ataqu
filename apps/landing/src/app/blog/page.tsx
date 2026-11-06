"use client";

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
				// ignore
			} finally {
				setLoading(false);
			}
		}
		fetchPosts();
	}, []);

	if (loading) {
		return (
			<div className="container section-padding">
				<h1 className="display text-4xl leading-tight text-ink-strong md:text-5xl">
					Engineering Blog
				</h1>
				<div className="mx-auto mt-12 max-w-3xl space-y-4">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="animate-pulse border border-hairline bg-paper-raised p-6"
						>
							<div className="h-6 w-3/4 bg-hairline" />
							<div className="mt-3 h-4 w-1/2 bg-hairline" />
							<div className="mt-4 h-3 w-1/4 bg-hairline" />
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="container section-padding">
			<div className="max-w-4xl">
				<h1 className="display text-4xl leading-tight text-ink-strong md:text-5xl">
					Engineering Blog
				</h1>
				<p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-ink-soft">
					Deep dives into our architecture, design decisions, and the philosophy
					behind Ataqu.
				</p>
				<div className="mt-12">
					{posts.map((post) => (
						<Link
							key={post.slug}
							href={`/blog/${post.slug}`}
							className="group block border-b border-hairline py-6 transition-colors first:border-t hover:bg-paper-raised"
						>
							<div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
								<h2 className="display text-xl text-ink-strong transition-colors group-hover:text-redline-ink">
									{post.title}
								</h2>
								<div className="meta flex items-center gap-3 text-ink-soft">
									<time dateTime={post.date}>{post.date}</time>
									<span aria-hidden="true">·</span>
									<span>{post.readingTime}</span>
								</div>
							</div>
							<p className="mt-2 max-w-[68ch] leading-relaxed text-ink-soft">
								{post.excerpt}
							</p>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
