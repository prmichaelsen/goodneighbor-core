// src/web/index.ts
// Web adapter barrel — context, errors, and helpers

export type { WebSDKContext } from './context';
export { createWebSDKContext } from './context';

export type { WebSDKError } from './error';
export { toWebSDKError } from './error';

export { webTryCatch } from './helpers';
