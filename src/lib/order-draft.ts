import { z } from "zod";

export const orderBusinessName = z.string().trim().max(200);

export function needsOrderDetails(order: { business_name: string; package_name: string; membership_name: string; addons: { name: string }[] }) {
  return !order.business_name.trim() || !(order.package_name.trim() || order.membership_name.trim() || order.addons.some(a => a.name.trim()));
}

export const noPackageFields = { package_name: "", package_price: 0, package_details: "" };