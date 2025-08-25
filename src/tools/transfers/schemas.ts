import { z } from 'zod';

export const BuildTransferTransactionPolkadotSchema = z.object({
    toAddress: z.string().describe("The recipient's Polkadot address."),
    amount: z.string().describe("The amount to transfer. Do not add planck suffix, it will be added automatically."),
    chainId: z.number().describe("The ID of the Polkadot chain to build the transaction for. For example, 0 for Polkadot, 1 for Kusama, etc."),
    chainName: z.string().describe("The name of the Polkadot chain to build the transaction for. If not provided, defaults to the chain ID.")
});