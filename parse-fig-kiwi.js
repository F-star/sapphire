const kiwi = require('kiwi-schema');
const zlib = require('zlib');
const util = require('util');
const inflateRaw = util.promisify(zlib.inflateRaw);
const { decompress } = require('@mongodb-js/zstd');
const fs = require('fs');
const { parseBlob } = require('./parse-blob');

/**
 * 解析 fig-kiwi 格式
 * @param {Buffer} bytes
 */
const parseFigKiwi = async (bytes, outputDir) => {
  // 强行创建 output 目录
  const view = new DataView(bytes.buffer);
  const format = String.fromCharCode(...bytes.subarray(0, 8));
  const validFormats = ['fig-kiwi', 'fig-jam.', 'fig-deck'];
  console.log('format:', format);
  if (!validFormats.includes(format)) {
    throw new Error(
      `格式需要为 'fig-kiwi' 或 'fig-jam.' 或 'fig-deck'，但文件格式为 ${format} `,
    );
  }
  const version = view.getUint32(8, true);

  console.log('version:', version);

  const chunks = [];
  let offset = 12;

  while (offset < bytes.length) {
    const chunkLength = view.getUint32(offset, true);
    offset += 4;
    chunks.push(bytes.slice(offset, offset + chunkLength));
    offset += chunkLength;
  }

  if (chunks.length < 2) throw new Error('切片数量至少为 2');

  const encodedSchema = await uncompressChunk(chunks[0]);
  const schema = kiwi.compileSchema(kiwi.decodeBinarySchema(encodedSchema));

  const encodedData = await uncompressChunk(chunks[1]);
  const data = schema.decodeMessage(encodedData);

  const blobsBase64 = data.blobs.map((blob) => {
    return {
      ...blob,
      bytes: Buffer.from(blob.bytes).toString('base64'),
    };
  });

  // 将 schema 和 data 导出为 json 文件，放到 output 目录下
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(`${outputDir}/schema.json`, JSON.stringify(schema, null, 2));
  fs.writeFileSync(
    `${outputDir}/data-with-blob.json`,
    JSON.stringify({ ...data, blobs: blobsBase64 }, null, 2),
  );

  // 遍历 data.nodeChanges，解析对应的 blob, 并删除 blobs
  parseVectorNetworkBlob(data.nodeChanges, data.blobs);
  delete data.blobs;
  fs.writeFileSync(`${outputDir}/data.json`, JSON.stringify(data, null, 2));
};

// 递归对象，将其中的 vectorNetworkBlob 解析出来，然后改成 vectorNetwork
const parseVectorNetworkBlob = (obj, blobs) => {
  if (Array.isArray(obj)) {
    obj.forEach((item) => parseVectorNetworkBlob(item, blobs));
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (key === 'vectorNetworkBlob' || key === 'commandsBlob') {
        const blobIndex = obj[key];
        const val = parseBlob(key, blobs[blobIndex]);
        // 去掉属性的 blob 后缀
        delete obj[key];
        const keyWithoutBlob = key.replace('Blob', '');
        obj[keyWithoutBlob] = val;
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // 递归处理嵌套对象
        parseVectorNetworkBlob(obj[key], blobs);
      }
    }
  }
};

const uncompressChunk = async (bytes) => {
  try {
    return await inflateRaw(bytes);
  } catch (error) {
    return await decompress(bytes);
  }
};

exports.parseFigKiwi = parseFigKiwi;
