import { NextRequest, NextResponse } from "next/server";
import { createPinataClient, getIpfsUrl } from "~/lib/pinata";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const tokenSymbol = formData.get("tokenSymbol") as string | null;
        const tokenAddress = formData.get("tokenAddress") as string | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type (only images)
        if (!file.type.startsWith("image/")) {
            return NextResponse.json(
                { error: "Only image files are allowed" },
                { status: 400 }
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: "File size must be less than 5MB" },
                { status: 400 }
            );
        }

        const pinata = createPinataClient();

        // Build key-values for querying later
        const keyvalues: Record<string, string> = {
            type: "token_logo",
        };

        if (tokenSymbol) {
            keyvalues.tokenSymbol = tokenSymbol;
        }

        if (tokenAddress) {
            keyvalues.tokenAddress = tokenAddress;
        }

        // Upload to Pinata IPFS (public network)
        const upload = await pinata.upload.public
            .file(file)
            .name(tokenSymbol ? `${tokenSymbol}_logo` : file.name)
            .keyvalues(keyvalues);

        // Return the CID and gateway URL
        return NextResponse.json({
            success: true,
            cid: upload.cid,
            url: getIpfsUrl(upload.cid),
            ipfsUrl: `ipfs://${upload.cid}`,
            id: upload.id,
            name: upload.name,
            size: upload.size,
            mimeType: upload.mime_type,
        });
    } catch (error) {
        console.error("Pinata upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload file to IPFS" },
            { status: 500 }
        );
    }
}
