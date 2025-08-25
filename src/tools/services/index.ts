import { generateTool } from '../../utils.js';
import { getUserBalancePolkadotHandler, getNetworkInfoPolkadotHandler } from './handlers.js';
import { GetUserBalancePolkadotSchema, GetNetworkInfoPolkadotSchema } from './schemas.js';


export const getNetworkInfoPolkadotTool = generateTool({
    name: 'get_network_info_polkadot',
    description: "Retrieves information about the Polkadot network.",
    inputSchema: GetNetworkInfoPolkadotSchema,
    toolHandler: getNetworkInfoPolkadotHandler,
});

export const getUserBalancePolkadotTool = generateTool({
    name: 'get_user_balance_polkadot',
    description: "Gets the user's balance on the Polkadot network.",
    inputSchema: GetUserBalancePolkadotSchema,
    toolHandler: getUserBalancePolkadotHandler,
});