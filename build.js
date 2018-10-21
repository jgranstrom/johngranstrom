const Bundler = require('parcel-bundler');
const Path = require('path');
const JSIIFEPackager = require('./build/JSIIFEPackager');

const options = {
  outDir: './dist',
  publicUrl: './dist/',
  watch: false,
  cache: false,
  cacheDir: '.cache',
  contentHash: true,
  minify: true,
  scopeHoist: true,
  target: 'browser',
  hmr: false,
  sourceMaps: false,
  detailedReport: true,
};

async function runBundle() {
  const bundler = new Bundler(Path.join(__dirname, './src/index.pug'), options);
  bundler.addPackager('js', JSIIFEPackager);
  await bundler.bundle();
}

runBundle();