import { describe, expect, it } from "vitest";
import { encodedPhotoTooBig, MAX_PHOTO_BYTES, MAX_PHOTO_MB, photoSizeError } from "@/lib/order-limits";
import { storeOrderPhoto } from "@/lib/build-order.server";

const MB = 1024 * 1024;

/** Base64 of a small PNG-shaped payload. */
const pngBase64 = (bytes: number) => {
  const head = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const body = Buffer.alloc(Math.max(0, bytes - head.length), 7);
  return Buffer.concat([head, body]).toString("base64");
};

const fakeDb = (photoCount = 0) => {
  const stored: { path: string; bytes: number }[] = [];
  const inserted: any[] = [];
  const db: any = {
    storage: {
      from: () => ({
        upload: async (path: string, data: Uint8Array) => {
          stored.push({ path, bytes: data.length });
          return { error: null };
        },
      }),
    },
    from: () => ({
      select: () => ({ eq: async () => ({ count: photoCount }) }),
      insert: async (row: any) => {
        inserted.push(row);
        return { error: null };
      },
    }),
  };
  return { db, stored, inserted };
};

describe("order photo size limit", () => {
  it("allows one photo up to 100 MB", () => {
    expect(MAX_PHOTO_MB).toBe(100);
    expect(MAX_PHOTO_BYTES).toBe(100 * MB);
    expect(photoSizeError(100 * MB)).toBeNull();
    expect(photoSizeError(100 * MB - 1)).toBeNull();
  });

  it("rejects anything over 100 MB with a message that names the real limit", () => {
    expect(photoSizeError(100 * MB + 1)).toBe("That photo is over 100 MB.");
  });

  it("spots an oversized upload from its encoded length, before decoding", () => {
    const encoded101MB = Math.ceil((101 * MB * 4) / 3);
    const encoded100MB = Math.ceil((100 * MB * 4) / 3);
    expect(encodedPhotoTooBig(encoded101MB)).toBe(true);
    expect(encodedPhotoTooBig(encoded100MB)).toBe(false);
  });

  it("stores an accepted photo and records it against the order", async () => {
    const { db, stored, inserted } = fakeDb();
    await storeOrderPhoto(db, "quote-1", { name: "storefront.png", type: "image/png", base64: pngBase64(40 * 1024) }, "team", "Daniel");
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ bytes: 40 * 1024 });
    expect(inserted[0]).toMatchObject({ quote_id: "quote-1", source: "team", uploaded_by_name: "Daniel" });
  });

  it("refuses a file that is not a photo", async () => {
    const { db, stored } = fakeDb();
    await expect(
      storeOrderPhoto(db, "quote-1", { name: "notes.txt", type: "text/plain", base64: pngBase64(1024) }, "team", "Daniel"),
    ).rejects.toThrow("Please upload a photo");
    expect(stored).toHaveLength(0);
  });

  it("stops once an order holds 30 photos", async () => {
    const { db, stored } = fakeDb(30);
    await expect(
      storeOrderPhoto(db, "quote-1", { name: "storefront.png", type: "image/png", base64: pngBase64(1024) }, "team", "Daniel"),
    ).rejects.toThrow("maximum number of photos");
    expect(stored).toHaveLength(0);
  });
});
