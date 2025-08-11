import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createWalletClient, http } from "https://esm.sh/viem@2.13.6";
import { privateKeyToAccount } from "https://esm.sh/viem@2.13.6/accounts";
import { polygonAmoy } from "https://esm.sh/viem@2.13.6/chains";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function base64UrlToBytes(base64url: string): Uint8Array {
  // Convert base64url to base64
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((base64url.length + 3) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return (
    "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")
  ) as `0x${string}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rpcUrl = Deno.env.get("POLYGON_AMOY_RPC_URL");
    const pk = Deno.env.get("ETH_PRIVATE_KEY");

    if (!rpcUrl || !pk) {
      return new Response(
        JSON.stringify({ error: "Missing POLYGON_AMOY_RPC_URL or ETH_PRIVATE_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { proofCode } = await req.json();
    if (!proofCode || typeof proofCode !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid payload: expected { proofCode: string }" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // proofCode is base64url of a 32-byte SHA-256 digest
    const bytes = base64UrlToBytes(proofCode);
    const data = bytesToHex(bytes);

    const normalizedPk = pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`);
    const account = privateKeyToAccount(normalizedPk);

    const client = createWalletClient({
      account,
      chain: polygonAmoy,
      transport: http(rpcUrl),
    });

    // Send a 0-value transaction to self with the proof in the calldata
    const txHash = await client.sendTransaction({
      to: account.address,
      value: 0n,
      data,
    });

    const explorerUrl = `https://amoy.polygonscan.com/tx/${txHash}`;

    return new Response(
      JSON.stringify({ txHash, explorerUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("anchor-hash error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
