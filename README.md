# dBOOK – Polkadot MCP

![Claude Demo](public/demo.gif)

⚙️ Utility package powering the **[dBOOK Polkadot Grant Project](https://github.com/Polkadot-Fast-Grants/apply/blob/master/applications/dBOOK.md)**.  
This repository contains the methods for **fetching network data from Polkadot and parachains**, and for **constructing transfer payloads** that can be signed and broadcasted.


## 📌 Overview

This repo is responsible for:

- Fetching balances and network data via [Subscan](https://subscan.io/).  
- Constructing transfer payloads for native assets across supported Polkadot parachains.  
- Exposing helper methods for integration with the dBOOK frontend & intent engine.  


## 🏗 Tech Stack

- [Node.js](https://nodejs.org/) – Runtime  
- [TypeScript](https://www.typescriptlang.org/) – Static typing  
- [Polkadot.js API](https://polkadot.js.org/docs/) – Blockchain interaction  
- [Subscan API](https://support.subscan.io/) – Balance & network metadata  


## 📂 Project Structure

```text
polkadot_mcp/
├── src/                    # Core source code
│   ├── index.ts              # Entry point (exported methods)
│   └── tools/                # MCP Tool definitions & handlers
│       ├── utils/              # Utility files
│       ├── chains/             # Chain-specific configs & RPC maps
│       ├── services/           # Subscan fetchers, balance handlers
│       └── transfers/          # Construct transfer payload methods
│
├── .env.example            # Example env variables
├── .gitignore              # Git ignored files
├── package.json            # Project metadata and dependencies
├── tsconfig.json           # TypeScript configuration
├── LICENSE.md              # Project License
└── README.md               # Project documentation
```

## ⚡ Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/dbooklabs/polkadot_mcp
cd polkadot_mcp
```

### 2. Setup environment variables

```bash
cp .env.example .env
```

Inside .env add your Subscan API key:
```bash
SUBSCAN_API_KEY=<your_key_here>
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run locally

```bash
npm run build
```

## 🔑 Features Implemented
- [x] Fetch balances & network metadata from Subscan  
- [x] Construct transfer payloads for native assets  
- [x] Handle multiple parachains via chain mapping  
- [ ] Support for non-native assets (future milestone)  

## 🧪 Testing
Transfers have been tested successfully on:
- Polkadot  
- Astar  
- Paseo

## Integration with Claude Desktop

To add Polkadot MCP server to Claude Desktop:

1. Create or edit the Claude Desktop configuration file at:

   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

You can easily access this file via the Claude Desktop app by navigating to Claude > Settings > Developer > Edit Config.

2. Add the following configuration:

   ```json
    {
      "mcpServers": {
        "base-mcp": {
          "command": "node",
          "args": ["<PROJECT_PATH>/build/index.js"],
          "env": {
            "SUBSCAN_API_KEY": "<YOUR_SUBSCAN_API_KEY>"
          },
          "disabled": false,
          "autoApprove": []
        }
      }
    }
   ```

3. Restart Claude Desktop for the changes to take effect.

## Available Tools

### get_list_of_polkadot_networks

Retrieves a list of available Polkadot networks.

Example query to Claude:

> "What are the available Polkadot networks?"

### get_network_info_polkadot

Retrieves information about the Polkadot network.

Parameters:

- `chainId`: The ID of the Polkadot chain to query. Refer to the list in **[chainConfigs](https://github.com/dbooklabs/polkadot_mcp/tree/main/src/tools/utils/SubscanNetwork.ts)** for valid IDs. 
- `chainName`: he name of the Polkadot chain to query. If not provided, defaults to the chain ID.

Example query to Claude:

> "give me paseo network info"

### get_user_balance_polkadot

Gets the user's balance on the Polkadot network.

Parameters:

- `userAddress`: The Polkadot address to fetch the balance for.
- `chainId`: The ID of the Polkadot chain to query. Refer to the list in **[chainConfigs](https://github.com/dbooklabs/polkadot_mcp/tree/main/src/tools/utils/SubscanNetwork.ts)** for valid IDs. 
- `chainName`: he name of the Polkadot chain to query. If not provided, defaults to the chain ID.

Example query to Claude:

> "Whats my balance on the astar network?"

### build_transfer_transaction_polkadot

Builds a transfer transaction for a Polkadot network.

Parameters:

- `toAddress`: The recipient's Polkadot address.
- `amount`: The amount to transfer. Do not add planck suffix, it will be added automatically.
- `chainId`: The ID of the Polkadot chain to query. Refer to the list in **[chainConfigs](https://github.com/dbooklabs/polkadot_mcp/tree/main/src/tools/utils/SubscanNetwork.ts)** for valid IDs. 
- `chainName`: he name of the Polkadot chain to query. If not provided, defaults to the chain ID.

Example query to Claude:

> "Transfer 1 dot to 26aJsv3J1KsDGcC2nXmiXpuT4atahG1JHGLDvRffcFnYvGCV"

