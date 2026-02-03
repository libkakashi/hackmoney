#!/bin/bash

# Set your RPC URL: export TENDERLY_RPC_URL="https://rpc.tenderly.co/fork/YOUR_FORK_ID"
TENDERLY_RPC_URL="${TENDERLY_RPC_URL:-https://virtual.mainnet.eu.rpc.tenderly.co/7b79df7a-034a-4eeb-95a6-83366b9e398f}"
BLOCK_INTERVAL="${BLOCK_INTERVAL:-12}"

while true; do
    curl -s -X POST \
        -H "Content-Type: application/json" \
        --data '{
            "jsonrpc": "2.0",
            "method": "evm_increaseBlocks",
            "params": ["0x1"],
            "id": 1
        }' \
        "$TENDERLY_RPC_URL" > /dev/null
    
    echo "$(date '+%H:%M:%S') - Block mined"
    sleep "$BLOCK_INTERVAL"
done