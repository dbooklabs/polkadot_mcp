import { getListOfPolkadotNetworksTool } from './chains/index.js';
import { getNetworkInfoPolkadotTool, getUserBalancePolkadotTool } from './services/index.js';
import { buildTransferTransactionPolkadotTool } from './transfers/index.js';
import type { ToolHandler, ToolWithHandler } from './types.js';

export const polkadotMCPTools: ToolWithHandler[] = [
  getListOfPolkadotNetworksTool,
  getNetworkInfoPolkadotTool,
  getUserBalancePolkadotTool,
  buildTransferTransactionPolkadotTool,
];

export const toolToHandler: Record<string, ToolHandler> = polkadotMCPTools.reduce<
  Record<string, ToolHandler>
>((acc, tool) => {
  acc[tool.definition.name] = tool.handler;
  return acc;
}, {});
