import "dotenv/config";
import algosdk from "algosdk";

// Paste your 25 words between the quotes (testnet wallet only)
const MNEMONIC = process.env.MNEMONIC;

const account = algosdk.mnemonicToSecretKey(MNEMONIC);
const algod = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");
const url = "http://localhost:3000/api/data";
const params = await algod.getTransactionParams().do();
async function main() {
    const start = Date.now();
  // 1. Ask for the data
  let res = await fetch(url);

  if (res.status !== 402) {
    console.log("No payment needed:", await res.json());
    return;
  }

  // 2. Read the 402 challenge
  const challenge = await res.json();
  console.log("Server says: pay", challenge.amount, "microAlgos to", challenge.payTo);

  // 3. Build and sign the payment
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: account.addr,
    receiver: challenge.payTo,
    amount: challenge.amount,
    note: new TextEncoder().encode(challenge.nonce),
    suggestedParams: params,
  });
  const signed = txn.signTxn(account.sk);

  // 4. Package the proof
  const proof = Buffer.from(
    JSON.stringify({
      txn: Buffer.from(signed).toString("base64"),
      nonce: challenge.nonce,
    })
  ).toString("base64");

  // 5. Ask again with the proof
   const payStart = Date.now();
  res = await fetch(url, { headers: { "X-PAYMENT": proof } });
  console.log("Verification time:", Date.now() - payStart, "ms");
  console.log("Result:", res.status, await res.json());
   console.log("Total time:", Date.now() - start, "ms");
   // Replay attack test: send the same proof again
  const replay = await fetch(url, { headers: { "X-PAYMENT": proof } });
  console.log("Replay attempt:", replay.status, await replay.json());
}

main();