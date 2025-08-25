import { generateTool } from '../../utils.js';
import { buildTransferTransactionPolkadotHandler } from './handlers.js';
import { BuildTransferTransactionPolkadotSchema } from './schemas.js';

export const buildTransferTransactionPolkadotTool = generateTool({
    name: 'build_transfer_transaction_polkadot',
    description: "Builds a transfer transaction for a Polkadot network.",
    inputSchema: BuildTransferTransactionPolkadotSchema, // Assuming the schema is similar for building transfer transactions
    toolHandler: buildTransferTransactionPolkadotHandler, // Placeholder, replace with actual handler for building transfer transactions
});