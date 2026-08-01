import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const postsDirectory = path.join(process.cwd(), "content/blog");

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  content: string; // raw MDX content
  readingTime: string;
};

export function getAllPosts(): Post[] {
  const fileNames = fs.readdirSync(postsDirectory);
  const allPosts = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.mdx?$/, "");
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title || slug,
      excerpt: data.excerpt || "",
      date: data.date || new Date().toISOString().split("T")[0],
      content,
      readingTime: readingTime(content).text,
    };
  });

  return allPosts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): Post | null {
  const fileNames = fs.readdirSync(postsDirectory);
  const fileName = fileNames.find((f) => f.replace(/\.mdx?$/, "") === slug);
  if (!fileName) return null;

  const fullPath = path.join(postsDirectory, fileName);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: data.title || slug,
    excerpt: data.excerpt || "",
    date: data.date || new Date().toISOString().split("T")[0],
    content,
    readingTime: readingTime(content).text,
  };
}
