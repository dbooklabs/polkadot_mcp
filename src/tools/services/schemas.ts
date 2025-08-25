import { z } from 'zod';

export const GetNetworkInfoPolkadotSchema = z.object({
    chainId: z.number().describe("The ID of the Polkadot chain to query. For example, 0 for Polkadot, 1 for Kusama, etc."),
    chainName: z.string().describe("The name of the Polkadot chain to query. If not provided, defaults to the chain ID.")
});

export const GetUserBalancePolkadotSchema = z.object({
    userAddress: z.string().describe("The Polkadot address to fetch the balance for."),
    chainId: z.number().describe("The ID of the Polkadot chain to query. For example, 0 for Polkadot, 1 for Kusama, etc."),
    chainName: z.string().describe("The name of the Polkadot chain to query. If not provided, defaults to the chain ID.")
})