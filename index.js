const { program } = require('commander');
const StreamZip = require('node-stream-zip');
const fs = require('fs');
const { parseFigKiwi } = require('./parse-fig-kiwi');

program.option('-f, --file <char>');
program.parse();

const options = program.opts();
const filePath = options.file;

// 提取文件名，去掉后缀
const fileName = filePath.split('/').pop().split('.')[0];

// 文件名末尾加个时间格式 年月日小时分钟秒。用 js 实现
const addTimeSuffixStr = (fileName) => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  const timestamp = `${year}${month}${day}${hour}${minute}${second}`;
  return `${fileName}-${timestamp}`;
};

const outputDir = `./output/${addTimeSuffixStr(fileName)}`;

console.log('output folder:', outputDir);

const isZipFile = (filePath) => {
  const buffer = Buffer.alloc(2);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 2, 0);
  fs.closeSync(fd);
  return buffer.toString('hex') === '504b';
};

const unzip = async () => {
  const zip = new StreamZip.async({ file: filePath });
  await zip.extract('', `${outputDir}/unzip-files`);
};

const readAndParseCanvasFig = (filePath) => {
  const data = fs.readFileSync(filePath, null);
  parseFigKiwi(data, outputDir);
};

const readAndParseFig = () => {
  const data = fs.readFileSync(filePath, null);
  parseFigKiwi(data, outputDir);
};

const main = async () => {
  if (isZipFile(filePath)) {
    await unzip();
    const canvasFigPath = `${outputDir}/unzip-files/canvas.fig`;
    readAndParseCanvasFig(canvasFigPath);
  } else {
    readAndParseFig();
  }
};

main();
