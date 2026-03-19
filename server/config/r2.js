const { S3Client } = require('@aws-sdk/client-s3');

const getRequiredEnv = (name) => {
    const value = String(process.env[name] || '').trim();
    if (!value) {
        throw new Error(`Missing required R2 environment variable: ${name}`);
    }
    return value;
};

const getR2Config = () => {
    const accountId = getRequiredEnv('R2_ACCOUNT_ID');
    const accessKeyId = getRequiredEnv('R2_ACCESS_KEY_ID');
    const secretAccessKey = getRequiredEnv('R2_SECRET_ACCESS_KEY');
    const bucketName = getRequiredEnv('R2_BUCKET_NAME');
    const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');

    return {
        accountId,
        accessKeyId,
        secretAccessKey,
        bucketName,
        publicBaseUrl,
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        region: 'auto'
    };
};

let cachedClient = null;

const getR2Client = () => {
    if (cachedClient) {
        return cachedClient;
    }

    const config = getR2Config();
    cachedClient = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: false,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey
        }
    });

    return cachedClient;
};

module.exports = {
    getR2Client,
    getR2Config
};
