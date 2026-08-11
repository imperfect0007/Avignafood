"""End-to-end smoke: lead → customer → quote → SO → invoice → pay."""

from __future__ import annotations

import sys

import httpx

BASE = "http://localhost:8000"
EMAIL = "admin@avighnya.local"
PASSWORD = "admin123"


def main() -> None:
    with httpx.Client(base_url=BASE, timeout=30.0) as client:
        health = client.get("/health")
        health.raise_for_status()
        assert health.json()["status"] == "ok"

        login = client.post(
            "/api/v1/auth/login",
            data={"username": EMAIL, "password": PASSWORD},
        )
        login.raise_for_status()
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        companies = client.get("/api/v1/companies", headers=headers)
        companies.raise_for_status()
        company_id = companies.json()[0]["id"]
        headers["X-Company-Id"] = str(company_id)

        product = client.post(
            "/api/v1/products",
            headers=headers,
            json={
                "sku": "SMOKE-ING-01",
                "name": "Smoke Test Ingredient",
                "unit": "KG",
                "base_price": "120",
                "gst_rate": "5",
            },
        )
        if product.status_code == 400 and "SKU" in product.text:
            products = client.get("/api/v1/products", headers=headers)
            products.raise_for_status()
            product_id = next(p["id"] for p in products.json() if p["sku"] == "SMOKE-ING-01")
        else:
            product.raise_for_status()
            product_id = product.json()["id"]

        stock = client.post(
            "/api/v1/inventory/stock",
            headers=headers,
            json={"product_id": product_id, "quantity": "5000"},
        )
        stock.raise_for_status()

        lead = client.post(
            "/api/v1/leads",
            headers=headers,
            json={
                "business_name": "Smoke Wholesale Co",
                "phone": "9999900001",
                "lead_type": "wholesale",
                "source": "smoke",
            },
        )
        lead.raise_for_status()
        lead_id = lead.json()["id"]

        customer = client.post(f"/api/v1/leads/{lead_id}/convert", headers=headers)
        customer.raise_for_status()
        customer_id = customer.json()["id"]

        quote = client.post(
            "/api/v1/quotations",
            headers=headers,
            json={
                "customer_id": customer_id,
                "lead_id": lead_id,
                "lines": [{"product_id": product_id, "quantity": "500", "unit_price": "120"}],
            },
        )
        quote.raise_for_status()
        quote_id = quote.json()["id"]
        assert quote.json()["status"] == "approved"

        accept = client.post(f"/api/v1/quotations/{quote_id}/accept", headers=headers)
        accept.raise_for_status()

        order = client.post(
            "/api/v1/sales-orders",
            headers=headers,
            json={"customer_id": customer_id, "quotation_id": quote_id, "lines": []},
        )
        order.raise_for_status()
        order_id = order.json()["id"]

        confirm = client.post(f"/api/v1/sales-orders/{order_id}/confirm", headers=headers)
        confirm.raise_for_status()
        assert confirm.json()["status"] == "confirmed"

        invoice = client.post(f"/api/v1/invoices/from-order/{order_id}", headers=headers)
        invoice.raise_for_status()
        inv = invoice.json()
        invoice_id = inv["id"]
        total = float(inv["total"])

        payment = client.post(
            "/api/v1/payments",
            headers=headers,
            json={"invoice_id": invoice_id, "amount": str(total), "method": "bank"},
        )
        payment.raise_for_status()

        inv2 = client.get(f"/api/v1/invoices/{invoice_id}", headers=headers)
        inv2.raise_for_status()
        assert inv2.json()["status"] == "paid"
        assert float(inv2.json()["outstanding"]) == 0.0

        dash = client.get("/api/v1/dashboard/supervisor", headers=headers)
        dash.raise_for_status()

        print("SMOKE OK")
        print(f"  lead={lead_id} customer={customer_id} quote={quote_id}")
        print(f"  order={order_id} invoice={inv['number']} paid={total}")
        print(f"  dashboard month_sales={dash.json()['month_sales']}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"SMOKE FAILED: {e}", file=sys.stderr)
        sys.exit(1)
