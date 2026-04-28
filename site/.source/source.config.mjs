// source.config.ts
import { defineCollections, defineDocs, frontmatterSchema } from "fumadocs-mdx/config/zod-3";
import { z } from "zod";
var blog = defineCollections({
  type: "doc",
  dir: "content/blog",
  schema: frontmatterSchema.extend({
    author: z.string(),
    date: z.string().date().or(z.date()),
    tags: z.array(z.string()).default([])
  })
});
var { docs, meta } = defineDocs({
  dir: "content/docs"
});
export {
  blog,
  docs,
  meta
};
