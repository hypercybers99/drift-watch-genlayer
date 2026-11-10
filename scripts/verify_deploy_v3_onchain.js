const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function rpcCall(method, params) {
  const res = await fetch("https://studio.genlayer.com/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result;
}

async function verifyContract(name, deployTx, localFilePath) {
  const localCode = fs.readFileSync(localFilePath, 'utf8');
  const localSha = crypto.createHash('sha256').update(localCode).digest('hex');

  const txData = await rpcCall("eth_getTransactionByHash", [deployTx]);
  if (!txData || !txData.data || !txData.data.contract_code) {
    throw new Error(`contract_code not found in tx ${deployTx}`);
  }

  const rawCode = Buffer.from(txData.data.contract_code, 'base64').toString('utf8');
  const chainSha = crypto.createHash('sha256').update(rawCode).digest('hex');

  const match = (localSha === chainSha);
  console.log(`Contract: ${name}`);
  console.log(`Deploy Tx: ${deployTx}`);
  console.log(`Local SHA-256: ${localSha}`);
  console.log(`Chain SHA-256: ${chainSha}`);
  console.log(`Match: ${match ? "EXACT MATCH (0 diff)" : "MISMATCH"}`);

  return {
    contract: name,
    deployTxHash: deployTx,
    rpcMethod: "eth_getTransactionByHash",
    rpcField: "result.data.contract_code",
    localSha256: localSha,
    chainSha256: chainSha,
    byteForByteMatch: match,
    sourceBytesLength: Buffer.byteLength(rawCode, 'utf8'),
    diffOutput: match ? "0 diff (byte-for-byte identical)" : "diff detected",
    verifiedAt: new Date().toISOString(),
  };
}

async function main() {
  const watchTx = "0xacbacb426db5a42176c98fce599902f6f320882d994a028975e7b1999d5cb1c7";
  const guardTx = "0xbcbc3aab69f50dc5a1af97daed026fb9eb5da5ceec8533bb8f7a78eddfa8960b";

  const watchResult = await verifyContract(
    "DriftWatch",
    watchTx,
    path.join(__dirname, "../contracts/DriftWatch.py")
  );
  const guardResult = await verifyContract(
    "DriftGuard",
    guardTx,
    path.join(__dirname, "../contracts/DriftGuard.py")
  );

  const out = {
    driftWatch: watchResult,
    driftGuard: guardResult,
  };

  fs.writeFileSync(
    path.join(__dirname, "deploy/verification_result_v3.json"),
    JSON.stringify(out, null, 2)
  );
  console.log("\nSaved scripts/deploy/verification_result_v3.json");
}

main().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
