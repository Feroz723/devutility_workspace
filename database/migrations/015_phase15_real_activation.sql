-- Migration 015: Phase 15 Real-World Activation and Product Deployments
-- Connects ABOS products to verifiable public deployment records and health state

CREATE TABLE IF NOT EXISTS product_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- SELF_HOSTED, GITHUB_PAGES, CLOUDFLARE_PAGES
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNED', -- PLANNED, READY, DEPLOYING, DEPLOYED, FAILED, NOT_CONNECTED, REQUIRES_MANUAL_SETUP
    public_url TEXT,
    deployment_id TEXT,
    is_verified BOOLEAN DEFAULT false,
    verification_details JSONB DEFAULT '{}'::jsonb,
    verified_at TIMESTAMPTZ,
    error_message TEXT,
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_deployments_product_id ON product_deployments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_deployments_status ON product_deployments(status);
CREATE INDEX IF NOT EXISTS idx_product_deployments_provider ON product_deployments(provider);
CREATE INDEX IF NOT EXISTS idx_product_deployments_is_demo ON product_deployments(is_demo);
