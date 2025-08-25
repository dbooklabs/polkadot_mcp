import type { z } from 'zod';
import { GetUserBalancePolkadotSchema, GetNetworkInfoPolkadotSchema } from './schemas.js';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { SubscanNetwork } from '../utils/SubscanNetwork.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this file and configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

// Load environment variables from project root
dotenv.config({ path: path.join(projectRoot, '.env') });

// Types for API responses
type StringNum = string;

interface Token {
  symbol: string;
  decimals: number;
  balance: StringNum;
  price: StringNum | null;
  category?: string;
}

interface ApiData {
  native?: Token[];
  assets?: Token[];
  list?: Token[];
}

interface ApiResponse {
  code: number;
  message: string;
  data: ApiData;
}

interface TokenResult {
  tokenName: string;
  tokenAmount: string;
  tokenAmountInUSD?: string;
}

interface NetworkStatsResult {
  latestBlock?: number;
  latestHash?: string;
  avgBlockTimeSec?: number;
  avgBlockTimeMs?: number;
}

interface SubscanDetails {
  networkName: string;
  baseUrl: string;
  rpc?: string | null;
  chainId?: number;
}

interface JsonResponse {
  status: "success" | "error";
  data: any;
}

type BlocksItem = {
  block_num: number | string;
  block_timestamp: number;
  block_hash?: string;
  hash?: string;
};

type BlocksResp = { 
  code: number; 
  message: string; 
  data: { blocks?: BlocksItem[]; list?: BlocksItem[] } 
};

type LatestResp = { 
  code: number; 
  message: string; 
  data: { block_num: number | string; block_timestamp: number; block_hash?: string; hash?: string } 
};

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

const trim = (u: string) => u.replace(/\/+$/, "");
const hdrs = (key: string) => ({
  "X-API-Key": key,
  "Content-Type": "application/json",
});

// Token fetching logic
async function fetchAccountTokensRaw(baseUrl: string, apiKey: string, address: string): Promise<ApiData> {
  const base = trim(baseUrl);

  try {
    const { data } = await axios.post<ApiResponse>(
      `${base}/api/v2/scan/account/tokens`,
      { address },
      { headers: hdrs(apiKey), timeout: 15_000 }
    );
    if (data.code !== 0) throw new Error(`Subscan v2 error: ${data.message}`);
    const native = []
    const assets = []
    if (data.data && data.data.list) {
      for(let i = 0; i < data.data.list.length; i++) {
        const token = data.data.list[i];
        if(token.category === 'Native') {
          native.push({ symbol: token.symbol, balance: token.balance, decimals: token.decimals, price: token.price });
        } else {
          assets.push({ symbol: token.symbol, balance: token.balance, decimals: token.decimals, price: token.price });
        }
      }
      return { native, assets }
    }
    return data.data ?? {};
  } catch (e: any) {
    const s = e?.response?.status;
    if (s !== 404) throw e;
  }

  // v1 fallback
  const { data } = await axios.post<ApiResponse>(
    `${base}/api/scan/account/tokens`,
    { address },
    { headers: hdrs(apiKey), timeout: 15_000 }
  );
  if (data.code !== 0) throw new Error(`Subscan v1 error: ${data.message}`);
  return data.data ?? {};
}

function formatUnits(value: string, decimals: number): string {
  const neg = value.startsWith("-");
  const v = neg ? value.slice(1) : value;
  const pad = decimals - v.length + 1;
  const s = pad > 0 ? "0".repeat(pad) + v : v;
  const i = s.length - decimals;
  const whole = s.slice(0, i).replace(/^0+(?=\d)/, "") || "0";
  const frac = s.slice(i).replace(/0+$/, "");
  return (neg ? "-" : "") + (frac ? `${whole}.${frac}` : whole);
}

async function getAccountTokens(
  baseUrl: string,
  apiKey: string,
  address: string
): Promise<TokenResult[]> {
  const { native = [], assets = [] } = await fetchAccountTokensRaw(baseUrl, apiKey, address);
  const all = [...native, ...assets];
  return all.map((t) => {
    const amount = formatUnits(t.balance, t.decimals);
    return {
      tokenName: t.symbol,
      tokenAmount: amount,
      tokenAmountInUSD: t.price ? (Number(amount) * Number(t.price)).toFixed(2) : undefined,
    };
  });
}

// Network stats logic
async function fetchBlocks(baseUrl: string, apiKey: string, row: number): Promise<BlocksItem[]> {
  const url = `${trim(baseUrl)}/api/v2/scan/blocks`;
  try {
    const { data } = await axios.post<BlocksResp>(
      url,
      { page: 0, row },
      { headers: { "X-API-Key": apiKey, "Content-Type": "application/json" }, timeout: 15_000 }
    );
    if (data.code !== 0) throw new Error(data.message);
    const list = data.data.blocks ?? data.data.list ?? [];
    return list.sort((a, b) => Number(b.block_num) - Number(a.block_num));
  } catch (e: any) {
    if (e?.response?.status === 404) {
      const latest = await fetchLatest(baseUrl, apiKey);
      return latest ? [latest] : [];
    }
    throw e;
  }
}

async function fetchLatest(baseUrl: string, apiKey: string): Promise<BlocksItem | undefined> {
  const url = `${trim(baseUrl)}/api/v2/scan/block/latest`;
  const { data } = await axios.post<LatestResp>(
    url,
    {},
    { headers: { "X-API-Key": apiKey, "Content-Type": "application/json" }, timeout: 12_000 }
  );
  if (data.code !== 0) throw new Error(data.message);
  return {
    block_num: data.data.block_num,
    block_timestamp: data.data.block_timestamp,
    block_hash: data.data.block_hash ?? data.data.hash,
    hash: data.data.block_hash ?? data.data.hash,
  };
}

async function getNetworkStats(baseUrl: string, apiKey: string, sample = 30): Promise<NetworkStatsResult> {
  const items = await fetchBlocks(baseUrl, apiKey, Math.max(3, Math.min(100, sample)));
  const latest = items[0];
  const latestBlock = latest ? Number(latest.block_num) : undefined;
  const latestHash = latest ? (latest.block_hash ?? latest.hash) : undefined;

  let avgBlockTimeSec: number | undefined;
  let avgBlockTimeMs: number | undefined;
  
  if (items.length >= 2) {
    const ts = items.map((i) => Number(i.block_timestamp)).sort((a, b) => a - b);
    const diffs: number[] = [];
    for (let i = 1; i < ts.length; i++) {
      const d = ts[i] - ts[i - 1];
      if (d > 0 && d < 300) diffs.push(d);
    }
    if (diffs.length) {
      avgBlockTimeSec = +(diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(2);
      avgBlockTimeMs = +(avgBlockTimeSec * 1000).toFixed(0);
    }
  }
  
  return { 
    latestBlock, 
    latestHash, 
    avgBlockTimeSec,
    avgBlockTimeMs
  };
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

export async function getNetworkInfoPolkadotHandler(
    args: z.infer<typeof GetNetworkInfoPolkadotSchema>,
  ): Promise<string> {
    try {
      const { chainId, chainName } = args;

      // Validate network constants and handle mismatch
      try {
        await validatePolkadotNetworkConstants(chainId, chainName);
      } catch (error) {
        throw new Error(`Network constants validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Try multiple ways to get the API key
      const API_KEY = process.env.SUBSCAN_API_KEY || process.env.SUBSCAN_API_KEY?.trim() || "";

      if (!API_KEY) {
        const errorResponse: JsonResponse = {
          status: "error",
          data: { message: "Missing SUBSCAN_API_KEY environment variable" }
        };
        return JSON.stringify(errorResponse, null, 2);
      }

      const details = getSubscanDetails(chainName);
      if (!details) {
        const errorResponse: JsonResponse = {
          status: "error",
          data: { message: `No Subscan network found for chain: ${chainName}` }
        };
        return JSON.stringify(errorResponse, null, 2);
      }

      const stats = await getNetworkStats(details.baseUrl, API_KEY, 30);
      const successResponse: JsonResponse = {
        status: "success",
        data: stats
      };
      return JSON.stringify(successResponse, null, 2);
    } catch (error) {
      console.error('Error in getNetworkInfoPolkadotHandler:', error);
      const errorResponse: JsonResponse = {
        status: "error",
        data: { message: error instanceof Error ? error.message : "Unknown error occurred" }
      };
      return JSON.stringify(errorResponse, null, 2);
    }
  }

export async function getUserBalancePolkadotHandler(
    args: z.infer<typeof GetUserBalancePolkadotSchema>,
  ): Promise<string> {
    try {
      const { userAddress, chainId, chainName } = args;

      // Validate network constants and handle mismatch
      try {
        await validatePolkadotNetworkConstants(chainId, chainName);
      } catch (error) {
        throw new Error(`Network constants validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Try multiple ways to get the API key
      const API_KEY = process.env.SUBSCAN_API_KEY || process.env.SUBSCAN_API_KEY?.trim() || "";

      if (!API_KEY) {
        const errorResponse: JsonResponse = {
          status: "error",
          data: { message: "Missing SUBSCAN_API_KEY environment variable" }
        };
        return JSON.stringify(errorResponse, null, 2);
      }

      const details = getSubscanDetails(chainName);
      if (!details) {
        const errorResponse: JsonResponse = {
          status: "error",
          data: { message: `No Subscan network found for chain: ${chainName}` }
        };
        return JSON.stringify(errorResponse, null, 2);
      }

      const tokens = await getAccountTokens(details.baseUrl, API_KEY, userAddress);
      if (tokens.length === 0) {
        const noTokensResponse: JsonResponse = {
          status: "success",
          data: []
        };
        return JSON.stringify(noTokensResponse, null, 2);
      }
      
      const successResponse: JsonResponse = {
        status: "success",
        data: tokens
      };
      return JSON.stringify(successResponse, null, 2);
    } catch (error) {
      console.error('Error in getUserBalancePolkadotHandler:', error);
      const status = (error as any)?.response?.status;
      let errorMessage = "";
      if (status === 404) {
        errorMessage = `404 from Subscan. Check base URL & endpoint support.`;
      } else {
        errorMessage = (error as any)?.response?.data?.message || (error instanceof Error ? error.message : "Unknown error occurred");
      }
      
      const errorResponse: JsonResponse = {
        status: "error",
        data: { message: errorMessage }
      };
      return JSON.stringify(errorResponse, null, 2);
    }
  }
