import { PinataSDK } from "pinata";

// Server-side Pinata SDK instance
// Only use this in API routes or server components
export const createPinataClient = () => {
    const jwt = process.env.PINATA_JWT;
    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;

    if (!jwt) {
        throw new Error("PINATA_JWT environment variable is not set");
    }

    if (!gateway) {
        throw new Error("NEXT_PUBLIC_PINATA_GATEWAY environment variable is not set");
    }

    return new PinataSDK({
        pinataJwt: jwt,
        pinataGateway: gateway,
    });
};

// Get the public gateway URL for a CID
export const getIpfsUrl = (cid: string): string => {
    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
    if (!gateway) {
        // Fallback to IPFS protocol URL
        return `ipfs://${cid}`;
    }
    return `https://${gateway}/ipfs/${cid}`;
};

// Upload response type
export interface PinataUploadResponse {
    id: string;
    name: string;
    cid: string;
    size: number;
    mime_type: string;
    created_at: string;
}
