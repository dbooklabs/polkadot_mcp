import { generateTool } from '../../utils.js';
import { getListOfPolkadotNetworksHandler } from './handlers.js';
import { GetListOfPolkadotNetworksSchema } from './schemas.js';

export const getListOfPolkadotNetworksTool = generateTool({
    name: 'get_list_of_polkadot_networks',
    description: "Retrieves a list of available Polkadot networks.",
    inputSchema: GetListOfPolkadotNetworksSchema, // Assuming the schema is defined for listing networks
    toolHandler: getListOfPolkadotNetworksHandler, // Placeholder, replace with actual handler for listing networks
});