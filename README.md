# PS04: HTTP 402 Payment Middleware for AI Agents

Pay-per-request API access for AI agents using HTTP 402 "Payment Required" and Algorand micro-payments. No signup, no API key, no credit card.

## How it works
1. Agent requests `/api/data`.
2. Server replies **402** with the price, the receiver address, and a unique nonce.
3. The agent's wallet signs a 0.001 ALGO payment with the nonce in the note field.
4. The agent retries with the signed payment in the `X-PAYMENT` header.
5. The server checks the receiver, amount and nonce, submits the payment to Algorand, and returns the data right away. Final confirmation happens in the background.

## Features
- 402 challenge with a unique nonce and a 60-second expiry
- Replay protection: each nonce works only once
- Optimistic verification: data is served in about 150 to 500 ms
- Open-source and runs on the free Algorand testnet

## Trade-off
The data is released before final blockchain confirmation (about 3 seconds). This is acceptable for sub-cent amounts. A failed payment is logged by the server.

## Setup
1. Install packages:

        npm install

2. Create a testnet wallet:

        node wallet.js

3. Copy the printed address into `PAY_TO` in `server.js`.
4. Fund the address at https://lora.algokit.io/testnet/fund
5. Create a file named `.env` and add this line (with your 25 words):

        MNEMONIC="your 25 words"

## Run
Terminal 1 (server):

    node server.js

Terminal 2 (agent):

    node agent.js

## Files
- `server.js`: the 402 middleware and verification
- `agent.js`: the agent with its micro-wallet
- `wallet.js`: creates a testnet wallet

## Note
Testnet only. Never commit your `.env` file or share your 25 words.