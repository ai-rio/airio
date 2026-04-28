// @ts-nocheck -- skip type checking
import * as meta_0 from "../content/docs/meta.json?collection=meta&hash=1777309775051"
import * as docs_1 from "../content/docs/llms-txt.mdx?collection=docs&hash=1777309775051"
import * as docs_0 from "../content/docs/index.mdx?collection=docs&hash=1777309775051"
import * as blog_0 from "../content/blog/por-que-meu-concorrente-aparece-no-chatgpt.mdx?collection=blog&hash=1777309775051"
import { _runtime } from "fumadocs-mdx"
import * as _source from "../source.config"
export const blog = _runtime.doc<typeof _source.blog>([{ info: {"path":"por-que-meu-concorrente-aparece-no-chatgpt.mdx","absolutePath":"/home/carlos/apps/airio/site/content/blog/por-que-meu-concorrente-aparece-no-chatgpt.mdx"}, data: blog_0 }]);
export const docs = _runtime.doc<typeof _source.docs>([{ info: {"path":"index.mdx","absolutePath":"/home/carlos/apps/airio/site/content/docs/index.mdx"}, data: docs_0 }, { info: {"path":"llms-txt.mdx","absolutePath":"/home/carlos/apps/airio/site/content/docs/llms-txt.mdx"}, data: docs_1 }]);
export const meta = _runtime.meta<typeof _source.meta>([{ info: {"path":"meta.json","absolutePath":"/home/carlos/apps/airio/site/content/docs/meta.json"}, data: meta_0 }]);