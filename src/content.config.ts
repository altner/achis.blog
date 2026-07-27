import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { gpxLoader } from './loaders/gpx';

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/posts',
    // Posts live in date-named folders (e.g. 2026-07-25/slug.md) for
    // organization, but the slug/id should just be the filename.
    generateId: ({ entry }) => entry.split('/').pop()!.replace(/\.(md|mdx)$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    category: reference('categories').optional(),
    // Just the filename — the matching .gpx file always lives in the same
    // folder as the post itself. Resolved to an `activities` entry at
    // render time by combining this with the post's own directory.
    gpx: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const categories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/categories' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string(),
    order: z.number().default(0),
  }),
});

const activities = defineCollection({
  loader: gpxLoader(),
});

export const collections = { posts, categories, activities };
