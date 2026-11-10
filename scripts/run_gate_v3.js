const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient, chains, createAccount } = require('genlayer-js');

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

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function retryWithBackoff(fn, desc, maxRetries = 10) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e.message || String(e);
      let waitSeconds = 7;
      if (e.cause?.data?.retry_after_seconds) {
        waitSeconds = e.cause.data.retry_after_seconds + 2;
      } else if (msg.includes('Rate limit exceeded') || msg.includes('429')) {
        waitSeconds = 15;
      }
      console.warn(`  [${desc}] Attempt ${attempt}/${maxRetries} failed: ${msg.slice(0, 90)}. Backing off for ${waitSeconds}s...`);
      if (attempt === maxRetries) throw e;
      await sleep(waitSeconds * 1000);
    }
  }
}

async function waitForReceiptCustom(client, txHash) {
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      return await client.waitForTransactionReceipt({
        hash: txHash,
        retries: 150,
        interval: 3500,
      });
    } catch (e) {
      const msg = e.message || String(e);
      let waitSec = 7;
      if (e.cause?.data?.retry_after_seconds) {
        waitSec = e.cause.data.retry_after_seconds + 2;
      }
      if (attempt === 20) throw e;
      console.warn(`  [Receipt] Polling issue: ${msg.slice(0, 80)}. Waiting ${waitSec}s...`);
      await sleep(waitSec * 1000);
    }
  }
}

async function main() {
  console.log("==================================================================");
  console.log("DRIFT WATCH V3: AVAILABILITY GATE EXECUTION (30 RUNS ON STUDIONET)");
  console.log("==================================================================");

  const gateDir = path.join(__dirname, '../docs/evidence_v3/gate');
  if (!fs.existsSync(gateDir)) fs.mkdirSync(gateDir, { recursive: true });

  // Read deployments.json
  const depPath = path.join(__dirname, 'deploy/deployments.json');
  const dep = JSON.parse(fs.readFileSync(depPath, 'utf8'));
  const watchAddress = dep.driftWatch.address;
  console.log("Target DriftWatch V3 Address:", watchAddress);

  // Setup account & client
  const envPath = path.join(__dirname, '../.env');
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
  console.log("Throwaway wallet:", account.address);

  const client = createClient({
    chain: chains.studionet,
    account: account,
  });

  const commitSha = "c8ff0f0cf8b5e406a44baad04867cb793c52d328";
  const baseUrl = `https://raw.githubusercontent.com/hypercybers99/drift-watch-fixtures/${commitSha}`;
  const v0Url = `${baseUrl}/terms-v0.md`;

  const redlinesPath = path.join(__dirname, '../fixtures/redlines.json');
  const redlinesJson = fs.readFileSync(redlinesPath, 'utf8').trim();

  const gatePlan = [
    {
      fixtureKey: 'MATERIAL',
      fileName: 'terms-v2-subtle.md',
      url: `${baseUrl}/terms-v2-subtle.md`,
      expectedVerdict: 'MATERIAL',
      targetRuns: 10,
    },
    {
      fixtureKey: 'MINOR',
      fileName: 'terms-v6-salami1.md',
      url: `${baseUrl}/terms-v6-salami1.md`,
      expectedVerdict: 'MINOR',
      targetRuns: 10,
    },
    {
      fixtureKey: 'COSMETIC',
      fileName: 'terms-v1-cosmetic.html',
      url: `${baseUrl}/terms-v1-cosmetic.html`,
      expectedVerdict: 'COSMETIC',
      targetRuns: 10,
    },
  ];

  const totalRuns = gatePlan.reduce((acc, p) => acc + p.targetRuns, 0);
  console.log(`Planned Availability Gate Runs: ${totalRuns} total (10 per fixture)\n`);

  let runCounter = 0;
  const gateResults = [];

  for (const item of gatePlan) {
    console.log(`==================================================================`);
    console.log(`STARTING FIXTURE ${item.fixtureKey} (${item.fileName}): ${item.targetRuns} RUNS`);
    console.log(`Expected Verdict: ${item.expectedVerdict}`);
    console.log(`==================================================================`);

    for (let r = 1; r <= item.targetRuns; r++) {
      runCounter++;
      const runKey = `gate_${item.fixtureKey.toLowerCase()}_run${r}`;
      console.log(`\n[${runCounter}/${totalRuns}] Executing ${runKey}...`);

      const receiptFile = path.join(gateDir, `${runKey}_receipt.json`);
      const txtFile = path.join(gateDir, `${runKey}.txt`);
      if (fs.existsSync(receiptFile) && fs.existsSync(txtFile)) {
        console.log(`  [SKIP] ${runKey} already completed. Loading saved receipt...`);
        const savedReceipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
        const savedTxt = fs.readFileSync(txtFile, 'utf8');
        const verdictMatch = savedTxt.match(/Evaluated Verdict:\s*([A-Z]+)/);
        const modelMatch = savedTxt.match(/Leader Model:\s*([^\n]+)/);
        const elapsedMatch = savedTxt.match(/Elapsed:\s*([^\n]+)/);
        const txHashMatch = savedTxt.match(/Tx Hash:\s*([0-9a-fA-Fx]+)/);
        const chkMatch = savedTxt.match(/--- CHECK RECORD ---\s*\n([\s\S]+)$/);
        let chk = {};
        if (chkMatch) {
          try { chk = JSON.parse(chkMatch[1]); } catch(e) {}
        }
        const evaluatedVerdict = verdictMatch ? verdictMatch[1] : (chk.verdict || "UNKNOWN");
        const leaderModel = modelMatch ? modelMatch[1].trim() : "unknown";
        const txHash = txHashMatch ? txHashMatch[1] : (savedReceipt.transaction_hash || "");
        const elapsedVal = elapsedMatch && !elapsedMatch[1].includes("not measured") ? parseFloat(elapsedMatch[1].replace("s", "")) : "not measured";

        gateResults.push({
          fixture: item.fixtureKey,
          fileName: item.fileName,
          run: r,
          runKey,
          txHash: txHash,
          elapsed: elapsedVal,
          status: savedReceipt.status_name,
          result: savedReceipt.result_name,
          leaderModel,
          verdict: evaluatedVerdict,
          expectedVerdict: item.expectedVerdict,
          matches: evaluatedVerdict === item.expectedVerdict,
          labels: chk.change_labels || [],
          redlines: chk.redline_flags || [],
          gate: chk.gate || "",
        });
        continue;
      }

      // 1. Create watch
      console.log(`  Step 1: create_watch (name: Gate ${item.fixtureKey} #${r})...`);
      const createTx = await retryWithBackoff(
        () => client.writeContract({
          address: watchAddress,
          functionName: 'create_watch',
          args: [`Gate ${item.fixtureKey} #${r}`, v0Url, redlinesJson],
        }),
        `create_watch ${runKey}`
      );
      const createReceipt = await waitForReceiptCustom(client, createTx);
      verifyReceiptSuccess(createReceipt, `create_watch ${runKey}`);
      await sleep(7500);

      // Get watch ID
      const statusList = await retryWithBackoff(
        () => client.readContract({
          address: watchAddress,
          functionName: 'list_watches_by_owner',
          args: [account.address, 1],
        }),
        `list_watches_by_owner ${runKey}`
      );
      const latestWatch = JSON.parse(statusList[0]);
      const wid = latestWatch.id;
      console.log(`  Watch created with ID: ${wid}`);

      // 2. Set baseline
      console.log(`  Step 2: set_baseline (wid: ${wid})...`);
      const baseTx = await retryWithBackoff(
        () => client.writeContract({
          address: watchAddress,
          functionName: 'set_baseline',
          args: [wid],
        }),
        `set_baseline ${runKey}`
      );
      const baseReceipt = await waitForReceiptCustom(client, baseTx);
      verifyReceiptSuccess(baseReceipt, `set_baseline ${runKey}`);
      await sleep(7500);

      // 3. Update source to fixture URL
      console.log(`  Step 3: update_source to ${item.fileName}...`);
      const updateTx = await retryWithBackoff(
        () => client.writeContract({
          address: watchAddress,
          functionName: 'update_source',
          args: [wid, item.url],
        }),
        `update_source ${runKey}`
      );
      const updateReceipt = await waitForReceiptCustom(client, updateTx);
      verifyReceiptSuccess(updateReceipt, `update_source ${runKey}`);
      await sleep(7500);

      // 4. Check (the core evaluated transaction)
      console.log(`  Step 4: check (wid: ${wid})...`);
      const t0Check = Date.now();
      const checkTx = await retryWithBackoff(
        () => client.writeContract({
          address: watchAddress,
          functionName: 'check',
          args: [wid],
        }),
        `check ${runKey}`
      );
      console.log(`  Check txHash: ${checkTx}`);

      const checkReceipt = await waitForReceiptCustom(client, checkTx);
      const elapsed = ((Date.now() - t0Check) / 1000).toFixed(2);
      verifyReceiptSuccess(checkReceipt, `check ${runKey}`);

      const leaderModel = checkReceipt.consensus_data?.leader_receipt?.[0]?.node_config?.primary_model?.model || 'unknown';

      // Read check record from storage
      await sleep(2000);
      const checkRecordStr = await retryWithBackoff(
        () => client.readContract({
          address: watchAddress,
          functionName: 'latest_check',
          args: [wid],
        }),
        `latest_check ${runKey}`
      );
      const chk = JSON.parse(checkRecordStr);
      const evaluatedVerdict = chk.verdict;
      console.log(`  Check complete in ${elapsed}s: verdict=${evaluatedVerdict} (expected=${item.expectedVerdict})`);
      console.log(`  Leader Model: ${leaderModel}`);
      console.log(`  Labels: ${JSON.stringify(chk.change_labels)}, Redlines: ${JSON.stringify(chk.redline_flags)}, Gate: ${chk.gate || 'none'}`);

      // Save raw receipt JSON
      fs.writeFileSync(receiptFile, JSON.stringify(checkReceipt, null, 2), 'utf8');

      // Save raw text summary
      const txtContent = [
        `Fixture: ${item.fixtureKey} (${item.fileName})`,
        `Run: ${r}`,
        `Watch ID: ${wid}`,
        `Tx Hash: ${checkTx}`,
        `Elapsed: ${elapsed}s`,
        `Receipt Status: ${checkReceipt.status_name} / ${checkReceipt.result_name}`,
        `Leader Result: ${checkReceipt.consensus_data?.leader_receipt?.[0]?.execution_result}`,
        `Leader Model: ${leaderModel}`,
        `Evaluated Verdict: ${evaluatedVerdict}`,
        `Expected Verdict: ${item.expectedVerdict}`,
        `Verdict Matches Expected: ${evaluatedVerdict === item.expectedVerdict}`,
        `Gate: ${chk.gate || 'none'}`,
        `Tripwire: ${chk.tripwire}`,
        `Norm Hash: ${chk.norm_hash}`,
        `Parsed Changes: ${JSON.stringify(chk.change_labels)}`,
        `Parsed Redlines: ${JSON.stringify(chk.redline_flags)}`,
        `\n--- CHECK RECORD ---`,
        JSON.stringify(chk, null, 2),
      ].join('\n');
      fs.writeFileSync(path.join(gateDir, `${runKey}.txt`), txtContent, 'utf8');

      gateResults.push({
        fixture: item.fixtureKey,
        fileName: item.fileName,
        run: r,
        runKey,
        txHash: checkTx,
        elapsed: parseFloat(elapsed),
        status: checkReceipt.status_name,
        result: checkReceipt.result_name,
        leaderModel,
        verdict: evaluatedVerdict,
        expectedVerdict: item.expectedVerdict,
        matches: evaluatedVerdict === item.expectedVerdict,
        labels: chk.change_labels,
        redlines: chk.redline_flags,
        gate: chk.gate,
      });

      // Spacing between iterations
      await sleep(7500);
    }
  }

  // Save overall gate results
  fs.writeFileSync(
    path.join(gateDir, 'availability_gate_summary.json'),
    JSON.stringify(gateResults, null, 2),
    'utf8'
  );

  console.log("\n==================================================================");
  console.log("AVAILABILITY GATE EXECUTION FINISHED");
  console.log("==================================================================");
}

main().catch(err => {
  console.error("FATAL ERROR in run_gate_v3:", err);
  process.exit(1);
});
