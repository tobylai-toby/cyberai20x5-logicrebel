const fs = require('fs');
const path = require('path');

// 定义路径
const sourcePath = path.join('dist-singlefile', 'index.html');
const targetPath = 'logicrebel.html';
const distFolder = 'dist-singlefile';
const newAssetPath = 'https://assets.tobylai.fun/vibe25/logicrebel/assets';
const oldAssetPath = './assets';

// 确保dist-singlefile目录存在
if (!fs.existsSync(distFolder)) {
  console.error('错误: dist-singlefile 目录不存在');
  process.exit(1);
}

// 确保index.html文件存在
if (!fs.existsSync(sourcePath)) {
  console.error('错误: dist-singlefile/index.html 文件不存在');
  process.exit(1);
}

// 移动文件
fs.renameSync(sourcePath, targetPath);
console.log('已将 dist-singlefile/index.html 移动到 logicrebel.html');

// 删除dist-singlefile文件夹
fs.rmSync(distFolder, { recursive: true });
console.log('已删除 dist-singlefile 文件夹');

// 读取文件内容
fs.readFile(targetPath, 'utf8', (err, data) => {
  if (err) {
    console.error('读取文件时出错:', err);
    return;
  }

  // 替换所有匹配的路径
  const result = data.replace(new RegExp(oldAssetPath.replace(/\./g, '\\.'), 'g'), newAssetPath);

  // 写入文件
  fs.writeFile(targetPath, result, 'utf8', (err) => {
    if (err) {
      console.error('写入文件时出错:', err);
      return;
    }

    console.log('资产路径替换完成！');
  });
});