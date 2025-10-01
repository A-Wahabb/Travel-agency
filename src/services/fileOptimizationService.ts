import sharp from 'sharp';
import { Readable } from 'stream';

export interface OptimizationOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
    maxSizeKB?: number;
}

export interface OptimizationResult {
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    optimizedBuffer: Buffer;
    optimizedMimetype: string;
    wasOptimized: boolean;
}

/**
 * Optimize image files using Sharp
 */
export const optimizeImage = async (
    buffer: Buffer,
    mimetype: string,
    options: OptimizationOptions = {}
): Promise<OptimizationResult> => {
    const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 85,
        format,
        maxSizeKB = 1024 // 1MB default max size
    } = options;

    const originalSize = buffer.length;
    
    // Check if it's an image that can be optimized
    const isImage = mimetype.startsWith('image/');
    if (!isImage) {
        return {
            originalSize,
            optimizedSize: originalSize,
            compressionRatio: 0,
            optimizedBuffer: buffer,
            optimizedMimetype: mimetype,
            wasOptimized: false
        };
    }

    try {
        let sharpInstance = sharp(buffer);

        // Get image metadata
        const metadata = await sharpInstance.metadata();
        const { width = 0, height = 0 } = metadata;

        // Check if resizing is needed
        const needsResize = width > maxWidth || height > maxHeight;
        if (needsResize) {
            sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // Determine output format
        let outputFormat = format;
        if (!outputFormat) {
            // Convert to more efficient formats
            switch (mimetype) {
                case 'image/png':
                    // Only convert PNG to JPEG if it doesn't have transparency
                    if (metadata.hasAlpha) {
                        outputFormat = 'png';
                    } else {
                        outputFormat = 'jpeg';
                    }
                    break;
                case 'image/gif':
                    outputFormat = 'jpeg'; // Convert GIF to JPEG for better compression
                    break;
                case 'image/bmp':
                    outputFormat = 'jpeg';
                    break;
                case 'image/tiff':
                    outputFormat = 'jpeg';
                    break;
                default:
                    outputFormat = 'jpeg';
            }
        }

        // Apply format-specific optimizations
        switch (outputFormat) {
            case 'jpeg':
                sharpInstance = sharpInstance.jpeg({
                    quality,
                    progressive: true,
                    mozjpeg: true
                });
                break;
            case 'png':
                sharpInstance = sharpInstance.png({
                    quality,
                    progressive: true,
                    compressionLevel: 9
                });
                break;
            case 'webp':
                sharpInstance = sharpInstance.webp({
                    quality,
                    effort: 6
                });
                break;
        }

        // Optimize the image
        const optimizedBuffer = await sharpInstance.toBuffer();
        const optimizedSize = optimizedBuffer.length;

        // Check if optimization actually reduced size
        if (optimizedSize >= originalSize) {
            return {
                originalSize,
                optimizedSize: originalSize,
                compressionRatio: 0,
                optimizedBuffer: buffer,
                optimizedMimetype: mimetype,
                wasOptimized: false
            };
        }

        // Check if the optimized size is within limits
        const maxSizeBytes = maxSizeKB * 1024;
        if (optimizedSize > maxSizeBytes) {
            // Try with lower quality
            let qualityLevel = quality;
            let finalBuffer = optimizedBuffer;
            
            while (qualityLevel > 20 && finalBuffer.length > maxSizeBytes) {
                qualityLevel -= 10;
                
                let reoptimizeInstance = sharp(buffer);
                if (needsResize) {
                    reoptimizeInstance = reoptimizeInstance.resize(maxWidth, maxHeight, {
                        fit: 'inside',
                        withoutEnlargement: true
                    });
                }

                switch (outputFormat) {
                    case 'jpeg':
                        reoptimizeInstance = reoptimizeInstance.jpeg({
                            quality: qualityLevel,
                            progressive: true,
                            mozjpeg: true
                        });
                        break;
                    case 'png':
                        reoptimizeInstance = reoptimizeInstance.png({
                            quality: qualityLevel,
                            progressive: true,
                            compressionLevel: 9
                        });
                        break;
                    case 'webp':
                        reoptimizeInstance = reoptimizeInstance.webp({
                            quality: qualityLevel,
                            effort: 6
                        });
                        break;
                }

                finalBuffer = await reoptimizeInstance.toBuffer();
            }

            return {
                originalSize,
                optimizedSize: finalBuffer.length,
                compressionRatio: ((originalSize - finalBuffer.length) / originalSize) * 100,
                optimizedBuffer: finalBuffer,
                optimizedMimetype: `image/${outputFormat}`,
                wasOptimized: true
            };
        }

        const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;
        const optimizedMimetype = `image/${outputFormat}`;

        return {
            originalSize,
            optimizedSize,
            compressionRatio,
            optimizedBuffer,
            optimizedMimetype,
            wasOptimized: true
        };

    } catch (error) {
        console.error('Error optimizing image:', error);
        // Return original buffer if optimization fails
        return {
            originalSize,
            optimizedSize: originalSize,
            compressionRatio: 0,
            optimizedBuffer: buffer,
            optimizedMimetype: mimetype,
            wasOptimized: false
        };
    }
};

/**
 * Optimize document files (PDF, DOC, etc.)
 * For now, this is a placeholder - actual PDF optimization would require additional libraries
 */
export const optimizeDocument = async (
    buffer: Buffer,
    mimetype: string,
    options: OptimizationOptions = {}
): Promise<OptimizationResult> => {
    const originalSize = buffer.length;
    
    // For now, just return the original buffer
    // In the future, you could add PDF compression, DOC optimization, etc.
    return {
        originalSize,
        optimizedSize: originalSize,
        compressionRatio: 0,
        optimizedBuffer: buffer,
        optimizedMimetype: mimetype,
        wasOptimized: false
    };
};

/**
 * Main optimization function that handles both images and documents
 */
export const optimizeFile = async (
    buffer: Buffer,
    mimetype: string,
    options: OptimizationOptions = {}
): Promise<OptimizationResult> => {
    const isImage = mimetype.startsWith('image/');
    
    if (isImage) {
        return await optimizeImage(buffer, mimetype, options);
    } else {
        return await optimizeDocument(buffer, mimetype, options);
    }
};

/**
 * Get file size in human readable format
 */
export const getFileSizeString = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if file should be optimized based on size and type
 */
export const shouldOptimizeFile = (
    buffer: Buffer,
    mimetype: string,
    maxSizeKB: number = 1024
): boolean => {
    const sizeKB = buffer.length / 1024;
    const isImage = mimetype.startsWith('image/');
    
    return isImage && sizeKB > maxSizeKB;
};
