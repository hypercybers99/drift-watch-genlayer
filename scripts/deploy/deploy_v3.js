const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function decodeErrorPayload(receipt) {
  const payload = receipt.consensus_data?.leader_receipt?.[0]?.result?.payload;
  if (!payload) return "";
  try {
    return Buffer.from(payload, 'base64').toString('utf8');
  } catch (e) {
    return String(payload);
  }
}

function verifyReceiptSuccess(receipt, desc) {
  const statusOk = receipt.status_name === 'ACCEPTED' || receipt.status_name === 'FINALIZED';
  const resultOk = receipt.result_name === 'MAJORITY_AGREE';
  const leaderRes = receipt.consensus_data?.leader_receipt?.[0]?.execution_result;
  const leaderOk = leaderRes === 'SUCCESS';

  if (!statusOk || !resultOk || !leaderOk) {
    const errText = decodeErrorPayload(receipt);
    throw new Error(`Write transaction failed [${desc}]: status=${receipt.status_name}, result=${receipt.result_name}, leader=${leaderRes}, error=${errText}`);
  }
}

async function retryAsync(fn, retries = 5, delayMs = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1 || (e.message && e.message.includes('Write transaction failed'))) {
        throw e;
      }
      console.warn(`Transient RPC issue (${e.message.slice(0, 100)}). Retrying in ${delayMs / 1000}s (attempt ${i + 1}/${retries})...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

async function waitForReceiptWithRetry(client, txHash, retries = 120, interval = 3000) {
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      return await client.waitForTransactionReceipt({
        hash: txHash,
        retries: retries,
        interval: interval,
      });
    } catch (err) {
      const msg = err.message || "";
      if (attempt === 15 || (!msg.includes("<!DOCTYPE") && !msg.includes("JSON") && !msg.includes("timeout") && !msg.includes("fetch failed") && !msg.includes("Internal error") && !msg.includes("502") && !msg.includes("504") && !msg.includes("UnknownRpcError"))) {
        throw err;
      }
      console.warn(`Transient RPC error while waiting for receipt (${msg.slice(0, 100)}...). Retrying receipt poll in 4s (attempt ${attempt}/15)...`);
      await new Promise(r => setTimeout(r, 4000));
    }
  }
}

async function main() {
  console.log("=================================================");
  console.log("DRIFT WATCH: V3 LIVE DEPLOYMENT ON STUDIONET");
  console.log("=================================================");

  const evidenceDir = path.join(__dirname, '../../docs/evidence_v3/source');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

  const envPath = path.join(__dirname, '../../.env');
  let privateKey = null;
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const m = envContent.match(/THROWAWAY_PRIVATE_KEY=([0-9a-fA-Fx]+)/);
    if (m) privateKey = m[1].trim();
  }
  if (!privateKey) {
    const { generatePrivateKey } = require('viem/accounts');
    privateKey = generatePrivateKey();
    fs.appendFileSync(envPath, `THROWAWAY_PRIVATE_KEY=${privateKey}\n`);
  }

  const account = createAccount(privateKey);
  console.log("Using throwaway account:", account.address);

  const client = createClient({
    chain: chains.studionet,
    account: account,
  });

  // Read contract source codes
  const watchPath = path.join(__dirname, '../../contracts/DriftWatch.py');
  const watchCode = fs.readFileSync(watchPath, 'utf8');
  const watchSha = crypto.createHash('sha256').update(watchCode, 'utf8').digest('hex');

  const guardPath = path.join(__dirname, '../../contracts/DriftGuard.py');
  const guardCode = fs.readFileSync(guardPath, 'utf8');
  const guardSha = crypto.createHash('sha256').update(guardCode, 'utf8').digest('hex');

  console.log("DriftWatch local SHA-256:", watchSha);
  console.log("DriftGuard local SHA-256:", guardSha);

  // Save source files to evidence
  fs.writeFileSync(path.join(evidenceDir, 'DriftWatch_v3.py'), watchCode, 'utf8');
  fs.writeFileSync(path.join(evidenceDir, 'DriftGuard_v3.py'), guardCode, 'utf8');

  // Step 1: Deploy DriftWatch V3
  console.log("\n>>> Deploying DriftWatch V3 Contract...");
  const t0Watch = Date.now();
  const watchDeployTx = await retryAsync(() => client.deployContract({
    code: watchCode,
    args: [],
  }));
  console.log("DriftWatch V3 deploy tx:", watchDeployTx);

  const watchDeployReceipt = await waitForReceiptWithRetry(client, watchDeployTx, 120, 3000);
  const watchElapsed = ((Date.now() - t0Watch) / 1000).toFixed(2);
  verifyReceiptSuccess(watchDeployReceipt, "Deploy DriftWatch V3");
  const watchAddress = watchDeployReceipt.recipient;
  console.log(`DriftWatch V3 deployed at: ${watchAddress} in ${watchElapsed}s`);

  fs.writeFileSync(
    path.join(evidenceDir, 'deploy_DriftWatch_v3_receipt.json'),
    JSON.stringify(watchDeployReceipt, null, 2)
  );

  // Step 2: Deploy DriftGuard V3
  console.log("\n>>> Deploying DriftGuard V3 Contract...");
  const t0Guard = Date.now();
  const guardDeployTx = await retryAsync(() => client.deployContract({
    code: guardCode,
    args: [watchAddress],
  }));
  console.log("DriftGuard V3 deploy tx:", guardDeployTx);

  const guardDeployReceipt = await waitForReceiptWithRetry(client, guardDeployTx, 120, 3000);
  const guardElapsed = ((Date.now() - t0Guard) / 1000).toFixed(2);
  verifyReceiptSuccess(guardDeployReceipt, "Deploy DriftGuard V3");
  const guardAddress = guardDeployReceipt.recipient;
  console.log(`DriftGuard V3 deployed at: ${guardAddress} in ${guardElapsed}s`);

  fs.writeFileSync(
    path.join(evidenceDir, 'deploy_DriftGuard_v3_receipt.json'),
    JSON.stringify(guardDeployReceipt, null, 2)
  );

  const deployedAt = new Date().toISOString();

  // Read existing deployments to move Iteration 1 to superseded
  const depPath = path.join(__dirname, 'deployments.json');
  const existingDep = JSON.parse(fs.readFileSync(depPath, 'utf8'));

  const newSuper = existingDep.superseded || [];
  newSuper.unshift({
    driftWatch: existingDep.driftWatch,
    driftGuard: existingDep.driftGuard,
    deployedAt: existingDep.deployedAt,
    status: "superseded",
    reason: "Portal steward rejection: consensus prefix verification blind spots. Validators verified only the verdict and 16-hex prefix, trusting leader full hashes and clause snapshots. Superseded by V3 full validator state binding.",
  });

  const newDep = {
    network: "studionet",
    chainId: 61999,
    rpc: "https://studio.genlayer.com/api",
    explorerBase: "https://explorer-studio.genlayer.com/address",
    driftWatch: {
      address: watchAddress,
      deployTxHash: watchDeployTx,
      sha256: watchSha,
      explorer: `https://explorer-studio.genlayer.com/address/${watchAddress}`,
    },
    driftGuard: {
      address: guardAddress,
      deployTxHash: guardDeployTx,
      sha256: guardSha,
      explorer: `https://explorer-studio.genlayer.com/address/${guardAddress}`,
    },
    deployedAt: deployedAt,
    superseded: newSuper,
  };

  fs.writeFileSync(depPath, JSON.stringify(newDep, null, 2) + '\n');
  console.log("\nUpdated scripts/deploy/deployments.json successfully.");

  // Update docs/ADDRESS_REGISTRY.md
  const registryContent = `# Address Registry

All contracts are deployed on GenLayer Studionet (Chain ID 61999).
Status is Preview.

---

## Active Deployment (V3 - Full Validator State Binding)

*Deployed in response to Portal steward rejection: validators independently recompute and bind every state-bearing hash and clause snapshot.*

- **DriftWatch V3**:
  - Address: \`${watchAddress}\`
  - Deploy Tx: \`${watchDeployTx}\`
  - Source SHA-256: \`${watchSha}\`
  - Explorer: [${watchAddress}](https://explorer-studio.genlayer.com/address/${watchAddress})
- **DriftGuard V3**:
  - Address: \`${guardAddress}\`
  - Deploy Tx: \`${guardDeployTx}\`
  - Source SHA-256: \`${guardSha}\`
  - Explorer: [${guardAddress}](https://explorer-studio.genlayer.com/address/${guardAddress})
- **Deployed At**: \`${deployedAt}\`
- **Status**: Active (Preview)

---

## Superseded Deployments

### Iteration 1 (Superseded by V3)
- **DriftWatch**:
  - Address: \`0xe8A159D3622D33aA0B62da57aF033F2C6D9fdEfD\`
  - Deploy Tx: \`0xbcc2b725f32f79d8477db824bed444e53fb7ff6ef6e08d6ebaa72537e49f8f39\`
  - Source SHA-256: \`2dcd113b3811f7041495878fb0e072020ca366afbe7d35740902080db057ca3e\`
  - Explorer: [0xe8A159D3622D33aA0B62da57aF033F2C6D9fdEfD](https://explorer-studio.genlayer.com/address/0xe8A159D3622D33aA0B62da57aF033F2C6D9fdEfD)
- **DriftGuard**:
  - Address: \`0x0f336D97134D9770aBFA20d3B2Ad5B9f7D4BC557\`
  - Deploy Tx: \`0x9f3428148b3f7047d912903a7469acdd4318c07e225bb43621a30e952a2f9c6f\`
  - Source SHA-256: \`eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc\`
  - Explorer: [0x0f336D97134D9770aBFA20d3B2Ad5B9f7D4BC557](https://explorer-studio.genlayer.com/address/0x0f336D97134D9770aBFA20d3B2Ad5B9f7D4BC557)
- **Deployed At**: \`2026-10-17T06:52:41.552Z\`
- **Status**: Superseded
- **Reason**: Portal steward rejection: consensus prefix verification blind spots. Validators verified only the verdict and 16-hex prefix, trusting leader full hashes and clause snapshots. Superseded by V3 full validator state binding.

### Iteration 0 (Superseded by Iteration 1)
- **DriftWatch**:
  - Address: \`0x7Ce13F5696f3A81AB5782BC203158691c0D742Cf\`
  - Deploy Tx: \`0xe5eeb4ba21fd7370f3ddd789dce5bcbb382d618abd1ab7f8f2e44102187713e8\`
  - Source SHA-256: \`9d80f1bc271116dae1b29cbf34f823f104d5fca94f6e012140b2686a32fe8e50\`
  - Explorer: [0x7Ce13F5696f3A81AB5782BC203158691c0D742Cf](https://explorer-studio.genlayer.com/address/0x7Ce13F5696f3A81AB5782BC203158691c0D742Cf)
- **DriftGuard**:
  - Address: \`0x02167c91C7054F7503Ea38200eD293003A8E9e4F\`
  - Deploy Tx: \`0xef8092b855239516c1a3a4b2e85c70733ff5c2245484c1631ae9335db633b4b9\`
  - Source SHA-256: \`eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc\`
  - Explorer: [0x02167c91C7054F7503Ea38200eD293003A8E9e4F](https://explorer-studio.genlayer.com/address/0x02167c91C7054F7503Ea38200eD293003A8E9e4F)
- **Deployed At**: \`2026-10-17T02:25:54.720Z\`
- **Status**: Superseded
- **Reason**: Prompt enhanced in Iteration 1 to strictly enforce flat string arrays for LLM labels.
`;

  fs.writeFileSync(path.join(__dirname, '../../docs/ADDRESS_REGISTRY.md'), registryContent, 'utf8');
  console.log("Updated docs/ADDRESS_REGISTRY.md successfully.");
  console.log("\nDEPLOYMENT COMPLETE.");
}

main().catch(err => {
  console.error("FATAL ERROR in deploy_v3:", err);
  process.exit(1);
});
