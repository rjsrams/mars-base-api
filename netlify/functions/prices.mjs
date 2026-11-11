import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { facilitator } from "@payai/facilitator";

const app = new Hono();

const PAY_TO = "0x781e2C988A06C096694054479e87A05D386212C4";
const NETWORK = "eip155:8453";
const PRICE = "$0.005";

const facilitatorClient = new HTTPFacilitatorClient(facilitator);

const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(NETWORK, new ExactEvmScheme());

app.use(
  paymentMiddleware(
    {
      "GET /api/prices": {
        accepts: [
          {
            scheme: "exact",
            price: PRICE,
            network: NETWORK,
            payTo: PAY_TO,
          },
        ],
        description: "Live Bitcoin and Ethereum prices in USD",
        mimeType: "application/json",
        serviceName: "MARS Base.API",
        tags: ["crypto", "prices", "bitcoin", "ethereum", "base"],
        extensions: {
          ...declareDiscoveryExtension({
            output: {
              example: {
                provider: "CoinGecko",
                currency: "USD",
                prices: {
                  bitcoin: { usd: 95000 },
                  ethereum: { usd: 3000 },
                },
                updatedAt: "2026-11-10T00:00:00.000Z",
              },
            },
          }),
        },
      },
    },
    resourceServer
  )
);

app.get("/api/prices", async (c) => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"
    );

    if (!response.ok) {
      return c.json(
        { error: "Price provider temporarily unavailable" },
        502
      );
    }

    const prices = await response.json();

    return c.json({
      name: "MARS Base.API",
      provider: "CoinGecko",
      currency: "USD",
      prices,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Price API error:", error);

    return c.json(
      { error: "Unable to retrieve crypto prices" },
      502
    );
  }
});

export const config = {
  path: "/api/prices",
};

export default async (request) => {
  return app.fetch(request);
};
