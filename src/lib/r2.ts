import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";

let r2Client: S3Client | null = null;

const getR2Client = () => {
  if (r2Client) {
    return r2Client;
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });

  return r2Client;
};

const BUCKET = process.env.R2_BUCKET_NAME || "";
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

const API_ENDPOINT_HOST = ".r2.cloudflarestorage.com";

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_URL,
  );
}

export function getR2PublicUrlError() {
  if (!PUBLIC_URL) {
    return "R2_PUBLIC_URL is missing";
  }

  if (PUBLIC_URL.includes(API_ENDPOINT_HOST)) {
    return "R2_PUBLIC_URL must be a public R2 URL (r2.dev or custom domain), not the S3 API endpoint";
  }

  return null;
}

export function r2PublicUrl(key: string) {
  return `${PUBLIC_URL}/${key}`;
}

export type R2ListResult = {
  keys: string[];
  objects: { key: string; lastModified: Date | null }[];
  nextContinuationToken: string | null;
};

export type R2PrefixListResult = {
  prefixes: string[];
  nextContinuationToken: string | null;
};

export async function listR2ObjectsPaginated(
  prefix: string,
  maxKeys: number,
  continuationToken?: string,
): Promise<R2ListResult> {
  const client = getR2Client();
  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    }),
  );

  const keys = (res.Contents || []).map((obj) => obj.Key || "").filter(Boolean);
  const objects = (res.Contents || [])
    .filter((obj) => !!obj.Key)
    .map((obj) => ({ key: obj.Key as string, lastModified: obj.LastModified ?? null }));

  return {
    keys,
    objects,
    nextContinuationToken: res.NextContinuationToken || null,
  };
}

export async function listR2Prefixes(
  prefix: string,
  maxKeys = 1000,
  continuationToken?: string,
): Promise<R2PrefixListResult> {
  const client = getR2Client();
  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      Delimiter: "/",
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    }),
  );

  const prefixes = (res.CommonPrefixes || [])
    .map((item) => item.Prefix || "")
    .filter(Boolean);

  return {
    prefixes,
    nextContinuationToken: res.NextContinuationToken || null,
  };
}

export function extractR2Key(url: string | null | undefined): string | null {
  if (!url || !PUBLIC_URL) return null;
  if (!url.startsWith(PUBLIC_URL)) return null;
  return url.slice(PUBLIC_URL.length + 1);
}

export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return r2PublicUrl(key);
}

export async function isR2UrlReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}

export async function deleteMultipleFromR2(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const client = getR2Client();
  await client.send(
    new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: {
        Objects: keys.map((Key) => ({ Key })),
        Quiet: true,
      },
    }),
  );
}

export async function copyR2Object(
  sourceKey: string,
  destinationKey: string,
): Promise<string> {
  const client = getR2Client();
  const encodedSource = `${BUCKET}/${encodeURIComponent(sourceKey)}`;
  await client.send(
    new CopyObjectCommand({
      Bucket: BUCKET,
      CopySource: encodedSource,
      Key: destinationKey,
    }),
  );
  return r2PublicUrl(destinationKey);
}

export async function listR2Folder(prefix: string): Promise<string[]> {
  const client = getR2Client();
  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
    }),
  );
  return (res.Contents || []).map((obj) => obj.Key || "").filter(Boolean);
}
