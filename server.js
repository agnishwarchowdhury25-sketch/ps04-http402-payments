import express from "express";
import { randomUUID } from "crypto";
import algosdk from "algosdk";

const app = express();
const algod = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");

const PAY_TO = "5Y7JS3CHTZ6CIPQILJQZG24IZHELWTX4C4RLPSXGOOKZQPS3Q3HAOEAZ6I";
const PRICE = 1000; // microAlgos (0.001 ALGO)

// Challenges we have issued: nonce -> expiry time
const challenges = new Map();

app.get("/api/data", async (req, res) => {
  const proof = req.header("X-PAYMENT");

  // 1. No proof: send the 402 challenge
  if (!proof) {
    const nonce = randomUUID();
    challenges.set(nonce, Date.now() + 60000); // valid for 60 seconds
    return res.status(402).json({
      message: "Payment Required",
      amount: PRICE,
      payTo: PAY_TO,
      nonce,
    });
  }

  try {
    // 2. Unpack the proof
    const { txn: txnB64, nonce } = JSON.parse(
      Buffer.from(proof, "base64").toString()
    );

    // 3. Was this nonce issued by us, and is it still valid?
    const expires = challenges.get(nonce);
    if (!expires || Date.now() > expires) {
      return res.status(402).json({ error: "Unknown or expired nonce" });
    }

    // 4. Read the signed transaction
    const signedBytes = Buffer.from(txnB64, "base64");
    const t = algosdk.decodeSignedTransaction(signedBytes).txn;

    const receiver = t.payment.receiver.toString();
    const amount = Number(t.payment.amount);
    const note = Buffer.from(t.note).toString();

    // 5. Check receiver, amount and nonce
    if (receiver !== PAY_TO || amount < PRICE || note !== nonce) {
      return res.status(402).json({ error: "Invalid payment" });
    }

    // 6. Use up the nonce so it can't be reused
    challenges.delete(nonce);

        // 7. Submit the payment (the node checks signature and balance now)
    const { txid } = await algod.sendRawTransaction(signedBytes).do();

    // 8. Give the data immediately
    res.json({
      secret: "Here is your paid data!",
      txid,
      status: "accepted, confirming in background",
    });

    // 9. Confirm in the background (the user doesn't wait for this)
    algosdk
      .waitForConfirmation(algod, txid, 4)
      .then(() => console.log("Confirmed on chain:", txid))
      .catch((e) => console.log("Payment failed:", txid, e.message));
  } catch (err) {
    res.status(402).json({ error: "Invalid payment", detail: err.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));