import { defineCollection } from 'astro:content';
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
    // Small icon badges shown next to the post meta, e.g. for "unterwegs"
    // posts: bike for rides, footprints for walks, camera when there are
    // photos, backpack for longer trips. Any combination is allowed.
    badges: z.array(z.enum(['bike', 'footprints', 'camera', 'backpack'])).default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const activities = defineCollection({
  loader: gpxLoader(),
});

export const collections = { posts, activities };
