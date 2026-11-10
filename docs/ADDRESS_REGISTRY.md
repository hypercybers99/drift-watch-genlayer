# Address Registry

All contracts are deployed on GenLayer Studionet (Chain ID 61999).
Status is Preview.

---

## Active Deployment (V3 - Full Validator State Binding)

*Deployed in response to Portal steward rejection: validators independently recompute and bind every state-bearing hash and clause snapshot.*

- **DriftWatch V3**:
  - Address: `0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85`
  - Deploy Tx: `0xacbacb426db5a42176c98fce599902f6f320882d994a028975e7b1999d5cb1c7`
  - Source SHA-256: `2a2d3ebde7563ba146de73ead1cbdc3b0b52e82cfc60eddce3a595a5ea4c428c`
  - Explorer: [0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85](https://explorer-studio.genlayer.com/address/0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85)
- **DriftGuard V3**:
  - Address: `0x4D2123ac8Ceb59967B2009ab7A261C290348abC4`
  - Deploy Tx: `0xbcbc3aab69f50dc5a1af97daed026fb9eb5da5ceec8533bb8f7a78eddfa8960b`
  - Source SHA-256: `eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc`
  - Explorer: [0x4D2123ac8Ceb59967B2009ab7A261C290348abC4](https://explorer-studio.genlayer.com/address/0x4D2123ac8Ceb59967B2009ab7A261C290348abC4)
- **Deployed At**: `2026-11-10T04:04:44.802Z`
- **Status**: Active (Preview)

---

## Superseded Deployments

### Iteration 1 (Superseded by V3)
- **DriftWatch**:
  - Address: `0xe8A159D3622D33aA0B62da57aF033F2C6D9fdEfD`
  - Deploy Tx: `0xbcc2b725f32f79d8477db824bed444e53fb7ff6ef6e08d6ebaa72537e49f8f39`
  - Source SHA-256: `2dcd113b3811f7041495878fb0e072020ca366afbe7d35740902080db057ca3e`
  - Explorer: [0xe8A159D3622D33aA0B62da57aF033F2C6D9fdEfD](https://explorer-studio.genlayer.com/address/0xe8A159D3622D33aA0B62da57aF033F2C6D9fdEfD)
- **DriftGuard**:
  - Address: `0x0f336D97134D9770aBFA20d3B2Ad5B9f7D4BC557`
  - Deploy Tx: `0x9f3428148b3f7047d912903a7469acdd4318c07e225bb43621a30e952a2f9c6f`
  - Source SHA-256: `eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc`
  - Explorer: [0x0f336D97134D9770aBFA20d3B2Ad5B9f7D4BC557](https://explorer-studio.genlayer.com/address/0x0f336D97134D9770aBFA20d3B2Ad5B9f7D4BC557)
- **Deployed At**: `2026-10-17T06:52:41.552Z`
- **Status**: Superseded
- **Reason**: Portal steward rejection: consensus prefix verification blind spots. Validators verified only the verdict and 16-hex prefix, trusting leader full hashes and clause snapshots. Superseded by V3 full validator state binding.

### Iteration 0 (Superseded by Iteration 1)
- **DriftWatch**:
  - Address: `0x7Ce13F5696f3A81AB5782BC203158691c0D742Cf`
  - Deploy Tx: `0xe5eeb4ba21fd7370f3ddd789dce5bcbb382d618abd1ab7f8f2e44102187713e8`
  - Source SHA-256: `9d80f1bc271116dae1b29cbf34f823f104d5fca94f6e012140b2686a32fe8e50`
  - Explorer: [0x7Ce13F5696f3A81AB5782BC203158691c0D742Cf](https://explorer-studio.genlayer.com/address/0x7Ce13F5696f3A81AB5782BC203158691c0D742Cf)
- **DriftGuard**:
  - Address: `0x02167c91C7054F7503Ea38200eD293003A8E9e4F`
  - Deploy Tx: `0xef8092b855239516c1a3a4b2e85c70733ff5c2245484c1631ae9335db633b4b9`
  - Source SHA-256: `eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc`
  - Explorer: [0x02167c91C7054F7503Ea38200eD293003A8E9e4F](https://explorer-studio.genlayer.com/address/0x02167c91C7054F7503Ea38200eD293003A8E9e4F)
- **Deployed At**: `2026-10-17T02:25:54.720Z`
- **Status**: Superseded
- **Reason**: Prompt enhanced in Iteration 1 to strictly enforce flat string arrays for LLM labels.
