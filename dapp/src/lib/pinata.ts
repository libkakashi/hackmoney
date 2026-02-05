import {PinataSDK} from 'pinata';
import {env} from './env';

// Server-side Pinata SDK instance
// Only use this in API routes or server components
export const createPinataClient = () => {
  if (!env.pinataJwt) {
    throw new Error('PINATA_JWT environment variable is not set');
  }
  if (!env.pinataGateway) {
    throw new Error(
      'NEXT_PUBLIC_PINATA_GATEWAY environment variable is not set',
    );
  }
  return new PinataSDK({
    pinataJwt: env.pinataJwt,
    pinataGateway: env.pinataGateway,
  });
};

// Get the public gateway URL for a CID
export const getIpfsUrl = (cid: string): string => {
  if (!env.pinataGateway) {
    return `ipfs://${cid}`;
  }
  return `https://${env.pinataGateway}/ipfs/${cid}`;
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
