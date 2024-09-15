## 环境

安装 [Nodejs](https://nodejs.org/zh-cn)。

然后在项目根目录下执行安装依赖命令：

```sh
npm install
```

## 解析命令

项目根目录下执行解析命令：

```sh
node index.js -f design.fig
```

解析出来的数据在 output 目录下的 “文件名-时间” 命名的子目录下。

其中：

- schema.json 是解析出来的数据类型
- data-with-blob.json 是解析出来的数据，没有解析 blob；
- data.json 是解析出来的数据，解析了 blob；
- unzip-files 是解压出来的文件，里面包含了 canvas.fig 文件。如果传入的文件已经是 fig-kiwi 格式，则不会有 unzip-files 文件夹。
