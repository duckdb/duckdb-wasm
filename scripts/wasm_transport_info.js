// server example
// https://nodejs.org/api/zlib.html#compressing-http-requests-and-responses
// Running a gzip operation on every request is quite expensive.
// It would be much more efficient to cache the compressed buffer.
const zlib = require('node:zlib');
const http = require('node:http');
const fs = require('node:fs');
const { pipeline, Duplex, Writable, Transform } = require('node:stream');

class ByteCounter extends Transform {
  constructor(options){
    super(options)
    this.byteLength = 0
  }
  _transform(chunk, encoding, callback){
    this.byteLength += chunk.byteLength;
    this.push(chunk, encoding);
    callback(null)
  }
}

class NullSinc extends Writable {
  _write(chunk, encoding, callback){
    callback(null)
  }
}



function retrieveFile(path, acceptEncoding){
  const raw = fs.createReadStream(__dirname + '/../lib/build/wasm' + path);
  const onError = (err) => {
    if (err) {
      // If an error occurs, there's not much we can do because
      // the server has already sent the 200 response code and
      // some amount of data has already been sent to the client.
      // The best we can do is terminate the response immediately
      // and log the error.
      content.end();
      console.error('An error occurred:', err);
    }
  };
  
  const uncompressed = new ByteCounter()
  const content = new ByteCounter()
  let encoding;
  // Note: This is not a conformant accept-encoding parser.
  // See https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.3
  if (/\bbr\b/.test(acceptEncoding)) {
    encoding = 'br'
    pipeline(raw, uncompressed, zlib.createBrotliCompress(),  content, onError);
  } else if (/\bdeflate\b/.test(acceptEncoding)) {
    encoding = 'deflate'
    pipeline(raw, uncompressed, zlib.createDeflate(), content, onError);
  } else if (/\bgzip\b/.test(acceptEncoding)) {
    encoding = 'gzip'
    pipeline(raw, uncompressed, zlib.createGzip(), content, onError);
  } else {
    encoding = 'identity'
    pipeline(raw, uncompressed, content, onError);
  }
  content.once('end', () => {
    console.log(`${path}, ${encoding}, size: ${content.byteLength}`)
  })
  return {content, encoding}
}
function getTime(){
  const [sec, nsec] = process.hrtime()
  return sec + 1e-9*nsec
}
async function compare() {
  const sizeTable = {}
  const timeTable = {}
  for(const mode of ['relperf', 'relsize', 'dev']){
    for(const feature of ['coi', 'eh', 'mvp']){
      const key = `${mode}-${feature}`;
      sizeTable[key] = {}
      timeTable[key] = {}
      for(const encoding of ['br', 'gzip', 'deflate', 'identity']){
        console.time(key + ' ' + encoding)
        try{
          const nl = new NullSinc()
          const t0 = getTime()
          const {content} = retrieveFile(`/${key}/duckdb_wasm.wasm`, encoding)
          content.pipe(nl);
          await new Promise(resolve => content.once('end', resolve))
          timeTable[key][encoding] = getTime() - t0;
          sizeTable[key][encoding] = content.byteLength;  
        }catch(e) {
          console.log(e)
          console.log(`${key} ${encoding} failed`)
        }
        console.timeEnd(key + ' ' + encoding)
      }
    }
  }
  console.log('Writing results to to misc/compression.json')
  fs.writeFileSync(__dirname + '/../misc/compression.json', 
    JSON.stringify({size: sizeTable, time: timeTable}, null, 2))
}

if(process.argv.includes('--compare')){
  compare()
}

// If you want to check it externally

let port = +process.env['PORT'] || 1337
if(process.argv.includes('--port')){
  port = process.argv[process.argv.indexOf('--port')]
}

if(process.argv.includes('--serve')){
  http.createServer((request, response) => {
    // Store both a compressed and an uncompressed version of the resource.
    let acceptEncoding = request.headers['accept-encoding'];
    if (!acceptEncoding) {
      acceptEncoding = '';
    }
    const [path, queryEncoding] = request.url.split('?')
    console.log(request.url, acceptEncoding)
    const {content, encoding} = retrieveFile(path, queryEncoding || acceptEncoding)
    response.writeHead(200, {
      'Content-Encoding': encoding, 
      'Access-Control-Allow-Origin': "*",
      'Vary': "Accept-Encoding"
    })
    content.pipe(response);
  
  }).listen(port);

  // To test the serve you could do something like
  // curl -H --compressed 'Accept-Encoding: gzip' 127.0.0.1:1337/relperf-coi/duckdb_wasm.wasm | wc -c
  // curl -H 'Accept-Encoding: gzip' 127.0.0.1:1337/relperf-coi/duckdb_wasm.wasm | wc -c
  // curl -H 'Accept-Encoding: br' 127.0.0.1:1337/relperf-coi/duckdb_wasm.wasm | wc -c
  // 
  // You could also test it from a browser
  async function _checkIntegrity(){
    const ref = await (await fetch('http://127.0.0.1:1337/relperf-coi/duckdb_wasm.wasm?identity')).text()
    
    if(ref !== await (await fetch('http://127.0.0.1:1337/relperf-coi/duckdb_wasm.wasm?br')).text()){
      console.log('Brotli encoding failed')
    }
  
    if(ref !== await (await fetch('http://127.0.0.1:1337/relperf-coi/duckdb_wasm.wasm?deflate')).text()){
      console.log('Deflate failed')
    }
  
    if(ref !== await (await fetch('http://127.0.0.1:1337/relperf-coi/duckdb_wasm.wasm?gzip')).text()){
      console.log('gzip failed')
    }
  }
}
