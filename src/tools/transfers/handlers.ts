import type { z } from 'zod';
import { BuildTransferTransactionPolkadotSchema } from './schemas.js';
import * as dotenv from 'dotenv';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { SubscanNetwork } from '../utils/SubscanNetwork.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this file and configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

// Load environment variables from project root
dotenv.config({ path: path.join(projectRoot, '.env') });

interface SubscanDetails {
  networkName: string;
  baseUrl: string;
  rpc?: string | null;
  chainId?: number;
}

interface TransferResult {
  rpc: string;
  section: string;
  method: string;
  args: string[];
}

interface JsonResponse {
  status: "success" | "error";
  data: TransferResult | { message: string };
}

// Helper functions
function findNetworkByName(name: string): { networkKey: keyof typeof SubscanNetwork; chainId: number } | null {
  const networks = Object.keys(SubscanNetwork) as (keyof typeof SubscanNetwork)[];
  
  const exactMatch = networks.find(network => 
    network.toLowerCase() === name.toLowerCase()
  );
  if (exactMatch) {
    const chainId = networks.indexOf(exactMatch);
    return { networkKey: exactMatch, chainId };
  }
  
  return null;
}

function findNetworkByChainId(chainId: number): keyof typeof SubscanNetwork | null {
  const networks = Object.keys(SubscanNetwork) as (keyof typeof SubscanNetwork)[];
  return networks[chainId] || null;
}

function getSubscanDetails(input: string | number): SubscanDetails | null {
  let networkKey: keyof typeof SubscanNetwork | null = null;
  let chainId: number | undefined;
  
  if (typeof input === "number") {
    chainId = input;
    networkKey = findNetworkByChainId(input);
  } else {
    const parsed = parseInt(input);
    if (!isNaN(parsed)) {
      chainId = parsed;
      networkKey = findNetworkByChainId(parsed);
    }
    
    if (!networkKey) {
      const result = findNetworkByName(input);
      if (result) {
        networkKey = result.networkKey;
        chainId = result.chainId;
      }
    }
  }
  
  if (!networkKey) return null;
  
  const networkDetails = SubscanNetwork[networkKey];
  
  return {
    networkName: networkKey,
    baseUrl: networkDetails.subscanApi,
    rpc: networkDetails.rpc,
    chainId
  };
}

function humanToPlanck(amount: string, decimals: number): bigint {
  const [i, f = ""] = amount.split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(i || "0") * 10n ** BigInt(decimals) + BigInt(frac || "0");
}

async function validatePolkadotNetworkConstants(chainId: number, chainName: string): Promise<void> {
  const chainIdDetails = getSubscanDetails(chainId);
  const chainNameDetails = getSubscanDetails(chainName);

  if (!chainIdDetails || !chainNameDetails) {
    throw new Error(`Unable to find network details for chainId: ${chainId} or chainName: ${chainName}`);
  }

  if (chainIdDetails.baseUrl !== chainNameDetails.baseUrl) {
    throw new Error(`Chain ID and chain name baseUrl mismatch: ${chainIdDetails.baseUrl} vs ${chainNameDetails.baseUrl}`);
  }
}

async function buildTransferTransaction(
  toAddress: string,
  amount: string,
  chainName: string,
  keepAlive: boolean = true
): Promise<TransferResult> {
  const details = getSubscanDetails(chainName);
  if (!details || !details.rpc) {
    throw new Error(`No RPC found for chain: ${chainName}`);
  }

  const rpc = details.rpc;

  // Suppress Polkadot API logging
  const originalEnv = process.env.DEBUG;
  process.env.DEBUG = '';

  let api: ApiPromise | null = null;
  try {
    const provider = new WsProvider(rpc);
    api = await ApiPromise.create({ provider });

    const decimals = api.registry.chainDecimals?.[0] ?? 10;
    const planck = humanToPlanck(amount, decimals);

    const tx = keepAlive
      ? api.tx.balances.transferKeepAlive(toAddress, planck)
      : api.tx.balances.transfer(toAddress, planck);

    return {
      rpc,
      section: tx.method.section,
      method: tx.method.method,
      args: tx.method.args.map((a) => a.toString()),
    };
  } finally {
    if (api) {
      await api.disconnect();
    }
    // Restore original DEBUG setting
    if (originalEnv !== undefined) {
      process.env.DEBUG = originalEnv;
    } else {
      delete process.env.DEBUG;
    }
  }
}

export async function buildTransferTransactionPolkadotHandler(
    args: z.infer<typeof BuildTransferTransactionPolkadotSchema>,
  ): Promise<string> {
    try {
      const { toAddress, amount, chainId, chainName } = args;

      // Validate network constants and handle mismatch
      try {
        await validatePolkadotNetworkConstants(chainId, chainName);
      } catch (error) {
        throw new Error(`Network constants validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      if (!toAddress || !amount || !chainName) {
        const errorResponse: JsonResponse = {
          status: "error",
          data: { message: "Missing required parameters: toAddress, amount, or chainName" }
        };
        return JSON.stringify(errorResponse, null, 2);
      }

      const transferResult = await buildTransferTransaction(toAddress, amount, chainName, true);
      
      const successResponse: JsonResponse = {
        status: "success",
        data: transferResult
      };
      return JSON.stringify(successResponse, null, 2);
    } catch (error) {
      console.error('Error in buildTransferTransactionPolkadotHandler:', error);
      const errorResponse: JsonResponse = {
        status: "error",
        data: { message: error instanceof Error ? error.message : "Unknown error occurred" }
      };
      return JSON.stringify(errorResponse, null, 2);
    }
  }