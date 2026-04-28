/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_audit from "../actions/audit.js";
import type * as actions_checkout from "../actions/checkout.js";
import type * as actions_monitoring from "../actions/monitoring.js";
import type * as actions_webhook from "../actions/webhook.js";
import type * as audits from "../audits.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_aeo_llmClient from "../lib/aeo/llmClient.js";
import type * as lib_aeo_prompt from "../lib/aeo/prompt.js";
import type * as lib_aeo_robots from "../lib/aeo/robots.js";
import type * as lib_aeo_score from "../lib/aeo/score.js";
import type * as lib_aeo_seoChecks from "../lib/aeo/seoChecks.js";
import type * as lib_aeo_types from "../lib/aeo/types.js";
import type * as lib_aeoAnalyzer from "../lib/aeoAnalyzer.js";
import type * as lib_crawler from "../lib/crawler.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as shareableReports from "../shareableReports.js";
import type * as sites from "../sites.js";
import type * as usageLogs from "../usageLogs.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/audit": typeof actions_audit;
  "actions/checkout": typeof actions_checkout;
  "actions/monitoring": typeof actions_monitoring;
  "actions/webhook": typeof actions_webhook;
  audits: typeof audits;
  auth: typeof auth;
  billing: typeof billing;
  crons: typeof crons;
  http: typeof http;
  "lib/aeo/llmClient": typeof lib_aeo_llmClient;
  "lib/aeo/prompt": typeof lib_aeo_prompt;
  "lib/aeo/robots": typeof lib_aeo_robots;
  "lib/aeo/score": typeof lib_aeo_score;
  "lib/aeo/seoChecks": typeof lib_aeo_seoChecks;
  "lib/aeo/types": typeof lib_aeo_types;
  "lib/aeoAnalyzer": typeof lib_aeoAnalyzer;
  "lib/crawler": typeof lib_crawler;
  "lib/rateLimit": typeof lib_rateLimit;
  shareableReports: typeof shareableReports;
  sites: typeof sites;
  usageLogs: typeof usageLogs;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
