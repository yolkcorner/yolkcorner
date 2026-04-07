import {
  RekognitionClient,
  CreateCollectionCommand,
  DeleteCollectionCommand,
  DescribeCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
} from "@aws-sdk/client-rekognition";

let rekognitionClient: RekognitionClient | null = null;

function getClient(): RekognitionClient {
  if (rekognitionClient) return rekognitionClient;

  const region = process.env.AWS_REKOGNITION_REGION;
  const accessKeyId = process.env.AWS_REKOGNITION_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("AWS Rekognition credentials are not configured");
  }

  rekognitionClient = new RekognitionClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  return rekognitionClient;
}

export function isRekognitionConfigured(): boolean {
  return Boolean(
    process.env.AWS_REKOGNITION_REGION &&
      process.env.AWS_REKOGNITION_ACCESS_KEY_ID &&
      process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY,
  );
}

/** Derive a Rekognition Collection ID from an event ID */
export function getCollectionId(eventId: string): string {
  return `photobooth-${eventId.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")}`;
}

/**
 * Create a Rekognition Collection for the event if it doesn't already exist.
 * Returns true if it was newly created, false if it existed.
 */
export async function ensureCollection(
  collectionId: string,
): Promise<boolean> {
  const client = getClient();
  try {
    await client.send(
      new DescribeCollectionCommand({ CollectionId: collectionId }),
    );
    return false;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "ResourceNotFoundException") {
      await client.send(
        new CreateCollectionCommand({ CollectionId: collectionId }),
      );
      return true;
    }
    throw err;
  }
}

/** Delete a Rekognition Collection (use before re-indexing) */
export async function deleteCollection(collectionId: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteCollectionCommand({ CollectionId: collectionId }),
  );
}

/**
 * Index all faces found in an image.
 * externalImageId is stored alongside each indexed face so we can recover it in search results.
 * Returns the FaceIds of indexed faces.
 */
export async function indexFacesInImage(
  collectionId: string,
  imageBytes: Uint8Array,
  externalImageId: string,
): Promise<string[]> {
  const client = getClient();
  const result = await client.send(
    new IndexFacesCommand({
      CollectionId: collectionId,
      Image: { Bytes: imageBytes },
      ExternalImageId: externalImageId,
      DetectionAttributes: [],
      MaxFaces: 10,
      QualityFilter: "AUTO",
    }),
  );
  return (result.FaceRecords ?? [])
    .map((r) => r.Face?.FaceId ?? "")
    .filter(Boolean);
}

export type FaceMatch = {
  faceId: string;
  /** base64url-encoded R2 key set when indexing */
  externalImageId: string;
  similarity: number;
};

/**
 * Find faces in the collection that match the selfie.
 * Returns an empty array if no face is detected in the selfie.
 */
export async function searchFacesByImage(
  collectionId: string,
  imageBytes: Uint8Array,
  minSimilarity = 80,
): Promise<FaceMatch[]> {
  const client = getClient();
  try {
    const result = await client.send(
      new SearchFacesByImageCommand({
        CollectionId: collectionId,
        Image: { Bytes: imageBytes },
        FaceMatchThreshold: minSimilarity,
        MaxFaces: 100,
      }),
    );
    return (result.FaceMatches ?? []).map((m) => ({
      faceId: m.Face?.FaceId ?? "",
      externalImageId: m.Face?.ExternalImageId ?? "",
      similarity: m.Similarity ?? 0,
    }));
  } catch (err: unknown) {
    // Thrown when the selfie image has no detectable face
    if (
      err instanceof Error &&
      (err.name === "InvalidParameterException" ||
        err.name === "InvalidImageFormatException")
    ) {
      return [];
    }
    throw err;
  }
}
