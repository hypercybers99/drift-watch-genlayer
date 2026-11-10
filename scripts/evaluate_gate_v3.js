const fs = require('fs');
const path = require('path');

function evaluateGate() {
  const gateDir = path.join(__dirname, '../docs/evidence_v3/gate');
  const summaryPath = path.join(gateDir, 'availability_gate_summary.json');

  if (!fs.existsSync(summaryPath)) {
    console.error("Error: availability_gate_summary.json does not exist. Run run_gate_v3.js first.");
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

  const fixtures = ['MATERIAL', 'MINOR', 'COSMETIC'];
  const report = {};

  let allPassed = true;

  console.log("==================================================================");
  console.log("DRIFT WATCH V3: AVAILABILITY GATE EVALUATION REPORT");
  console.log("==================================================================\n");

  for (const fix of fixtures) {
    const fixRuns = results.filter(r => r.fixture === fix);
    const totalRuns = fixRuns.length;
    const successfulRuns = fixRuns.filter(r => (r.status === 'ACCEPTED' || r.status === 'FINALIZED') && r.result === 'MAJORITY_AGREE');
    const expectedVerdict = fixRuns[0]?.expectedVerdict || fix;
    const matchingVerdictRuns = successfulRuns.filter(r => r.verdict === expectedVerdict);

    // Label vector identity (how many runs share the modal change_labels & redline_flags vector)
    const vectorCounts = {};
    for (const r of successfulRuns) {
      const vecKey = `${JSON.stringify(r.labels)}|${JSON.stringify(r.redlines)}`;
      vectorCounts[vecKey] = (vectorCounts[vecKey] || 0) + 1;
    }
    const maxVectorCount = Object.values(vectorCounts).reduce((max, c) => Math.max(max, c), 0);

    const successRate = totalRuns > 0 ? (successfulRuns.length / totalRuns) * 100 : 0;
    const verdictIdentityRate = successfulRuns.length > 0 ? (matchingVerdictRuns.length / successfulRuns.length) * 100 : 0;
    const vectorIdentityRate = successfulRuns.length > 0 ? (maxVectorCount / successfulRuns.length) * 100 : 0;

    const successPass = successfulRuns.length >= 9;
    const verdictPass = matchingVerdictRuns.length >= 9;
    const fixPass = successPass && verdictPass;

    if (!fixPass) allPassed = false;

    report[fix] = {
      totalRuns,
      successCount: successfulRuns.length,
      successRate: `${successRate.toFixed(1)}%`,
      successPass,
      expectedVerdict,
      matchingVerdictCount: matchingVerdictRuns.length,
      verdictIdentityRate: `${verdictIdentityRate.toFixed(1)}%`,
      verdictPass,
      modalVectorCount: maxVectorCount,
      vectorIdentityRate: `${vectorIdentityRate.toFixed(1)}%`,
      passed: fixPass,
    };

    console.log(`------------------------------------------------------------------`);
    console.log(`FIXTURE: ${fix} (${fixRuns[0]?.fileName || ''})`);
    console.log(`  Total check runs:         ${totalRuns}`);
    console.log(`  Successful check runs:    ${successfulRuns.length}/${totalRuns} (${successRate.toFixed(1)}%) -> ${successPass ? 'PASSED (>= 9/10)' : 'FAILED (< 9/10)'}`);
    console.log(`  Expected Verdict:         ${expectedVerdict}`);
    console.log(`  Matching Verdicts:        ${matchingVerdictRuns.length}/${successfulRuns.length} (${verdictIdentityRate.toFixed(1)}%) -> ${verdictPass ? 'PASSED (>= 9/10)' : 'FAILED (< 9/10)'}`);
    console.log(`  Modal Label Vector Count: ${maxVectorCount}/${successfulRuns.length} (${vectorIdentityRate.toFixed(1)}%) (informational)`);
    console.log(`  Fixture Result:           ${fixPass ? 'GATE PASS' : 'GATE FAIL'}`);
    console.log(`  Individual Run Verdicts:  [${fixRuns.map(r => r.verdict).join(', ')}]`);
  }

  console.log("\n==================================================================");
  console.log(`OVERALL AVAILABILITY GATE VERDICT: ${allPassed ? 'PASSED' : 'FAILED'}`);
  console.log("==================================================================");

  // Write evaluation report markdown
  const mdLines = [
    `# Availability Gate Evaluation (V3)`,
    ``,
    `Evaluated strictly according to pre-registered rules in \`docs/REVIEW_V3_PLAN.md\` section 6.`,
    `Network: GenLayer Studionet (Chain ID 61999).`,
    `Thresholds: >= 9/10 transaction successes, >= 9/10 identical verdicts per fixture.`,
    ``,
    `| Fixture | Expected Verdict | Successful Runs | Success Rate | Identical Verdicts | Verdict Identity Rate | Label Vector Modal Count | Gate Decision |`,
    `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`,
  ];

  for (const fix of fixtures) {
    const r = report[fix];
    mdLines.push(`| **${fix}** | \`${r.expectedVerdict}\` | ${r.successCount}/${r.totalRuns} | ${r.successRate} | ${r.matchingVerdictCount}/${r.successCount} | ${r.verdictIdentityRate} | ${r.modalVectorCount}/${r.successCount} (${r.vectorIdentityRate}) | **${r.passed ? 'PASSED' : 'FAILED'}** |`);
  }

  mdLines.push(``);
  mdLines.push(`### Run-by-Run Breakdown`);
  mdLines.push(``);
  mdLines.push(`| Fixture | Run | Tx Hash | Elapsed (s) | Status | Leader Model | Evaluated Verdict | Matches Expected |`);
  mdLines.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);

  for (const r of results) {
    mdLines.push(`| ${r.fixture} | ${r.run} | \`${r.txHash}\` | ${r.elapsed} | \`${r.status}\` | \`${r.leaderModel}\` | \`${r.verdict}\` | ${r.matches ? 'Yes' : 'No'} |`);
  }

  mdLines.push(``);
  mdLines.push(`**Gate Decision:** ${allPassed ? 'ADOPT V3 (Gate passed across all 3 fixtures)' : 'STOP (Gate criteria not met)'}`);
  mdLines.push(``);

  fs.writeFileSync(path.join(gateDir, 'GATE_EVALUATION.md'), mdLines.join('\n'), 'utf8');

  if (!allPassed) {
    console.error("\nSTOP: Pre-registered Availability Gate threshold was not met. V3 cannot be adopted.");
    process.exit(1);
  }
}

evaluateGate();
