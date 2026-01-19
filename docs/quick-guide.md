# Quick Guide

This guide walks you through generating, verifying, and sharing certified artifacts using Recanon.

---

## 6-Step Quickstart

### Step 1: Configure Canonical Renderer URL

Set `VITE_CANONICAL_RENDERER_URL` environment variable, or use the "Edit" button in the UI header to set a custom URL.

The app resolves the URL in this order:
1. `localStorage` override (set via UI)
2. `VITE_CANONICAL_RENDERER_URL` environment variable
3. Default: `https://nexart-canonical-renderer-production.up.railway.app`

### Step 2: Check Renderer Health

Look for the health badge in the header:
- 🟢 **Green** = Renderer reachable, ready to use
- 🔴 **Red** = Renderer unreachable, check URL configuration

### Step 3: Generate a Proof Bundle

Navigate to **Verify & Test** and use the one-click generators:

| Button | What It Does |
|--------|--------------|
| **Generate VERIFIED Static** | Creates a PNG artifact with single hash |
| **Generate VERIFIED Loop** | Creates an MP4 artifact with poster + animation hashes |
| **Generate FAILED Proof** | Tampers the last bundle to demonstrate hash mismatch |

### Step 4: Verify the Bundle

With a bundle JSON in the editor:
1. Click **"Verify Bundle"**
2. The canonical renderer re-executes the program
3. Result shows **VERIFIED** or **FAILED**

### Step 5: Test Tampering Detection

1. Generate a valid proof
2. Click **"Generate FAILED Proof"** to tamper it
3. Verify — the system detects the mismatch

This demonstrates that any modification to the claimed hash is detectable.

### Step 6: Export and Share

Download the bundle JSON to share with third parties. They can:
- Verify using this same UI
- Verify using the CLI script
- Verify by calling the canonical renderer directly

---

## What Gets Verified

Every verification checks these components:

| Component | Description |
|-----------|-------------|
| **Code** | The exact program source is re-executed |
| **Seed** | Deterministic randomness from original execution |
| **VAR[0-9]** | All 10 parameters (0-100 range) are replayed exactly |
| **Output Hash** | SHA-256 of rendered bytes must match |

If any component differs, the hash will not match.

---

## Hash Rules: Static vs Loop

### Static Mode

- **Output**: Single image (PNG)
- **Hashes**: One hash — `imageHash`
- **Bundle field**: `verificationRequirements: "static-single-hash"`
- **Verification**: Hash must match exactly

### Loop Mode

- **Output**: Animation (MP4) + poster frame (PNG)
- **Hashes**: Two hashes — `posterHash` + `animationHash`
- **Bundle field**: `verificationRequirements: "loop-requires-both-hashes"`
- **Verification**: **Both** hashes must match for VERIFIED status

⚠️ Loop mode verification fails if either hash mismatches.

---

## Troubleshooting

### Canonical Renderer Unreachable

**Symptoms**: Red health badge, network errors

**Solutions**:
- Check `VITE_CANONICAL_RENDERER_URL` is set correctly
- Ensure the renderer server is running
- If using localhost in hosted preview, switch to a public HTTPS URL
- Use the "Edit" button to set a public renderer URL

### CORS Errors

**Symptoms**: Browser console shows blocked requests

**Solutions**:
- Canonical renderer must have CORS enabled for your origin
- For local development, ensure both app and renderer are on localhost
- Or configure a proxy in `vite.config.ts`

### Wrong Renderer URL

**Symptoms**: Verification fails despite valid bundle

**Notes**:
- Bundles record which renderer created them
- Different renderers may have different versions
- Verify using the same renderer that created the bundle

### Hash Mismatch (FAILED)

**Symptoms**: Verification returns FAILED status

**Causes**:
- Snapshot was modified after original execution
- Hash was tampered with
- Different renderer version (check metadata)

**Note**: This is expected behavior for tampered bundles—the system is working correctly.

---

## CLI Replay

Verify bundles from the command line:

```bash
# Using the included script
npx ts-node scripts/replay-artifact.ts path/to/bundle.json

# Or with curl
curl -X POST https://your-renderer/verify \
  -H "Content-Type: application/json" \
  -d @bundle.json
```

---

## Bundle Portability

Artifact bundles are self-describing JSON files containing:

- Complete program source
- All parameters (seed, vars, execution settings)
- Expected hash(es)
- Renderer metadata (URL, version, protocol)

Anyone with access to a compatible canonical renderer can independently verify the bundle without trusting the original creator.
