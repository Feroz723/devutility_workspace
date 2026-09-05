import { notFound } from "next/navigation";
import { queryOne } from "@/database/client";
import type { Product } from "@/types/product";
import { ProductPublicView } from "./product-client-view";

interface PageProps {
  params: {
    slug: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export const dynamic = "force-dynamic";

export default async function PublicProductPage({ params, searchParams }: PageProps) {
  const { slug } = params;

  const product = await queryOne<Product>(
    `SELECT * FROM products WHERE slug = $1 LIMIT 1`,
    [slug]
  );

  if (!product) {
    notFound();
  }

  return (
    <ProductPublicView
      product={product}
      searchParams={searchParams}
    />
  );
}
