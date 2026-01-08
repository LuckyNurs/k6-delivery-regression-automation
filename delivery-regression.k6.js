import http from "k6/http";
import { check, sleep } from "k6";

let successLogs = [];
let errorLogs = [];
let allProcessedOutlets = [];
let accessToken = "";

const BASE_URL = __ENV.BASE_URL || "https://api.example.com";

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ["p(95)<5000"],
    http_req_failed: ["rate<0.1"],
  },
};

export default function () {
  console.log("🚀 Starting Delivery Regression Test (Portfolio Version)");

  // =====================
  // AUTHENTICATION
  // =====================
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      username: __ENV.USERNAME || "demo_user",
      pin: __ENV.PIN || "123456",
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(loginRes, {
    "login success": (r) => r.status === 200,
  });

  accessToken = loginRes.json()?.data?.accessToken || "mock-token";
  sleep(0.5);

  // =====================
  // DELIVERY WIDGET
  // =====================
  const deliveryWidget = http.get(
    `${BASE_URL}/delivery/widget?lat=-6.24&lng=106.78`,
    { headers: authHeader() }
  );

  check(deliveryWidget, {
    "delivery widget loaded": (r) => r.status === 200,
  });

  const brands =
    deliveryWidget.json()?.data || [
      { brandId: "BR-001", brandName: "Demo Brand" },
    ];

  brands.forEach((brand) => {
    processBrand(brand);
  });

  sendFinalReport();
}

// =====================
// BRAND → OUTLET FLOW
// =====================
function processBrand(brand) {
  const outletRes = http.get(
    `${BASE_URL}/outlets?brandId=${brand.brandId}`,
    { headers: authHeader() }
  );

  check(outletRes, {
    "outlet list loaded": (r) => r.status === 200,
  });

  const outlets =
    outletRes.json()?.data || [
      {
        outletId: "OUT-001",
        outletName: "Demo Outlet",
        channel: "OMS",
      },
    ];

  outlets.forEach((outlet) => {
    allProcessedOutlets.push(outlet);
    processOutlet(outlet);
  });
}

// =====================
// OUTLET → ORDER FLOW
// =====================
function processOutlet(outlet) {
  try {
    const menuRes = http.get(
      `${BASE_URL}/menu/${outlet.outletId}`,
      { headers: authHeader() }
    );

    check(menuRes, {
      "menu retrieved": (r) => r.status === 200,
    });

    const products =
      menuRes.json()?.data || [{ productId: "PRD-001", price: 10000 }];

    const selectedProduct = products[0];

    const addToCart = http.post(
      `${BASE_URL}/cart`,
      JSON.stringify({
        outletId: outlet.outletId,
        productId: selectedProduct.productId,
        qty: 1,
      }),
      { headers: authHeaderJson() }
    );

    check(addToCart, {
      "add to cart success": (r) => r.status === 200,
    });

    const cartId = addToCart.json()?.cartId || "CART-001";

    processCheckout(outlet, cartId);
  } catch (err) {
    errorLogs.push({
      message: `Error processing outlet ${outlet.outletName}: ${err.message}`,
    });
  }
}

// =====================
// CHECKOUT & PAYMENT
// =====================
function processCheckout(outlet, cartId) {
  const checkoutRes = http.post(
    `${BASE_URL}/checkout`,
    JSON.stringify({ cartId }),
    { headers: authHeaderJson() }
  );

  check(checkoutRes, {
    "checkout success": (r) => r.status === 200,
  });

  const paymentRes = http.post(
    `${BASE_URL}/payment`,
    JSON.stringify({
      cartId,
      method: "MockPay",
    }),
    { headers: authHeaderJson() }
  );

  const redirectUrl = paymentRes.json()?.redirectUrl || "";

  const isValidRedirect = redirectUrl.startsWith(
    "https://mockpay.example.com"
  );

  if (isValidRedirect) {
    successLogs.push({
      message: `Order success for ${outlet.outletName}`,
    });
  } else {
    errorLogs.push({
      message: `Invalid payment redirect for ${outlet.outletName}`,
    });
  }
}

// =====================
// REPORTING (MOCK)
// =====================
function sendFinalReport() {
  console.log("=== TEST SUMMARY ===");
  console.log(`Outlets processed: ${allProcessedOutlets.length}`);
  console.log(`Success: ${successLogs.length}`);
  console.log(`Failed: ${errorLogs.length}`);

  console.log("Success Logs:", successLogs);
  console.log("Error Logs:", errorLogs);
}

// =====================
// HELPERS
// =====================
function authHeader() {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function authHeaderJson() {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}
