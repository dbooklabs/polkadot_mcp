import type { z } from 'zod';
import { GetListOfPolkadotNetworksSchema } from './schemas.js';
import { SubscanNetwork } from '../utils/SubscanNetwork.js';

interface SubscanDetails {
  networkName: string;
  baseUrl: string;
  rpc?: string | null;
  chainId?: number;
}

interface JsonResponse {
  status: "success" | "error";
  data: SubscanDetails | SubscanDetails[] | { message: string };
}

function findNetworkByName(name: string): { networkKey: keyof typeof SubscanNetwork; chainId: number } | null {
  const networks = Object.keys(SubscanNetwork) as (keyof typeof SubscanNetwork)[];
  
  // Exact match (case-insensitive)
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
    // Try parsing as number first
    const parsed = parseInt(input);
    if (!isNaN(parsed)) {
      chainId = parsed;
      networkKey = findNetworkByChainId(parsed);
    }
    
    // If not found by chain ID or not a number, try by name
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

function getAllNetworks(): SubscanDetails[] {
  const networks = Object.keys(SubscanNetwork) as (keyof typeof SubscanNetwork)[];
  
  return networks.map((networkKey, index) => {
    const networkDetails = SubscanNetwork[networkKey];
    return {
      networkName: networkKey,
      baseUrl: networkDetails.subscanApi,
      rpc: networkDetails.rpc,
      chainId: index
    };
  });
}

export async function getListOfPolkadotNetworksHandler(
    args: z.infer<typeof GetListOfPolkadotNetworksSchema>,
  ): Promise<string> {
    try {
      
      // if (!input) {
      const allNetworks = getAllNetworks();
      const successResponse: JsonResponse = {
        status: "success",
        data: allNetworks
      };
      return JSON.stringify(successResponse, null, 2);
      // }
      
      // const details = getSubscanDetails(input);
      
      // if (!details) {
      //   const errorResponse: JsonResponse = {
      //     status: "error",
      //     data: { message: `No Subscan network found for: ${input}` }
      //   };
      //   return JSON.stringify(errorResponse, null, 2);
      // }
      
      // const successResponse: JsonResponse = {
      //   status: "success",
      //   data: details
      // };
      // return JSON.stringify(successResponse, null, 2);
    } catch (error) {
      console.error('Error in getListOfPolkadotNetworksTool:', error);
      const errorResponse: JsonResponse = {
        status: "error",
        data: { message: error instanceof Error ? error.message : "Unknown error occurred" }
      };
      return JSON.stringify(errorResponse, null, 2);
    }
  }