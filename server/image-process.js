// Image processing service using Sharp which is based on libvips library

const _ = require('lodash');
const AWS = require('aws-sdk');
const path = require('path');
const Promise = require('bluebird');
const rp = require('request-promise');
const sharp = require('sharp');

const config = require('./config');
const upload = require('./upload');

function retrieveMedia(Bucket, Key) {
  // Configure AWS
  AWS.config.update({ region: 'us-east-1' });
  AWS.config.setPromisesDependency(Promise);

  const s3 = new AWS.S3();
  return s3.getObject({ Bucket, Key }).promise();
}

function saveMediaMeta(mediaId, records) {
  const [mediumRecord, thumbnailRecord] = records;
  const options = {
    method: 'PUT',
    uri: `${config.nserver}/medias/${mediaId}`,
    body: {
      medium_name: mediumRecord.Key,
      medium_location: mediumRecord.Location,
      thumbnail_name: thumbnailRecord.Key,
      thumbnail_location: thumbnailRecord.Location,
    },
    headers: {
      'Content-Type': 'application/json',
    },
    json: true,
  };

  return rp(options);
}

function processMedia(task) {
  if (process.env.NODE_ENV !== 'production') {
    // Just ack the message if not in prod
    return Promise.resolve('Image has been processed!');
  }

  const mediaResource = JSON.parse(task.content.toString());

  // Skip video files for now (just for simplicity sake)
  const mediaKey = path.parse(mediaResource.Key);
  if (!_.includes(config.image.exts, mediaKey.ext)) {
    return Promise.resolve('Not an image media resource');
  }

  const Bucket = '8weike-media';
  const saveMedia = (buffer, info, suffix) => {
    // TODO: Use Dropbox Lepton library to optimize jpeg image size
    const processedMediaName = `${mediaKey.name}.${suffix}${mediaKey.ext}`;
    // Join folder with the new name
    const processedMediaKey = path.join(mediaKey.dir, processedMediaName);
    return upload.uploadToS3(Bucket, processedMediaKey, buffer);
  };

  return retrieveMedia(Bucket, mediaResource.Key)
    .then((mediaFile) => {
      const mediaData = sharp(mediaFile.Body);
      return mediaData.metadata().then((metadata) => {
        // TODO(tony): In the future we may want to generate dynamic-sized images
        // Resize to medium size
        const mediumPromise = mediaData.clone()
            .resize(null, config.image.medium)
            .withoutEnlargement()
            .toFormat(metadata.format)
            .toBuffer()
            .then((buffer, info) => saveMedia(buffer, info, 'medium'));

        // Resize to thumbnail size
        const thumbnailPromise = mediaData.clone()
            .resize(null, config.image.thumbnail)
            .toFormat(metadata.format)
            .toBuffer()
            .then((buffer, info) => saveMedia(buffer, info, 'thumbnail'));

        return Promise.all([mediumPromise, thumbnailPromise])
            .then((s3Records) => saveMediaMeta(mediaResource.id, s3Records))
            .then(() => Promise.resolve('Image has been processed!'));
      });
    })
}

module.exports = {
  processMedia,
};
