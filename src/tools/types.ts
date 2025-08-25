/**
 * OpenRouter types
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export type ToolHandler = (
  args: any,
) => Promise<string>;

export type ToolWithHandler = {
  definition: Tool;
  handler: ToolHandler;
};
