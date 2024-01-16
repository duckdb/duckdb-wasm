"use strict";
var duckdb = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // ../../node_modules/js-sha256/src/sha256.js
  var require_sha256 = __commonJS({
    "../../node_modules/js-sha256/src/sha256.js"(exports, module) {
      (function() {
        "use strict";
        var ERROR = "input is invalid type";
        var WINDOW = typeof window === "object";
        var root = WINDOW ? window : {};
        if (root.JS_SHA256_NO_WINDOW) {
          WINDOW = false;
        }
        var WEB_WORKER = !WINDOW && typeof self === "object";
        var NODE_JS = !root.JS_SHA256_NO_NODE_JS && typeof process === "object" && process.versions && process.versions.node;
        if (NODE_JS) {
          root = global;
        } else if (WEB_WORKER) {
          root = self;
        }
        var COMMON_JS = !root.JS_SHA256_NO_COMMON_JS && typeof module === "object" && module.exports;
        var AMD = typeof define === "function" && define.amd;
        var ARRAY_BUFFER = !root.JS_SHA256_NO_ARRAY_BUFFER && typeof ArrayBuffer !== "undefined";
        var HEX_CHARS = "0123456789abcdef".split("");
        var EXTRA = [-2147483648, 8388608, 32768, 128];
        var SHIFT = [24, 16, 8, 0];
        var K = [
          1116352408,
          1899447441,
          3049323471,
          3921009573,
          961987163,
          1508970993,
          2453635748,
          2870763221,
          3624381080,
          310598401,
          607225278,
          1426881987,
          1925078388,
          2162078206,
          2614888103,
          3248222580,
          3835390401,
          4022224774,
          264347078,
          604807628,
          770255983,
          1249150122,
          1555081692,
          1996064986,
          2554220882,
          2821834349,
          2952996808,
          3210313671,
          3336571891,
          3584528711,
          113926993,
          338241895,
          666307205,
          773529912,
          1294757372,
          1396182291,
          1695183700,
          1986661051,
          2177026350,
          2456956037,
          2730485921,
          2820302411,
          3259730800,
          3345764771,
          3516065817,
          3600352804,
          4094571909,
          275423344,
          430227734,
          506948616,
          659060556,
          883997877,
          958139571,
          1322822218,
          1537002063,
          1747873779,
          1955562222,
          2024104815,
          2227730452,
          2361852424,
          2428436474,
          2756734187,
          3204031479,
          3329325298
        ];
        var OUTPUT_TYPES = ["hex", "array", "digest", "arrayBuffer"];
        var blocks = [];
        if (root.JS_SHA256_NO_NODE_JS || !Array.isArray) {
          Array.isArray = function(obj) {
            return Object.prototype.toString.call(obj) === "[object Array]";
          };
        }
        if (ARRAY_BUFFER && (root.JS_SHA256_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
          ArrayBuffer.isView = function(obj) {
            return typeof obj === "object" && obj.buffer && obj.buffer.constructor === ArrayBuffer;
          };
        }
        var createOutputMethod = function(outputType, is2242) {
          return function(message) {
            return new Sha256(is2242, true).update(message)[outputType]();
          };
        };
        var createMethod = function(is2242) {
          var method2 = createOutputMethod("hex", is2242);
          if (NODE_JS) {
            method2 = nodeWrap(method2, is2242);
          }
          method2.create = function() {
            return new Sha256(is2242);
          };
          method2.update = function(message) {
            return method2.create().update(message);
          };
          for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
            var type = OUTPUT_TYPES[i];
            method2[type] = createOutputMethod(type, is2242);
          }
          return method2;
        };
        var nodeWrap = function(method, is224) {
          var crypto = eval("require('crypto')");
          var Buffer = eval("require('buffer').Buffer");
          var algorithm = is224 ? "sha224" : "sha256";
          var nodeMethod = function(message) {
            if (typeof message === "string") {
              return crypto.createHash(algorithm).update(message, "utf8").digest("hex");
            } else {
              if (message === null || message === void 0) {
                throw new Error(ERROR);
              } else if (message.constructor === ArrayBuffer) {
                message = new Uint8Array(message);
              }
            }
            if (Array.isArray(message) || ArrayBuffer.isView(message) || message.constructor === Buffer) {
              return crypto.createHash(algorithm).update(new Buffer(message)).digest("hex");
            } else {
              return method(message);
            }
          };
          return nodeMethod;
        };
        var createHmacOutputMethod = function(outputType, is2242) {
          return function(key, message) {
            return new HmacSha256(key, is2242, true).update(message)[outputType]();
          };
        };
        var createHmacMethod = function(is2242) {
          var method2 = createHmacOutputMethod("hex", is2242);
          method2.create = function(key) {
            return new HmacSha256(key, is2242);
          };
          method2.update = function(key, message) {
            return method2.create(key).update(message);
          };
          for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
            var type = OUTPUT_TYPES[i];
            method2[type] = createHmacOutputMethod(type, is2242);
          }
          return method2;
        };
        function Sha256(is2242, sharedMemory) {
          if (sharedMemory) {
            blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
            this.blocks = blocks;
          } else {
            this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          }
          if (is2242) {
            this.h0 = 3238371032;
            this.h1 = 914150663;
            this.h2 = 812702999;
            this.h3 = 4144912697;
            this.h4 = 4290775857;
            this.h5 = 1750603025;
            this.h6 = 1694076839;
            this.h7 = 3204075428;
          } else {
            this.h0 = 1779033703;
            this.h1 = 3144134277;
            this.h2 = 1013904242;
            this.h3 = 2773480762;
            this.h4 = 1359893119;
            this.h5 = 2600822924;
            this.h6 = 528734635;
            this.h7 = 1541459225;
          }
          this.block = this.start = this.bytes = this.hBytes = 0;
          this.finalized = this.hashed = false;
          this.first = true;
          this.is224 = is2242;
        }
        Sha256.prototype.update = function(message) {
          if (this.finalized) {
            return;
          }
          var notString, type = typeof message;
          if (type !== "string") {
            if (type === "object") {
              if (message === null) {
                throw new Error(ERROR);
              } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
                message = new Uint8Array(message);
              } else if (!Array.isArray(message)) {
                if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
                  throw new Error(ERROR);
                }
              }
            } else {
              throw new Error(ERROR);
            }
            notString = true;
          }
          var code, index = 0, i, length = message.length, blocks2 = this.blocks;
          while (index < length) {
            if (this.hashed) {
              this.hashed = false;
              blocks2[0] = this.block;
              blocks2[16] = blocks2[1] = blocks2[2] = blocks2[3] = blocks2[4] = blocks2[5] = blocks2[6] = blocks2[7] = blocks2[8] = blocks2[9] = blocks2[10] = blocks2[11] = blocks2[12] = blocks2[13] = blocks2[14] = blocks2[15] = 0;
            }
            if (notString) {
              for (i = this.start; index < length && i < 64; ++index) {
                blocks2[i >> 2] |= message[index] << SHIFT[i++ & 3];
              }
            } else {
              for (i = this.start; index < length && i < 64; ++index) {
                code = message.charCodeAt(index);
                if (code < 128) {
                  blocks2[i >> 2] |= code << SHIFT[i++ & 3];
                } else if (code < 2048) {
                  blocks2[i >> 2] |= (192 | code >> 6) << SHIFT[i++ & 3];
                  blocks2[i >> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
                } else if (code < 55296 || code >= 57344) {
                  blocks2[i >> 2] |= (224 | code >> 12) << SHIFT[i++ & 3];
                  blocks2[i >> 2] |= (128 | code >> 6 & 63) << SHIFT[i++ & 3];
                  blocks2[i >> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
                } else {
                  code = 65536 + ((code & 1023) << 10 | message.charCodeAt(++index) & 1023);
                  blocks2[i >> 2] |= (240 | code >> 18) << SHIFT[i++ & 3];
                  blocks2[i >> 2] |= (128 | code >> 12 & 63) << SHIFT[i++ & 3];
                  blocks2[i >> 2] |= (128 | code >> 6 & 63) << SHIFT[i++ & 3];
                  blocks2[i >> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
                }
              }
            }
            this.lastByteIndex = i;
            this.bytes += i - this.start;
            if (i >= 64) {
              this.block = blocks2[16];
              this.start = i - 64;
              this.hash();
              this.hashed = true;
            } else {
              this.start = i;
            }
          }
          if (this.bytes > 4294967295) {
            this.hBytes += this.bytes / 4294967296 << 0;
            this.bytes = this.bytes % 4294967296;
          }
          return this;
        };
        Sha256.prototype.finalize = function() {
          if (this.finalized) {
            return;
          }
          this.finalized = true;
          var blocks2 = this.blocks, i = this.lastByteIndex;
          blocks2[16] = this.block;
          blocks2[i >> 2] |= EXTRA[i & 3];
          this.block = blocks2[16];
          if (i >= 56) {
            if (!this.hashed) {
              this.hash();
            }
            blocks2[0] = this.block;
            blocks2[16] = blocks2[1] = blocks2[2] = blocks2[3] = blocks2[4] = blocks2[5] = blocks2[6] = blocks2[7] = blocks2[8] = blocks2[9] = blocks2[10] = blocks2[11] = blocks2[12] = blocks2[13] = blocks2[14] = blocks2[15] = 0;
          }
          blocks2[14] = this.hBytes << 3 | this.bytes >>> 29;
          blocks2[15] = this.bytes << 3;
          this.hash();
        };
        Sha256.prototype.hash = function() {
          var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6, h = this.h7, blocks2 = this.blocks, j, s0, s1, maj, t1, t2, ch, ab, da, cd, bc;
          for (j = 16; j < 64; ++j) {
            t1 = blocks2[j - 15];
            s0 = (t1 >>> 7 | t1 << 25) ^ (t1 >>> 18 | t1 << 14) ^ t1 >>> 3;
            t1 = blocks2[j - 2];
            s1 = (t1 >>> 17 | t1 << 15) ^ (t1 >>> 19 | t1 << 13) ^ t1 >>> 10;
            blocks2[j] = blocks2[j - 16] + s0 + blocks2[j - 7] + s1 << 0;
          }
          bc = b & c;
          for (j = 0; j < 64; j += 4) {
            if (this.first) {
              if (this.is224) {
                ab = 300032;
                t1 = blocks2[0] - 1413257819;
                h = t1 - 150054599 << 0;
                d = t1 + 24177077 << 0;
              } else {
                ab = 704751109;
                t1 = blocks2[0] - 210244248;
                h = t1 - 1521486534 << 0;
                d = t1 + 143694565 << 0;
              }
              this.first = false;
            } else {
              s0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
              s1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
              ab = a & b;
              maj = ab ^ a & c ^ bc;
              ch = e & f ^ ~e & g;
              t1 = h + s1 + ch + K[j] + blocks2[j];
              t2 = s0 + maj;
              h = d + t1 << 0;
              d = t1 + t2 << 0;
            }
            s0 = (d >>> 2 | d << 30) ^ (d >>> 13 | d << 19) ^ (d >>> 22 | d << 10);
            s1 = (h >>> 6 | h << 26) ^ (h >>> 11 | h << 21) ^ (h >>> 25 | h << 7);
            da = d & a;
            maj = da ^ d & b ^ ab;
            ch = h & e ^ ~h & f;
            t1 = g + s1 + ch + K[j + 1] + blocks2[j + 1];
            t2 = s0 + maj;
            g = c + t1 << 0;
            c = t1 + t2 << 0;
            s0 = (c >>> 2 | c << 30) ^ (c >>> 13 | c << 19) ^ (c >>> 22 | c << 10);
            s1 = (g >>> 6 | g << 26) ^ (g >>> 11 | g << 21) ^ (g >>> 25 | g << 7);
            cd = c & d;
            maj = cd ^ c & a ^ da;
            ch = g & h ^ ~g & e;
            t1 = f + s1 + ch + K[j + 2] + blocks2[j + 2];
            t2 = s0 + maj;
            f = b + t1 << 0;
            b = t1 + t2 << 0;
            s0 = (b >>> 2 | b << 30) ^ (b >>> 13 | b << 19) ^ (b >>> 22 | b << 10);
            s1 = (f >>> 6 | f << 26) ^ (f >>> 11 | f << 21) ^ (f >>> 25 | f << 7);
            bc = b & c;
            maj = bc ^ b & d ^ cd;
            ch = f & g ^ ~f & h;
            t1 = e + s1 + ch + K[j + 3] + blocks2[j + 3];
            t2 = s0 + maj;
            e = a + t1 << 0;
            a = t1 + t2 << 0;
          }
          this.h0 = this.h0 + a << 0;
          this.h1 = this.h1 + b << 0;
          this.h2 = this.h2 + c << 0;
          this.h3 = this.h3 + d << 0;
          this.h4 = this.h4 + e << 0;
          this.h5 = this.h5 + f << 0;
          this.h6 = this.h6 + g << 0;
          this.h7 = this.h7 + h << 0;
        };
        Sha256.prototype.hex = function() {
          this.finalize();
          var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5, h6 = this.h6, h7 = this.h7;
          var hex = HEX_CHARS[h0 >> 28 & 15] + HEX_CHARS[h0 >> 24 & 15] + HEX_CHARS[h0 >> 20 & 15] + HEX_CHARS[h0 >> 16 & 15] + HEX_CHARS[h0 >> 12 & 15] + HEX_CHARS[h0 >> 8 & 15] + HEX_CHARS[h0 >> 4 & 15] + HEX_CHARS[h0 & 15] + HEX_CHARS[h1 >> 28 & 15] + HEX_CHARS[h1 >> 24 & 15] + HEX_CHARS[h1 >> 20 & 15] + HEX_CHARS[h1 >> 16 & 15] + HEX_CHARS[h1 >> 12 & 15] + HEX_CHARS[h1 >> 8 & 15] + HEX_CHARS[h1 >> 4 & 15] + HEX_CHARS[h1 & 15] + HEX_CHARS[h2 >> 28 & 15] + HEX_CHARS[h2 >> 24 & 15] + HEX_CHARS[h2 >> 20 & 15] + HEX_CHARS[h2 >> 16 & 15] + HEX_CHARS[h2 >> 12 & 15] + HEX_CHARS[h2 >> 8 & 15] + HEX_CHARS[h2 >> 4 & 15] + HEX_CHARS[h2 & 15] + HEX_CHARS[h3 >> 28 & 15] + HEX_CHARS[h3 >> 24 & 15] + HEX_CHARS[h3 >> 20 & 15] + HEX_CHARS[h3 >> 16 & 15] + HEX_CHARS[h3 >> 12 & 15] + HEX_CHARS[h3 >> 8 & 15] + HEX_CHARS[h3 >> 4 & 15] + HEX_CHARS[h3 & 15] + HEX_CHARS[h4 >> 28 & 15] + HEX_CHARS[h4 >> 24 & 15] + HEX_CHARS[h4 >> 20 & 15] + HEX_CHARS[h4 >> 16 & 15] + HEX_CHARS[h4 >> 12 & 15] + HEX_CHARS[h4 >> 8 & 15] + HEX_CHARS[h4 >> 4 & 15] + HEX_CHARS[h4 & 15] + HEX_CHARS[h5 >> 28 & 15] + HEX_CHARS[h5 >> 24 & 15] + HEX_CHARS[h5 >> 20 & 15] + HEX_CHARS[h5 >> 16 & 15] + HEX_CHARS[h5 >> 12 & 15] + HEX_CHARS[h5 >> 8 & 15] + HEX_CHARS[h5 >> 4 & 15] + HEX_CHARS[h5 & 15] + HEX_CHARS[h6 >> 28 & 15] + HEX_CHARS[h6 >> 24 & 15] + HEX_CHARS[h6 >> 20 & 15] + HEX_CHARS[h6 >> 16 & 15] + HEX_CHARS[h6 >> 12 & 15] + HEX_CHARS[h6 >> 8 & 15] + HEX_CHARS[h6 >> 4 & 15] + HEX_CHARS[h6 & 15];
          if (!this.is224) {
            hex += HEX_CHARS[h7 >> 28 & 15] + HEX_CHARS[h7 >> 24 & 15] + HEX_CHARS[h7 >> 20 & 15] + HEX_CHARS[h7 >> 16 & 15] + HEX_CHARS[h7 >> 12 & 15] + HEX_CHARS[h7 >> 8 & 15] + HEX_CHARS[h7 >> 4 & 15] + HEX_CHARS[h7 & 15];
          }
          return hex;
        };
        Sha256.prototype.toString = Sha256.prototype.hex;
        Sha256.prototype.digest = function() {
          this.finalize();
          var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5, h6 = this.h6, h7 = this.h7;
          var arr = [
            h0 >> 24 & 255,
            h0 >> 16 & 255,
            h0 >> 8 & 255,
            h0 & 255,
            h1 >> 24 & 255,
            h1 >> 16 & 255,
            h1 >> 8 & 255,
            h1 & 255,
            h2 >> 24 & 255,
            h2 >> 16 & 255,
            h2 >> 8 & 255,
            h2 & 255,
            h3 >> 24 & 255,
            h3 >> 16 & 255,
            h3 >> 8 & 255,
            h3 & 255,
            h4 >> 24 & 255,
            h4 >> 16 & 255,
            h4 >> 8 & 255,
            h4 & 255,
            h5 >> 24 & 255,
            h5 >> 16 & 255,
            h5 >> 8 & 255,
            h5 & 255,
            h6 >> 24 & 255,
            h6 >> 16 & 255,
            h6 >> 8 & 255,
            h6 & 255
          ];
          if (!this.is224) {
            arr.push(h7 >> 24 & 255, h7 >> 16 & 255, h7 >> 8 & 255, h7 & 255);
          }
          return arr;
        };
        Sha256.prototype.array = Sha256.prototype.digest;
        Sha256.prototype.arrayBuffer = function() {
          this.finalize();
          var buffer = new ArrayBuffer(this.is224 ? 28 : 32);
          var dataView = new DataView(buffer);
          dataView.setUint32(0, this.h0);
          dataView.setUint32(4, this.h1);
          dataView.setUint32(8, this.h2);
          dataView.setUint32(12, this.h3);
          dataView.setUint32(16, this.h4);
          dataView.setUint32(20, this.h5);
          dataView.setUint32(24, this.h6);
          if (!this.is224) {
            dataView.setUint32(28, this.h7);
          }
          return buffer;
        };
        function HmacSha256(key, is2242, sharedMemory) {
          var i, type = typeof key;
          if (type === "string") {
            var bytes = [], length = key.length, index = 0, code;
            for (i = 0; i < length; ++i) {
              code = key.charCodeAt(i);
              if (code < 128) {
                bytes[index++] = code;
              } else if (code < 2048) {
                bytes[index++] = 192 | code >> 6;
                bytes[index++] = 128 | code & 63;
              } else if (code < 55296 || code >= 57344) {
                bytes[index++] = 224 | code >> 12;
                bytes[index++] = 128 | code >> 6 & 63;
                bytes[index++] = 128 | code & 63;
              } else {
                code = 65536 + ((code & 1023) << 10 | key.charCodeAt(++i) & 1023);
                bytes[index++] = 240 | code >> 18;
                bytes[index++] = 128 | code >> 12 & 63;
                bytes[index++] = 128 | code >> 6 & 63;
                bytes[index++] = 128 | code & 63;
              }
            }
            key = bytes;
          } else {
            if (type === "object") {
              if (key === null) {
                throw new Error(ERROR);
              } else if (ARRAY_BUFFER && key.constructor === ArrayBuffer) {
                key = new Uint8Array(key);
              } else if (!Array.isArray(key)) {
                if (!ARRAY_BUFFER || !ArrayBuffer.isView(key)) {
                  throw new Error(ERROR);
                }
              }
            } else {
              throw new Error(ERROR);
            }
          }
          if (key.length > 64) {
            key = new Sha256(is2242, true).update(key).array();
          }
          var oKeyPad = [], iKeyPad = [];
          for (i = 0; i < 64; ++i) {
            var b = key[i] || 0;
            oKeyPad[i] = 92 ^ b;
            iKeyPad[i] = 54 ^ b;
          }
          Sha256.call(this, is2242, sharedMemory);
          this.update(iKeyPad);
          this.oKeyPad = oKeyPad;
          this.inner = true;
          this.sharedMemory = sharedMemory;
        }
        HmacSha256.prototype = new Sha256();
        HmacSha256.prototype.finalize = function() {
          Sha256.prototype.finalize.call(this);
          if (this.inner) {
            this.inner = false;
            var innerHash = this.array();
            Sha256.call(this, this.is224, this.sharedMemory);
            this.update(this.oKeyPad);
            this.update(innerHash);
            Sha256.prototype.finalize.call(this);
          }
        };
        var exports = createMethod();
        exports.sha256 = exports;
        exports.sha224 = createMethod(true);
        exports.sha256.hmac = createHmacMethod();
        exports.sha224.hmac = createHmacMethod(true);
        if (COMMON_JS) {
          module.exports = exports;
        } else {
          root.sha256 = exports.sha256;
          root.sha224 = exports.sha224;
          if (AMD) {
            define(function() {
              return exports;
            });
          }
        }
      })();
    }
  });

  // (disabled):fs
  var require_fs = __commonJS({
    "(disabled):fs"() {
    }
  });

  // (disabled):path
  var require_path = __commonJS({
    "(disabled):path"() {
    }
  });

  // src/bindings/duckdb-mvp.js
  var require_duckdb_mvp = __commonJS({
    "src/bindings/duckdb-mvp.js"(exports2, module2) {
      "use strict";
      var DuckDB3 = (() => {
        var _scriptDir = typeof document !== "undefined" && document.currentScript ? document.currentScript.src : void 0;
        if (typeof __filename !== "undefined")
          _scriptDir = _scriptDir || __filename;
        return function(moduleArg = {}) {
          var Module = moduleArg;
          var readyPromiseResolve, readyPromiseReject;
          Module["ready"] = new Promise((resolve, reject) => {
            readyPromiseResolve = resolve;
            readyPromiseReject = reject;
          });
          var moduleOverrides = Object.assign({}, Module);
          var arguments_ = [];
          var thisProgram = "./this.program";
          var quit_ = (status, toThrow) => {
            throw toThrow;
          };
          var ENVIRONMENT_IS_WEB = typeof window == "object";
          var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
          var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
          var scriptDirectory = "";
          function locateFile(path) {
            if (Module["locateFile"]) {
              return Module["locateFile"](path, scriptDirectory);
            }
            return scriptDirectory + path;
          }
          var read_, readAsync, readBinary;
          if (ENVIRONMENT_IS_NODE) {
            var fs = require_fs();
            var nodePath = require_path();
            if (ENVIRONMENT_IS_WORKER) {
              scriptDirectory = nodePath.dirname(scriptDirectory) + "/";
            } else {
              scriptDirectory = __dirname + "/";
            }
            read_ = (filename, binary) => {
              filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
              return fs.readFileSync(filename, binary ? void 0 : "utf8");
            };
            readBinary = (filename) => {
              var ret = read_(filename, true);
              if (!ret.buffer) {
                ret = new Uint8Array(ret);
              }
              return ret;
            };
            readAsync = (filename, onload, onerror, binary = true) => {
              filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
              fs.readFile(filename, binary ? void 0 : "utf8", (err2, data) => {
                if (err2)
                  onerror(err2);
                else
                  onload(binary ? data.buffer : data);
              });
            };
            if (!Module["thisProgram"] && process.argv.length > 1) {
              thisProgram = process.argv[1].replace(/\\/g, "/");
            }
            arguments_ = process.argv.slice(2);
            quit_ = (status, toThrow) => {
              process.exitCode = status;
              throw toThrow;
            };
            Module["inspect"] = () => "[Emscripten Module object]";
          } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
            if (ENVIRONMENT_IS_WORKER) {
              scriptDirectory = self.location.href;
            } else if (typeof document != "undefined" && document.currentScript) {
              scriptDirectory = document.currentScript.src;
            }
            if (_scriptDir) {
              scriptDirectory = _scriptDir;
            }
            if (scriptDirectory.indexOf("blob:") !== 0) {
              scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
            } else {
              scriptDirectory = "";
            }
            {
              read_ = (url) => {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, false);
                xhr.send(null);
                return xhr.responseText;
              };
              if (ENVIRONMENT_IS_WORKER) {
                readBinary = (url) => {
                  var xhr = new XMLHttpRequest();
                  xhr.open("GET", url, false);
                  xhr.responseType = "arraybuffer";
                  xhr.send(null);
                  return new Uint8Array(xhr.response);
                };
              }
              readAsync = (url, onload, onerror) => {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.responseType = "arraybuffer";
                xhr.onload = () => {
                  if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                    onload(xhr.response);
                    return;
                  }
                  onerror();
                };
                xhr.onerror = onerror;
                xhr.send(null);
              };
            }
          } else {
          }
          var out = Module["print"] || console.log.bind(console);
          var err = Module["printErr"] || console.error.bind(console);
          Object.assign(Module, moduleOverrides);
          moduleOverrides = null;
          if (Module["arguments"])
            arguments_ = Module["arguments"];
          if (Module["thisProgram"])
            thisProgram = Module["thisProgram"];
          if (Module["quit"])
            quit_ = Module["quit"];
          var wasmBinary;
          if (Module["wasmBinary"])
            wasmBinary = Module["wasmBinary"];
          if (typeof WebAssembly != "object") {
            abort("no native wasm support detected");
          }
          var wasmMemory;
          var ABORT = false;
          var EXITSTATUS;
          function assert(condition, text) {
            if (!condition) {
              abort(text);
            }
          }
          var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
          function updateMemoryViews() {
            var b = wasmMemory.buffer;
            Module["HEAP8"] = HEAP8 = new Int8Array(b);
            Module["HEAP16"] = HEAP16 = new Int16Array(b);
            Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
            Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
            Module["HEAP32"] = HEAP32 = new Int32Array(b);
            Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
            Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
            Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
          }
          var __ATPRERUN__ = [];
          var __ATINIT__ = [];
          var __ATMAIN__ = [];
          var __ATPOSTRUN__ = [];
          var runtimeInitialized = false;
          function preRun() {
            if (Module["preRun"]) {
              if (typeof Module["preRun"] == "function")
                Module["preRun"] = [Module["preRun"]];
              while (Module["preRun"].length) {
                addOnPreRun(Module["preRun"].shift());
              }
            }
            callRuntimeCallbacks(__ATPRERUN__);
          }
          function initRuntime() {
            runtimeInitialized = true;
            callRuntimeCallbacks(__ATINIT__);
          }
          function preMain() {
            callRuntimeCallbacks(__ATMAIN__);
          }
          function postRun() {
            if (Module["postRun"]) {
              if (typeof Module["postRun"] == "function")
                Module["postRun"] = [Module["postRun"]];
              while (Module["postRun"].length) {
                addOnPostRun(Module["postRun"].shift());
              }
            }
            callRuntimeCallbacks(__ATPOSTRUN__);
          }
          function addOnPreRun(cb) {
            __ATPRERUN__.unshift(cb);
          }
          function addOnInit(cb) {
            __ATINIT__.unshift(cb);
          }
          function addOnPostRun(cb) {
            __ATPOSTRUN__.unshift(cb);
          }
          var runDependencies = 0;
          var runDependencyWatcher = null;
          var dependenciesFulfilled = null;
          function addRunDependency(id) {
            runDependencies++;
            Module["monitorRunDependencies"]?.(runDependencies);
          }
          function removeRunDependency(id) {
            runDependencies--;
            Module["monitorRunDependencies"]?.(runDependencies);
            if (runDependencies == 0) {
              if (runDependencyWatcher !== null) {
                clearInterval(runDependencyWatcher);
                runDependencyWatcher = null;
              }
              if (dependenciesFulfilled) {
                var callback = dependenciesFulfilled;
                dependenciesFulfilled = null;
                callback();
              }
            }
          }
          function abort(what) {
            Module["onAbort"]?.(what);
            what = "Aborted(" + what + ")";
            err(what);
            ABORT = true;
            EXITSTATUS = 1;
            what += ". Build with -sASSERTIONS for more info.";
            var e = new WebAssembly.RuntimeError(what);
            readyPromiseReject(e);
            throw e;
          }
          var dataURIPrefix = "data:application/octet-stream;base64,";
          var isDataURI = (filename) => filename.startsWith(dataURIPrefix);
          var isFileURI = (filename) => filename.startsWith("file://");
          var wasmBinaryFile;
          wasmBinaryFile = "./duckdb-mvp.wasm";
          if (!isDataURI(wasmBinaryFile)) {
            wasmBinaryFile = locateFile(wasmBinaryFile);
          }
          function getBinarySync(file) {
            if (file == wasmBinaryFile && wasmBinary) {
              return new Uint8Array(wasmBinary);
            }
            if (readBinary) {
              return readBinary(file);
            }
            throw "both async and sync fetching of the wasm failed";
          }
          function getBinaryPromise(binaryFile) {
            if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
              if (typeof fetch == "function") {
                return fetch(binaryFile, { credentials: "same-origin" }).then((response) => {
                  if (!response["ok"]) {
                    throw "failed to load wasm binary file at '" + binaryFile + "'";
                  }
                  return response["arrayBuffer"]();
                }).catch(() => getBinarySync(binaryFile));
              }
            }
            return Promise.resolve().then(() => getBinarySync(binaryFile));
          }
          function instantiateArrayBuffer(binaryFile, imports, receiver) {
            return getBinaryPromise(binaryFile).then((binary) => WebAssembly.instantiate(binary, imports)).then((instance9) => instance9).then(receiver, (reason) => {
              err(`failed to asynchronously prepare wasm: ${reason}`);
              abort(reason);
            });
          }
          function instantiateAsync(binary, binaryFile, imports, callback) {
            if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
              return fetch(binaryFile, { credentials: "same-origin" }).then((response) => {
                var result = WebAssembly.instantiateStreaming(response, imports);
                return result.then(callback, function(reason) {
                  err(`wasm streaming compile failed: ${reason}`);
                  err("falling back to ArrayBuffer instantiation");
                  return instantiateArrayBuffer(binaryFile, imports, callback);
                });
              });
            }
            return instantiateArrayBuffer(binaryFile, imports, callback);
          }
          function createWasm() {
            var info = { "a": wasmImports };
            function receiveInstance(instance9, module3) {
              wasmExports = instance9.exports;
              wasmExports = applySignatureConversions(wasmExports);
              wasmMemory = wasmExports["xf"];
              updateMemoryViews();
              wasmTable = wasmExports["Af"];
              addOnInit(wasmExports["yf"]);
              removeRunDependency("wasm-instantiate");
              return wasmExports;
            }
            addRunDependency("wasm-instantiate");
            function receiveInstantiationResult(result) {
              receiveInstance(result["instance"]);
            }
            if (Module["instantiateWasm"]) {
              try {
                return Module["instantiateWasm"](info, receiveInstance);
              } catch (e) {
                err(`Module.instantiateWasm callback failed with error: ${e}`);
                readyPromiseReject(e);
              }
            }
            instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
            return {};
          }
          var tempDouble;
          var tempI64;
          function ExitStatus(status) {
            this.name = "ExitStatus";
            this.message = `Program terminated with exit(${status})`;
            this.status = status;
          }
          var callRuntimeCallbacks = (callbacks) => {
            while (callbacks.length > 0) {
              callbacks.shift()(Module);
            }
          };
          var noExitRuntime = Module["noExitRuntime"] || true;
          var exceptionCaught = [];
          var uncaughtExceptionCount = 0;
          var convertI32PairToI53Checked = (lo, hi) => hi + 2097152 >>> 0 < 4194305 - !!lo ? (lo >>> 0) + hi * 4294967296 : NaN;
          function ___cxa_begin_catch(ptr) {
            ptr >>>= 0;
            var info = new ExceptionInfo(ptr);
            if (!info.get_caught()) {
              info.set_caught(true);
              uncaughtExceptionCount--;
            }
            info.set_rethrown(false);
            exceptionCaught.push(info);
            ___cxa_increment_exception_refcount(info.excPtr);
            return info.get_exception_ptr();
          }
          var exceptionLast = 0;
          var ___cxa_end_catch = () => {
            _setThrew(0, 0);
            var info = exceptionCaught.pop();
            ___cxa_decrement_exception_refcount(info.excPtr);
            exceptionLast = 0;
          };
          function ExceptionInfo(excPtr) {
            this.excPtr = excPtr;
            this.ptr = excPtr - 24;
            this.set_type = function(type) {
              HEAPU32[this.ptr + 4 >>> 2 >>> 0] = type;
            };
            this.get_type = function() {
              return HEAPU32[this.ptr + 4 >>> 2 >>> 0];
            };
            this.set_destructor = function(destructor) {
              HEAPU32[this.ptr + 8 >>> 2 >>> 0] = destructor;
            };
            this.get_destructor = function() {
              return HEAPU32[this.ptr + 8 >>> 2 >>> 0];
            };
            this.set_caught = function(caught) {
              caught = caught ? 1 : 0;
              HEAP8[this.ptr + 12 >>> 0 >>> 0] = caught;
            };
            this.get_caught = function() {
              return HEAP8[this.ptr + 12 >>> 0 >>> 0] != 0;
            };
            this.set_rethrown = function(rethrown) {
              rethrown = rethrown ? 1 : 0;
              HEAP8[this.ptr + 13 >>> 0 >>> 0] = rethrown;
            };
            this.get_rethrown = function() {
              return HEAP8[this.ptr + 13 >>> 0 >>> 0] != 0;
            };
            this.init = function(type, destructor) {
              this.set_adjusted_ptr(0);
              this.set_type(type);
              this.set_destructor(destructor);
            };
            this.set_adjusted_ptr = function(adjustedPtr) {
              HEAPU32[this.ptr + 16 >>> 2 >>> 0] = adjustedPtr;
            };
            this.get_adjusted_ptr = function() {
              return HEAPU32[this.ptr + 16 >>> 2 >>> 0];
            };
            this.get_exception_ptr = function() {
              var isPointer = ___cxa_is_pointer_type(this.get_type());
              if (isPointer) {
                return HEAPU32[this.excPtr >>> 2 >>> 0];
              }
              var adjusted = this.get_adjusted_ptr();
              if (adjusted !== 0)
                return adjusted;
              return this.excPtr;
            };
          }
          function ___resumeException(ptr) {
            ptr >>>= 0;
            if (!exceptionLast) {
              exceptionLast = ptr;
            }
            throw exceptionLast;
          }
          var findMatchingCatch = (args) => {
            var thrown = exceptionLast;
            if (!thrown) {
              setTempRet0(0);
              return 0;
            }
            var info = new ExceptionInfo(thrown);
            info.set_adjusted_ptr(thrown);
            var thrownType = info.get_type();
            if (!thrownType) {
              setTempRet0(0);
              return thrown;
            }
            for (var arg in args) {
              var caughtType = args[arg];
              if (caughtType === 0 || caughtType === thrownType) {
                break;
              }
              var adjusted_ptr_addr = info.ptr + 16;
              if (___cxa_can_catch(caughtType, thrownType, adjusted_ptr_addr)) {
                setTempRet0(caughtType);
                return thrown;
              }
            }
            setTempRet0(thrownType);
            return thrown;
          };
          function ___cxa_find_matching_catch_2() {
            return findMatchingCatch([]);
          }
          function ___cxa_find_matching_catch_3(arg0) {
            arg0 >>>= 0;
            return findMatchingCatch([arg0]);
          }
          function ___cxa_find_matching_catch_4(arg0, arg1) {
            arg0 >>>= 0;
            arg1 >>>= 0;
            return findMatchingCatch([arg0, arg1]);
          }
          function ___cxa_find_matching_catch_5(arg0, arg1, arg2) {
            arg0 >>>= 0;
            arg1 >>>= 0;
            arg2 >>>= 0;
            return findMatchingCatch([arg0, arg1, arg2]);
          }
          function ___cxa_find_matching_catch_6(arg0, arg1, arg2, arg3) {
            arg0 >>>= 0;
            arg1 >>>= 0;
            arg2 >>>= 0;
            arg3 >>>= 0;
            return findMatchingCatch([arg0, arg1, arg2, arg3]);
          }
          function ___cxa_find_matching_catch_7(arg0, arg1, arg2, arg3, arg4) {
            arg0 >>>= 0;
            arg1 >>>= 0;
            arg2 >>>= 0;
            arg3 >>>= 0;
            arg4 >>>= 0;
            return findMatchingCatch([arg0, arg1, arg2, arg3, arg4]);
          }
          var ___cxa_rethrow = () => {
            var info = exceptionCaught.pop();
            if (!info) {
              abort("no exception to throw");
            }
            var ptr = info.excPtr;
            if (!info.get_rethrown()) {
              exceptionCaught.push(info);
              info.set_rethrown(true);
              info.set_caught(false);
              uncaughtExceptionCount++;
            }
            exceptionLast = ptr;
            throw exceptionLast;
          };
          function ___cxa_throw(ptr, type, destructor) {
            ptr >>>= 0;
            type >>>= 0;
            destructor >>>= 0;
            var info = new ExceptionInfo(ptr);
            info.init(type, destructor);
            exceptionLast = ptr;
            uncaughtExceptionCount++;
            throw exceptionLast;
          }
          var ___cxa_uncaught_exceptions = () => uncaughtExceptionCount;
          var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : void 0;
          var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
            idx >>>= 0;
            var endIdx = idx + maxBytesToRead;
            var endPtr = idx;
            while (heapOrArray[endPtr] && !(endPtr >= endIdx))
              ++endPtr;
            if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
              return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
            }
            var str = "";
            while (idx < endPtr) {
              var u0 = heapOrArray[idx++];
              if (!(u0 & 128)) {
                str += String.fromCharCode(u0);
                continue;
              }
              var u1 = heapOrArray[idx++] & 63;
              if ((u0 & 224) == 192) {
                str += String.fromCharCode((u0 & 31) << 6 | u1);
                continue;
              }
              var u2 = heapOrArray[idx++] & 63;
              if ((u0 & 240) == 224) {
                u0 = (u0 & 15) << 12 | u1 << 6 | u2;
              } else {
                u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
              }
              if (u0 < 65536) {
                str += String.fromCharCode(u0);
              } else {
                var ch = u0 - 65536;
                str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
              }
            }
            return str;
          };
          var UTF8ToString = (ptr, maxBytesToRead) => {
            ptr >>>= 0;
            return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
          };
          var SYSCALLS = { varargs: void 0, get() {
            var ret = HEAP32[+SYSCALLS.varargs >>> 2 >>> 0];
            SYSCALLS.varargs += 4;
            return ret;
          }, getp() {
            return SYSCALLS.get();
          }, getStr(ptr) {
            var ret = UTF8ToString(ptr);
            return ret;
          } };
          function ___syscall__newselect(nfds, readfds, writefds, exceptfds, timeout) {
            readfds >>>= 0;
            writefds >>>= 0;
            exceptfds >>>= 0;
            timeout >>>= 0;
            var total = 0;
            var srcReadLow = readfds ? HEAP32[readfds >>> 2 >>> 0] : 0, srcReadHigh = readfds ? HEAP32[readfds + 4 >>> 2 >>> 0] : 0;
            var srcWriteLow = writefds ? HEAP32[writefds >>> 2 >>> 0] : 0, srcWriteHigh = writefds ? HEAP32[writefds + 4 >>> 2 >>> 0] : 0;
            var srcExceptLow = exceptfds ? HEAP32[exceptfds >>> 2 >>> 0] : 0, srcExceptHigh = exceptfds ? HEAP32[exceptfds + 4 >>> 2 >>> 0] : 0;
            var dstReadLow = 0, dstReadHigh = 0;
            var dstWriteLow = 0, dstWriteHigh = 0;
            var dstExceptLow = 0, dstExceptHigh = 0;
            var allLow = (readfds ? HEAP32[readfds >>> 2 >>> 0] : 0) | (writefds ? HEAP32[writefds >>> 2 >>> 0] : 0) | (exceptfds ? HEAP32[exceptfds >>> 2 >>> 0] : 0);
            var allHigh = (readfds ? HEAP32[readfds + 4 >>> 2 >>> 0] : 0) | (writefds ? HEAP32[writefds + 4 >>> 2 >>> 0] : 0) | (exceptfds ? HEAP32[exceptfds + 4 >>> 2 >>> 0] : 0);
            var check = function(fd2, low, high, val) {
              return fd2 < 32 ? low & val : high & val;
            };
            for (var fd = 0; fd < nfds; fd++) {
              var mask = 1 << fd % 32;
              if (!check(fd, allLow, allHigh, mask)) {
                continue;
              }
              var stream = SYSCALLS.getStreamFromFD(fd);
              var flags = SYSCALLS.DEFAULT_POLLMASK;
              if (stream.stream_ops.poll) {
                var timeoutInMillis = -1;
                if (timeout) {
                  var tv_sec = readfds ? HEAP32[timeout >>> 2 >>> 0] : 0, tv_usec = readfds ? HEAP32[timeout + 4 >>> 2 >>> 0] : 0;
                  timeoutInMillis = (tv_sec + tv_usec / 1e6) * 1e3;
                }
                flags = stream.stream_ops.poll(stream, timeoutInMillis);
              }
              if (flags & 1 && check(fd, srcReadLow, srcReadHigh, mask)) {
                fd < 32 ? dstReadLow = dstReadLow | mask : dstReadHigh = dstReadHigh | mask;
                total++;
              }
              if (flags & 4 && check(fd, srcWriteLow, srcWriteHigh, mask)) {
                fd < 32 ? dstWriteLow = dstWriteLow | mask : dstWriteHigh = dstWriteHigh | mask;
                total++;
              }
              if (flags & 2 && check(fd, srcExceptLow, srcExceptHigh, mask)) {
                fd < 32 ? dstExceptLow = dstExceptLow | mask : dstExceptHigh = dstExceptHigh | mask;
                total++;
              }
            }
            if (readfds) {
              HEAP32[readfds >>> 2 >>> 0] = dstReadLow;
              HEAP32[readfds + 4 >>> 2 >>> 0] = dstReadHigh;
            }
            if (writefds) {
              HEAP32[writefds >>> 2 >>> 0] = dstWriteLow;
              HEAP32[writefds + 4 >>> 2 >>> 0] = dstWriteHigh;
            }
            if (exceptfds) {
              HEAP32[exceptfds >>> 2 >>> 0] = dstExceptLow;
              HEAP32[exceptfds + 4 >>> 2 >>> 0] = dstExceptHigh;
            }
            return total;
          }
          function SOCKFS() {
            abort("missing function: $SOCKFS");
          }
          SOCKFS.stub = true;
          function FS() {
            abort("missing function: $FS");
          }
          FS.stub = true;
          var getSocketFromFD = (fd) => {
            var socket = SOCKFS.getSocket(fd);
            if (!socket)
              throw new FS.ErrnoError(8);
            return socket;
          };
          var inetNtop4 = (addr) => (addr & 255) + "." + (addr >> 8 & 255) + "." + (addr >> 16 & 255) + "." + (addr >> 24 & 255);
          var inetNtop6 = (ints) => {
            var str = "";
            var word = 0;
            var longest = 0;
            var lastzero = 0;
            var zstart = 0;
            var len = 0;
            var i = 0;
            var parts = [ints[0] & 65535, ints[0] >> 16, ints[1] & 65535, ints[1] >> 16, ints[2] & 65535, ints[2] >> 16, ints[3] & 65535, ints[3] >> 16];
            var hasipv4 = true;
            var v4part = "";
            for (i = 0; i < 5; i++) {
              if (parts[i] !== 0) {
                hasipv4 = false;
                break;
              }
            }
            if (hasipv4) {
              v4part = inetNtop4(parts[6] | parts[7] << 16);
              if (parts[5] === -1) {
                str = "::ffff:";
                str += v4part;
                return str;
              }
              if (parts[5] === 0) {
                str = "::";
                if (v4part === "0.0.0.0")
                  v4part = "";
                if (v4part === "0.0.0.1")
                  v4part = "1";
                str += v4part;
                return str;
              }
            }
            for (word = 0; word < 8; word++) {
              if (parts[word] === 0) {
                if (word - lastzero > 1) {
                  len = 0;
                }
                lastzero = word;
                len++;
              }
              if (len > longest) {
                longest = len;
                zstart = word - longest + 1;
              }
            }
            for (word = 0; word < 8; word++) {
              if (longest > 1) {
                if (parts[word] === 0 && word >= zstart && word < zstart + longest) {
                  if (word === zstart) {
                    str += ":";
                    if (zstart === 0)
                      str += ":";
                  }
                  continue;
                }
              }
              str += Number(_ntohs(parts[word] & 65535)).toString(16);
              str += word < 7 ? ":" : "";
            }
            return str;
          };
          var readSockaddr = (sa, salen) => {
            var family = HEAP16[sa >>> 1 >>> 0];
            var port = _ntohs(HEAPU16[sa + 2 >>> 1 >>> 0]);
            var addr;
            switch (family) {
              case 2:
                if (salen !== 16) {
                  return { errno: 28 };
                }
                addr = HEAP32[sa + 4 >>> 2 >>> 0];
                addr = inetNtop4(addr);
                break;
              case 10:
                if (salen !== 28) {
                  return { errno: 28 };
                }
                addr = [HEAP32[sa + 8 >>> 2 >>> 0], HEAP32[sa + 12 >>> 2 >>> 0], HEAP32[sa + 16 >>> 2 >>> 0], HEAP32[sa + 20 >>> 2 >>> 0]];
                addr = inetNtop6(addr);
                break;
              default:
                return { errno: 5 };
            }
            return { family, addr, port };
          };
          var inetPton4 = (str) => {
            var b = str.split(".");
            for (var i = 0; i < 4; i++) {
              var tmp2 = Number(b[i]);
              if (isNaN(tmp2))
                return null;
              b[i] = tmp2;
            }
            return (b[0] | b[1] << 8 | b[2] << 16 | b[3] << 24) >>> 0;
          };
          var jstoi_q = (str) => parseInt(str);
          var inetPton6 = (str) => {
            var words;
            var w, offset, z;
            var valid6regx = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i;
            var parts = [];
            if (!valid6regx.test(str)) {
              return null;
            }
            if (str === "::") {
              return [0, 0, 0, 0, 0, 0, 0, 0];
            }
            if (str.startsWith("::")) {
              str = str.replace("::", "Z:");
            } else {
              str = str.replace("::", ":Z:");
            }
            if (str.indexOf(".") > 0) {
              str = str.replace(new RegExp("[.]", "g"), ":");
              words = str.split(":");
              words[words.length - 4] = jstoi_q(words[words.length - 4]) + jstoi_q(words[words.length - 3]) * 256;
              words[words.length - 3] = jstoi_q(words[words.length - 2]) + jstoi_q(words[words.length - 1]) * 256;
              words = words.slice(0, words.length - 2);
            } else {
              words = str.split(":");
            }
            offset = 0;
            z = 0;
            for (w = 0; w < words.length; w++) {
              if (typeof words[w] == "string") {
                if (words[w] === "Z") {
                  for (z = 0; z < 8 - words.length + 1; z++) {
                    parts[w + z] = 0;
                  }
                  offset = z - 1;
                } else {
                  parts[w + offset] = _htons(parseInt(words[w], 16));
                }
              } else {
                parts[w + offset] = words[w];
              }
            }
            return [parts[1] << 16 | parts[0], parts[3] << 16 | parts[2], parts[5] << 16 | parts[4], parts[7] << 16 | parts[6]];
          };
          var DNS = { address_map: { id: 1, addrs: {}, names: {} }, lookup_name(name) {
            var res = inetPton4(name);
            if (res !== null) {
              return name;
            }
            res = inetPton6(name);
            if (res !== null) {
              return name;
            }
            var addr;
            if (DNS.address_map.addrs[name]) {
              addr = DNS.address_map.addrs[name];
            } else {
              var id = DNS.address_map.id++;
              assert(id < 65535, "exceeded max address mappings of 65535");
              addr = "172.29." + (id & 255) + "." + (id & 65280);
              DNS.address_map.names[addr] = name;
              DNS.address_map.addrs[name] = addr;
            }
            return addr;
          }, lookup_addr(addr) {
            if (DNS.address_map.names[addr]) {
              return DNS.address_map.names[addr];
            }
            return null;
          } };
          var getSocketAddress = (addrp, addrlen, allowNull) => {
            if (allowNull && addrp === 0)
              return null;
            var info = readSockaddr(addrp, addrlen);
            if (info.errno)
              throw new FS.ErrnoError(info.errno);
            info.addr = DNS.lookup_addr(info.addr) || info.addr;
            return info;
          };
          function ___syscall_bind(fd, addr, addrlen, d1, d2, d3) {
            addr >>>= 0;
            addrlen >>>= 0;
            var sock = getSocketFromFD(fd);
            var info = getSocketAddress(addr, addrlen);
            sock.sock_ops.bind(sock, info.addr, info.port);
            return 0;
          }
          function ___syscall_connect(fd, addr, addrlen, d1, d2, d3) {
            addr >>>= 0;
            addrlen >>>= 0;
            var sock = getSocketFromFD(fd);
            var info = getSocketAddress(addr, addrlen);
            sock.sock_ops.connect(sock, info.addr, info.port);
            return 0;
          }
          function ___syscall_faccessat(dirfd, path, amode, flags) {
            path >>>= 0;
          }
          function ___syscall_fcntl64(fd, cmd, varargs) {
            varargs >>>= 0;
            SYSCALLS.varargs = varargs;
            return 0;
          }
          function ___syscall_fstat64(fd, buf) {
            buf >>>= 0;
          }
          function ___syscall_ftruncate64(fd, length_low, length_high) {
            var length = convertI32PairToI53Checked(length_low, length_high);
          }
          var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
            outIdx >>>= 0;
            if (!(maxBytesToWrite > 0))
              return 0;
            var startIdx = outIdx;
            var endIdx = outIdx + maxBytesToWrite - 1;
            for (var i = 0; i < str.length; ++i) {
              var u = str.charCodeAt(i);
              if (u >= 55296 && u <= 57343) {
                var u1 = str.charCodeAt(++i);
                u = 65536 + ((u & 1023) << 10) | u1 & 1023;
              }
              if (u <= 127) {
                if (outIdx >= endIdx)
                  break;
                heap[outIdx++ >>> 0] = u;
              } else if (u <= 2047) {
                if (outIdx + 1 >= endIdx)
                  break;
                heap[outIdx++ >>> 0] = 192 | u >> 6;
                heap[outIdx++ >>> 0] = 128 | u & 63;
              } else if (u <= 65535) {
                if (outIdx + 2 >= endIdx)
                  break;
                heap[outIdx++ >>> 0] = 224 | u >> 12;
                heap[outIdx++ >>> 0] = 128 | u >> 6 & 63;
                heap[outIdx++ >>> 0] = 128 | u & 63;
              } else {
                if (outIdx + 3 >= endIdx)
                  break;
                heap[outIdx++ >>> 0] = 240 | u >> 18;
                heap[outIdx++ >>> 0] = 128 | u >> 12 & 63;
                heap[outIdx++ >>> 0] = 128 | u >> 6 & 63;
                heap[outIdx++ >>> 0] = 128 | u & 63;
              }
            }
            heap[outIdx >>> 0] = 0;
            return outIdx - startIdx;
          };
          var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
          function ___syscall_getdents64(fd, dirp, count) {
            dirp >>>= 0;
            count >>>= 0;
          }
          var zeroMemory = (address, size) => {
            HEAPU8.fill(0, address, address + size);
            return address;
          };
          var writeSockaddr = (sa, family, addr, port, addrlen) => {
            switch (family) {
              case 2:
                addr = inetPton4(addr);
                zeroMemory(sa, 16);
                if (addrlen) {
                  HEAP32[addrlen >>> 2 >>> 0] = 16;
                }
                HEAP16[sa >>> 1 >>> 0] = family;
                HEAP32[sa + 4 >>> 2 >>> 0] = addr;
                HEAP16[sa + 2 >>> 1 >>> 0] = _htons(port);
                break;
              case 10:
                addr = inetPton6(addr);
                zeroMemory(sa, 28);
                if (addrlen) {
                  HEAP32[addrlen >>> 2 >>> 0] = 28;
                }
                HEAP32[sa >>> 2 >>> 0] = family;
                HEAP32[sa + 8 >>> 2 >>> 0] = addr[0];
                HEAP32[sa + 12 >>> 2 >>> 0] = addr[1];
                HEAP32[sa + 16 >>> 2 >>> 0] = addr[2];
                HEAP32[sa + 20 >>> 2 >>> 0] = addr[3];
                HEAP16[sa + 2 >>> 1 >>> 0] = _htons(port);
                break;
              default:
                return 5;
            }
            return 0;
          };
          function ___syscall_getpeername(fd, addr, addrlen, d1, d2, d3) {
            addr >>>= 0;
            addrlen >>>= 0;
            var sock = getSocketFromFD(fd);
            if (!sock.daddr) {
              return -53;
            }
            var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(sock.daddr), sock.dport, addrlen);
            return 0;
          }
          function ___syscall_getsockopt(fd, level, optname, optval, optlen, d1) {
            optval >>>= 0;
            optlen >>>= 0;
            var sock = getSocketFromFD(fd);
            if (level === 1) {
              if (optname === 4) {
                HEAP32[optval >>> 2 >>> 0] = sock.error;
                HEAP32[optlen >>> 2 >>> 0] = 4;
                sock.error = null;
                return 0;
              }
            }
            return -50;
          }
          function ___syscall_ioctl(fd, op, varargs) {
            varargs >>>= 0;
            SYSCALLS.varargs = varargs;
            return 0;
          }
          function ___syscall_lstat64(path, buf) {
            path >>>= 0;
            buf >>>= 0;
          }
          function ___syscall_mkdirat(dirfd, path, mode) {
            path >>>= 0;
          }
          function ___syscall_newfstatat(dirfd, path, buf, flags) {
            path >>>= 0;
            buf >>>= 0;
          }
          function ___syscall_openat(dirfd, path, flags, varargs) {
            path >>>= 0;
            varargs >>>= 0;
            SYSCALLS.varargs = varargs;
          }
          function ___syscall_recvfrom(fd, buf, len, flags, addr, addrlen) {
            buf >>>= 0;
            len >>>= 0;
            addr >>>= 0;
            addrlen >>>= 0;
            var sock = getSocketFromFD(fd);
            var msg = sock.sock_ops.recvmsg(sock, len);
            if (!msg)
              return 0;
            if (addr) {
              var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(msg.addr), msg.port, addrlen);
            }
            HEAPU8.set(msg.buffer, buf >>> 0);
            return msg.buffer.byteLength;
          }
          function ___syscall_renameat(olddirfd, oldpath, newdirfd, newpath) {
            oldpath >>>= 0;
            newpath >>>= 0;
          }
          function ___syscall_rmdir(path) {
            path >>>= 0;
          }
          function ___syscall_sendto(fd, message, length, flags, addr, addr_len) {
            message >>>= 0;
            length >>>= 0;
            addr >>>= 0;
            addr_len >>>= 0;
          }
          var ___syscall_socket = (domain, type, protocol) => {
          };
          function ___syscall_stat64(path, buf) {
            path >>>= 0;
            buf >>>= 0;
          }
          function ___syscall_unlinkat(dirfd, path, flags) {
            path >>>= 0;
          }
          var nowIsMonotonic = 1;
          var __emscripten_get_now_is_monotonic = () => nowIsMonotonic;
          var _abort = () => {
            abort("");
          };
          function _duckdb_web_fs_directory_create(path, pathLen) {
            return globalThis.DUCKDB_RUNTIME.createDirectory(Module, path, pathLen);
          }
          function _duckdb_web_fs_directory_exists(path, pathLen) {
            return globalThis.DUCKDB_RUNTIME.checkDirectory(Module, path, pathLen);
          }
          function _duckdb_web_fs_directory_list_files(path, pathLen) {
            return globalThis.DUCKDB_RUNTIME.listDirectoryEntries(Module, path, pathLen);
          }
          function _duckdb_web_fs_directory_remove(path, pathLen) {
            return globalThis.DUCKDB_RUNTIME.removeDirectory(Module, path, pathLen);
          }
          function _duckdb_web_fs_file_close(fileId) {
            return globalThis.DUCKDB_RUNTIME.closeFile(Module, fileId);
          }
          function _duckdb_web_fs_file_exists(path, pathLen) {
            return globalThis.DUCKDB_RUNTIME.checkFile(Module, path, pathLen);
          }
          function _duckdb_web_fs_file_get_last_modified_time(fileId) {
            return globalThis.DUCKDB_RUNTIME.getLastFileModificationTime(Module, fileId);
          }
          function _duckdb_web_fs_file_move(from, fromLen, to, toLen) {
            return globalThis.DUCKDB_RUNTIME.moveFile(Module, from, fromLen, to, toLen);
          }
          function _duckdb_web_fs_file_open(fileId, flags) {
            return globalThis.DUCKDB_RUNTIME.openFile(Module, fileId, flags);
          }
          function _duckdb_web_fs_file_read(fileId, buf, size, location) {
            return globalThis.DUCKDB_RUNTIME.readFile(Module, fileId, buf, size, location);
          }
          function _duckdb_web_fs_file_truncate(fileId, newSize) {
            return globalThis.DUCKDB_RUNTIME.truncateFile(Module, fileId, newSize);
          }
          function _duckdb_web_fs_file_write(fileId, buf, size, location) {
            return globalThis.DUCKDB_RUNTIME.writeFile(Module, fileId, buf, size, location);
          }
          function _duckdb_web_fs_get_default_data_protocol(Module2) {
            return globalThis.DUCKDB_RUNTIME.getDefaultDataProtocol(Module2);
          }
          function _duckdb_web_fs_glob(path, pathLen) {
            return globalThis.DUCKDB_RUNTIME.glob(Module, path, pathLen);
          }
          function _duckdb_web_test_platform_feature(feature) {
            return globalThis.DUCKDB_RUNTIME.testPlatformFeature(Module, feature);
          }
          function _duckdb_web_udf_scalar_call(funcId, descPtr, descSize, ptrsPtr, ptrsSize, response) {
            return globalThis.DUCKDB_RUNTIME.callScalarUDF(Module, funcId, descPtr, descSize, ptrsPtr, ptrsSize, response);
          }
          var _emscripten_date_now = () => Date.now();
          var getHeapMax = () => 4294901760;
          function _emscripten_get_heap_max() {
            return getHeapMax();
          }
          var _emscripten_get_now;
          _emscripten_get_now = () => performance.now();
          function _emscripten_memcpy_js(dest, src, num) {
            dest >>>= 0;
            src >>>= 0;
            num >>>= 0;
            return HEAPU8.copyWithin(dest >>> 0, src >>> 0, src + num >>> 0);
          }
          var growMemory = (size) => {
            var b = wasmMemory.buffer;
            var pages = (size - b.byteLength + 65535) / 65536;
            try {
              wasmMemory.grow(pages);
              updateMemoryViews();
              return 1;
            } catch (e) {
            }
          };
          function _emscripten_resize_heap(requestedSize) {
            requestedSize >>>= 0;
            var oldSize = HEAPU8.length;
            var maxHeapSize = getHeapMax();
            if (requestedSize > maxHeapSize) {
              return false;
            }
            var alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
            for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
              var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
              overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
              var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
              var replacement = growMemory(newSize);
              if (replacement) {
                return true;
              }
            }
            return false;
          }
          var ENV = {};
          var getExecutableName = () => thisProgram || "./this.program";
          var getEnvStrings = () => {
            if (!getEnvStrings.strings) {
              var lang = (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
              var env = { "USER": "web_user", "LOGNAME": "web_user", "PATH": "/", "PWD": "/", "HOME": "/home/web_user", "LANG": lang, "_": getExecutableName() };
              for (var x in ENV) {
                if (ENV[x] === void 0)
                  delete env[x];
                else
                  env[x] = ENV[x];
              }
              var strings = [];
              for (var x in env) {
                strings.push(`${x}=${env[x]}`);
              }
              getEnvStrings.strings = strings;
            }
            return getEnvStrings.strings;
          };
          var stringToAscii = (str, buffer) => {
            for (var i = 0; i < str.length; ++i) {
              HEAP8[buffer++ >>> 0 >>> 0] = str.charCodeAt(i);
            }
            HEAP8[buffer >>> 0 >>> 0] = 0;
          };
          var _environ_get = function(__environ, environ_buf) {
            __environ >>>= 0;
            environ_buf >>>= 0;
            var bufSize = 0;
            getEnvStrings().forEach((string, i) => {
              var ptr = environ_buf + bufSize;
              HEAPU32[__environ + i * 4 >>> 2 >>> 0] = ptr;
              stringToAscii(string, ptr);
              bufSize += string.length + 1;
            });
            return 0;
          };
          var _environ_sizes_get = function(penviron_count, penviron_buf_size) {
            penviron_count >>>= 0;
            penviron_buf_size >>>= 0;
            var strings = getEnvStrings();
            HEAPU32[penviron_count >>> 2 >>> 0] = strings.length;
            var bufSize = 0;
            strings.forEach((string) => bufSize += string.length + 1);
            HEAPU32[penviron_buf_size >>> 2 >>> 0] = bufSize;
            return 0;
          };
          var _fd_close = (fd) => 52;
          function _fd_fdstat_get(fd, pbuf) {
            pbuf >>>= 0;
            var rightsBase = 0;
            var rightsInheriting = 0;
            var flags = 0;
            {
              var type = 2;
              if (fd == 0) {
                rightsBase = 2;
              } else if (fd == 1 || fd == 2) {
                rightsBase = 64;
              }
              flags = 1;
            }
            HEAP8[pbuf >>> 0 >>> 0] = type;
            HEAP16[pbuf + 2 >>> 1 >>> 0] = flags;
            tempI64 = [rightsBase >>> 0, (tempDouble = rightsBase, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[pbuf + 8 >>> 2 >>> 0] = tempI64[0], HEAP32[pbuf + 12 >>> 2 >>> 0] = tempI64[1];
            tempI64 = [rightsInheriting >>> 0, (tempDouble = rightsInheriting, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[pbuf + 16 >>> 2 >>> 0] = tempI64[0], HEAP32[pbuf + 20 >>> 2 >>> 0] = tempI64[1];
            return 0;
          }
          function _fd_pread(fd, iov, iovcnt, offset_low, offset_high, pnum) {
            iov >>>= 0;
            iovcnt >>>= 0;
            var offset = convertI32PairToI53Checked(offset_low, offset_high);
            pnum >>>= 0;
            return 52;
          }
          function _fd_pwrite(fd, iov, iovcnt, offset_low, offset_high, pnum) {
            iov >>>= 0;
            iovcnt >>>= 0;
            var offset = convertI32PairToI53Checked(offset_low, offset_high);
            pnum >>>= 0;
            return 52;
          }
          function _fd_read(fd, iov, iovcnt, pnum) {
            iov >>>= 0;
            iovcnt >>>= 0;
            pnum >>>= 0;
            return 52;
          }
          function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
            var offset = convertI32PairToI53Checked(offset_low, offset_high);
            newOffset >>>= 0;
            return 70;
          }
          var _fd_sync = (fd) => 52;
          var printCharBuffers = [null, [], []];
          var printChar = (stream, curr) => {
            var buffer = printCharBuffers[stream];
            if (curr === 0 || curr === 10) {
              (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
              buffer.length = 0;
            } else {
              buffer.push(curr);
            }
          };
          function _fd_write(fd, iov, iovcnt, pnum) {
            iov >>>= 0;
            iovcnt >>>= 0;
            pnum >>>= 0;
            var num = 0;
            for (var i = 0; i < iovcnt; i++) {
              var ptr = HEAPU32[iov >>> 2 >>> 0];
              var len = HEAPU32[iov + 4 >>> 2 >>> 0];
              iov += 8;
              for (var j = 0; j < len; j++) {
                printChar(fd, HEAPU8[ptr + j >>> 0]);
              }
              num += len;
            }
            HEAPU32[pnum >>> 2 >>> 0] = num;
            return 0;
          }
          function _getaddrinfo(node, service, hint, out2) {
            node >>>= 0;
            service >>>= 0;
            hint >>>= 0;
            out2 >>>= 0;
            var addr = 0;
            var port = 0;
            var flags = 0;
            var family = 0;
            var type = 0;
            var proto = 0;
            var ai;
            function allocaddrinfo(family2, type2, proto2, canon, addr2, port2) {
              var sa, salen, ai2;
              var errno;
              salen = family2 === 10 ? 28 : 16;
              addr2 = family2 === 10 ? inetNtop6(addr2) : inetNtop4(addr2);
              sa = _malloc(salen);
              errno = writeSockaddr(sa, family2, addr2, port2);
              assert(!errno);
              ai2 = _malloc(32);
              HEAP32[ai2 + 4 >>> 2 >>> 0] = family2;
              HEAP32[ai2 + 8 >>> 2 >>> 0] = type2;
              HEAP32[ai2 + 12 >>> 2 >>> 0] = proto2;
              HEAPU32[ai2 + 24 >>> 2 >>> 0] = canon;
              HEAPU32[ai2 + 20 >>> 2 >>> 0] = sa;
              if (family2 === 10) {
                HEAP32[ai2 + 16 >>> 2 >>> 0] = 28;
              } else {
                HEAP32[ai2 + 16 >>> 2 >>> 0] = 16;
              }
              HEAP32[ai2 + 28 >>> 2 >>> 0] = 0;
              return ai2;
            }
            if (hint) {
              flags = HEAP32[hint >>> 2 >>> 0];
              family = HEAP32[hint + 4 >>> 2 >>> 0];
              type = HEAP32[hint + 8 >>> 2 >>> 0];
              proto = HEAP32[hint + 12 >>> 2 >>> 0];
            }
            if (type && !proto) {
              proto = type === 2 ? 17 : 6;
            }
            if (!type && proto) {
              type = proto === 17 ? 2 : 1;
            }
            if (proto === 0) {
              proto = 6;
            }
            if (type === 0) {
              type = 1;
            }
            if (!node && !service) {
              return -2;
            }
            if (flags & ~(1 | 2 | 4 | 1024 | 8 | 16 | 32)) {
              return -1;
            }
            if (hint !== 0 && HEAP32[hint >>> 2 >>> 0] & 2 && !node) {
              return -1;
            }
            if (flags & 32) {
              return -2;
            }
            if (type !== 0 && type !== 1 && type !== 2) {
              return -7;
            }
            if (family !== 0 && family !== 2 && family !== 10) {
              return -6;
            }
            if (service) {
              service = UTF8ToString(service);
              port = parseInt(service, 10);
              if (isNaN(port)) {
                if (flags & 1024) {
                  return -2;
                }
                return -8;
              }
            }
            if (!node) {
              if (family === 0) {
                family = 2;
              }
              if ((flags & 1) === 0) {
                if (family === 2) {
                  addr = _htonl(2130706433);
                } else {
                  addr = [0, 0, 0, 1];
                }
              }
              ai = allocaddrinfo(family, type, proto, null, addr, port);
              HEAPU32[out2 >>> 2 >>> 0] = ai;
              return 0;
            }
            node = UTF8ToString(node);
            addr = inetPton4(node);
            if (addr !== null) {
              if (family === 0 || family === 2) {
                family = 2;
              } else if (family === 10 && flags & 8) {
                addr = [0, 0, _htonl(65535), addr];
                family = 10;
              } else {
                return -2;
              }
            } else {
              addr = inetPton6(node);
              if (addr !== null) {
                if (family === 0 || family === 10) {
                  family = 10;
                } else {
                  return -2;
                }
              }
            }
            if (addr != null) {
              ai = allocaddrinfo(family, type, proto, node, addr, port);
              HEAPU32[out2 >>> 2 >>> 0] = ai;
              return 0;
            }
            if (flags & 4) {
              return -2;
            }
            node = DNS.lookup_name(node);
            addr = inetPton4(node);
            if (family === 0) {
              family = 2;
            } else if (family === 10) {
              addr = [0, 0, _htonl(65535), addr];
            }
            ai = allocaddrinfo(family, type, proto, null, addr, port);
            HEAPU32[out2 >>> 2 >>> 0] = ai;
            return 0;
          }
          var initRandomFill = () => {
            if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
              return (view) => crypto.getRandomValues(view);
            } else if (ENVIRONMENT_IS_NODE) {
              try {
                var crypto_module = __require("crypto");
                var randomFillSync = crypto_module["randomFillSync"];
                if (randomFillSync) {
                  return (view) => crypto_module["randomFillSync"](view);
                }
                var randomBytes = crypto_module["randomBytes"];
                return (view) => (view.set(randomBytes(view.byteLength)), view);
              } catch (e) {
              }
            }
            abort("initRandomDevice");
          };
          var randomFill = (view) => (randomFill = initRandomFill())(view);
          function _getentropy(buffer, size) {
            buffer >>>= 0;
            size >>>= 0;
            randomFill(HEAPU8.subarray(buffer >>> 0, buffer + size >>> 0));
            return 0;
          }
          function _getnameinfo(sa, salen, node, nodelen, serv, servlen, flags) {
            sa >>>= 0;
            node >>>= 0;
            serv >>>= 0;
            var info = readSockaddr(sa, salen);
            if (info.errno) {
              return -6;
            }
            var port = info.port;
            var addr = info.addr;
            var overflowed = false;
            if (node && nodelen) {
              var lookup;
              if (flags & 1 || !(lookup = DNS.lookup_addr(addr))) {
                if (flags & 8) {
                  return -2;
                }
              } else {
                addr = lookup;
              }
              var numBytesWrittenExclNull = stringToUTF8(addr, node, nodelen);
              if (numBytesWrittenExclNull + 1 >= nodelen) {
                overflowed = true;
              }
            }
            if (serv && servlen) {
              port = "" + port;
              var numBytesWrittenExclNull = stringToUTF8(port, serv, servlen);
              if (numBytesWrittenExclNull + 1 >= servlen) {
                overflowed = true;
              }
            }
            if (overflowed) {
              return -12;
            }
            return 0;
          }
          function _llvm_eh_typeid_for(type) {
            type >>>= 0;
            return type;
          }
          var isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
          var arraySum = (array, index) => {
            var sum2 = 0;
            for (var i = 0; i <= index; sum2 += array[i++]) {
            }
            return sum2;
          };
          var MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          var MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          var addDays = (date, days) => {
            var newDate = new Date(date.getTime());
            while (days > 0) {
              var leap = isLeapYear(newDate.getFullYear());
              var currentMonth = newDate.getMonth();
              var daysInCurrentMonth = (leap ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR)[currentMonth];
              if (days > daysInCurrentMonth - newDate.getDate()) {
                days -= daysInCurrentMonth - newDate.getDate() + 1;
                newDate.setDate(1);
                if (currentMonth < 11) {
                  newDate.setMonth(currentMonth + 1);
                } else {
                  newDate.setMonth(0);
                  newDate.setFullYear(newDate.getFullYear() + 1);
                }
              } else {
                newDate.setDate(newDate.getDate() + days);
                return newDate;
              }
            }
            return newDate;
          };
          var lengthBytesUTF8 = (str) => {
            var len = 0;
            for (var i = 0; i < str.length; ++i) {
              var c = str.charCodeAt(i);
              if (c <= 127) {
                len++;
              } else if (c <= 2047) {
                len += 2;
              } else if (c >= 55296 && c <= 57343) {
                len += 4;
                ++i;
              } else {
                len += 3;
              }
            }
            return len;
          };
          function intArrayFromString(stringy, dontAddNull, length) {
            var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
            var u8array = new Array(len);
            var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
            if (dontAddNull)
              u8array.length = numBytesWritten;
            return u8array;
          }
          var writeArrayToMemory = (array, buffer) => {
            HEAP8.set(array, buffer >>> 0);
          };
          function _strftime(s, maxsize, format, tm) {
            s >>>= 0;
            maxsize >>>= 0;
            format >>>= 0;
            tm >>>= 0;
            var tm_zone = HEAPU32[tm + 40 >>> 2 >>> 0];
            var date = { tm_sec: HEAP32[tm >>> 2 >>> 0], tm_min: HEAP32[tm + 4 >>> 2 >>> 0], tm_hour: HEAP32[tm + 8 >>> 2 >>> 0], tm_mday: HEAP32[tm + 12 >>> 2 >>> 0], tm_mon: HEAP32[tm + 16 >>> 2 >>> 0], tm_year: HEAP32[tm + 20 >>> 2 >>> 0], tm_wday: HEAP32[tm + 24 >>> 2 >>> 0], tm_yday: HEAP32[tm + 28 >>> 2 >>> 0], tm_isdst: HEAP32[tm + 32 >>> 2 >>> 0], tm_gmtoff: HEAP32[tm + 36 >>> 2 >>> 0], tm_zone: tm_zone ? UTF8ToString(tm_zone) : "" };
            var pattern = UTF8ToString(format);
            var EXPANSION_RULES_1 = { "%c": "%a %b %d %H:%M:%S %Y", "%D": "%m/%d/%y", "%F": "%Y-%m-%d", "%h": "%b", "%r": "%I:%M:%S %p", "%R": "%H:%M", "%T": "%H:%M:%S", "%x": "%m/%d/%y", "%X": "%H:%M:%S", "%Ec": "%c", "%EC": "%C", "%Ex": "%m/%d/%y", "%EX": "%H:%M:%S", "%Ey": "%y", "%EY": "%Y", "%Od": "%d", "%Oe": "%e", "%OH": "%H", "%OI": "%I", "%Om": "%m", "%OM": "%M", "%OS": "%S", "%Ou": "%u", "%OU": "%U", "%OV": "%V", "%Ow": "%w", "%OW": "%W", "%Oy": "%y" };
            for (var rule in EXPANSION_RULES_1) {
              pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
            }
            var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            function leadingSomething(value, digits, character) {
              var str = typeof value == "number" ? value.toString() : value || "";
              while (str.length < digits) {
                str = character[0] + str;
              }
              return str;
            }
            function leadingNulls(value, digits) {
              return leadingSomething(value, digits, "0");
            }
            function compareByDay(date1, date2) {
              function sgn(value) {
                return value < 0 ? -1 : value > 0 ? 1 : 0;
              }
              var compare;
              if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
                if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
                  compare = sgn(date1.getDate() - date2.getDate());
                }
              }
              return compare;
            }
            function getFirstWeekStartDate(janFourth) {
              switch (janFourth.getDay()) {
                case 0:
                  return new Date(janFourth.getFullYear() - 1, 11, 29);
                case 1:
                  return janFourth;
                case 2:
                  return new Date(janFourth.getFullYear(), 0, 3);
                case 3:
                  return new Date(janFourth.getFullYear(), 0, 2);
                case 4:
                  return new Date(janFourth.getFullYear(), 0, 1);
                case 5:
                  return new Date(janFourth.getFullYear() - 1, 11, 31);
                case 6:
                  return new Date(janFourth.getFullYear() - 1, 11, 30);
              }
            }
            function getWeekBasedYear(date2) {
              var thisDate = addDays(new Date(date2.tm_year + 1900, 0, 1), date2.tm_yday);
              var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
              var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
              var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
              var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
              if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
                if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
                  return thisDate.getFullYear() + 1;
                }
                return thisDate.getFullYear();
              }
              return thisDate.getFullYear() - 1;
            }
            var EXPANSION_RULES_2 = { "%a": (date2) => WEEKDAYS[date2.tm_wday].substring(0, 3), "%A": (date2) => WEEKDAYS[date2.tm_wday], "%b": (date2) => MONTHS[date2.tm_mon].substring(0, 3), "%B": (date2) => MONTHS[date2.tm_mon], "%C": (date2) => {
              var year = date2.tm_year + 1900;
              return leadingNulls(year / 100 | 0, 2);
            }, "%d": (date2) => leadingNulls(date2.tm_mday, 2), "%e": (date2) => leadingSomething(date2.tm_mday, 2, " "), "%g": (date2) => getWeekBasedYear(date2).toString().substring(2), "%G": (date2) => getWeekBasedYear(date2), "%H": (date2) => leadingNulls(date2.tm_hour, 2), "%I": (date2) => {
              var twelveHour = date2.tm_hour;
              if (twelveHour == 0)
                twelveHour = 12;
              else if (twelveHour > 12)
                twelveHour -= 12;
              return leadingNulls(twelveHour, 2);
            }, "%j": (date2) => leadingNulls(date2.tm_mday + arraySum(isLeapYear(date2.tm_year + 1900) ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR, date2.tm_mon - 1), 3), "%m": (date2) => leadingNulls(date2.tm_mon + 1, 2), "%M": (date2) => leadingNulls(date2.tm_min, 2), "%n": () => "\n", "%p": (date2) => {
              if (date2.tm_hour >= 0 && date2.tm_hour < 12) {
                return "AM";
              }
              return "PM";
            }, "%S": (date2) => leadingNulls(date2.tm_sec, 2), "%t": () => "	", "%u": (date2) => date2.tm_wday || 7, "%U": (date2) => {
              var days = date2.tm_yday + 7 - date2.tm_wday;
              return leadingNulls(Math.floor(days / 7), 2);
            }, "%V": (date2) => {
              var val = Math.floor((date2.tm_yday + 7 - (date2.tm_wday + 6) % 7) / 7);
              if ((date2.tm_wday + 371 - date2.tm_yday - 2) % 7 <= 2) {
                val++;
              }
              if (!val) {
                val = 52;
                var dec31 = (date2.tm_wday + 7 - date2.tm_yday - 1) % 7;
                if (dec31 == 4 || dec31 == 5 && isLeapYear(date2.tm_year % 400 - 1)) {
                  val++;
                }
              } else if (val == 53) {
                var jan1 = (date2.tm_wday + 371 - date2.tm_yday) % 7;
                if (jan1 != 4 && (jan1 != 3 || !isLeapYear(date2.tm_year)))
                  val = 1;
              }
              return leadingNulls(val, 2);
            }, "%w": (date2) => date2.tm_wday, "%W": (date2) => {
              var days = date2.tm_yday + 7 - (date2.tm_wday + 6) % 7;
              return leadingNulls(Math.floor(days / 7), 2);
            }, "%y": (date2) => (date2.tm_year + 1900).toString().substring(2), "%Y": (date2) => date2.tm_year + 1900, "%z": (date2) => {
              var off = date2.tm_gmtoff;
              var ahead = off >= 0;
              off = Math.abs(off) / 60;
              off = off / 60 * 100 + off % 60;
              return (ahead ? "+" : "-") + String("0000" + off).slice(-4);
            }, "%Z": (date2) => date2.tm_zone, "%%": () => "%" };
            pattern = pattern.replace(/%%/g, "\0\0");
            for (var rule in EXPANSION_RULES_2) {
              if (pattern.includes(rule)) {
                pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
              }
            }
            pattern = pattern.replace(/\0\0/g, "%");
            var bytes = intArrayFromString(pattern, false);
            if (bytes.length > maxsize) {
              return 0;
            }
            writeArrayToMemory(bytes, s);
            return bytes.length - 1;
          }
          function _strftime_l(s, maxsize, format, tm, loc) {
            s >>>= 0;
            maxsize >>>= 0;
            format >>>= 0;
            tm >>>= 0;
            loc >>>= 0;
            return _strftime(s, maxsize, format, tm);
          }
          var runtimeKeepaliveCounter = 0;
          var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
          var _proc_exit = (code) => {
            EXITSTATUS = code;
            if (!keepRuntimeAlive()) {
              Module["onExit"]?.(code);
              ABORT = true;
            }
            quit_(code, new ExitStatus(code));
          };
          var exitJS = (status, implicit) => {
            EXITSTATUS = status;
            _proc_exit(status);
          };
          var handleException = (e) => {
            if (e instanceof ExitStatus || e == "unwind") {
              return EXITSTATUS;
            }
            quit_(1, e);
          };
          var wasmTableMirror = [];
          var wasmTable;
          var getWasmTableEntry = (funcPtr) => {
            var func = wasmTableMirror[funcPtr];
            if (!func) {
              if (funcPtr >= wasmTableMirror.length)
                wasmTableMirror.length = funcPtr + 1;
              wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
            }
            return func;
          };
          var getCFunc = (ident) => {
            var func = Module["_" + ident];
            return func;
          };
          var stringToUTF8OnStack = (str) => {
            var size = lengthBytesUTF8(str) + 1;
            var ret = stackAlloc(size);
            stringToUTF8(str, ret, size);
            return ret;
          };
          var ccall = (ident, returnType, argTypes, args, opts) => {
            var toC = { "string": (str) => {
              var ret2 = 0;
              if (str !== null && str !== void 0 && str !== 0) {
                ret2 = stringToUTF8OnStack(str);
              }
              return ret2;
            }, "array": (arr) => {
              var ret2 = stackAlloc(arr.length);
              writeArrayToMemory(arr, ret2);
              return ret2;
            } };
            function convertReturnValue(ret2) {
              if (returnType === "string") {
                return UTF8ToString(ret2);
              }
              if (returnType === "boolean")
                return Boolean(ret2);
              return ret2;
            }
            var func = getCFunc(ident);
            var cArgs = [];
            var stack = 0;
            if (args) {
              for (var i = 0; i < args.length; i++) {
                var converter = toC[argTypes[i]];
                if (converter) {
                  if (stack === 0)
                    stack = stackSave();
                  cArgs[i] = converter(args[i]);
                } else {
                  cArgs[i] = args[i];
                }
              }
            }
            var ret = func.apply(null, cArgs);
            function onDone(ret2) {
              if (stack !== 0)
                stackRestore(stack);
              return convertReturnValue(ret2);
            }
            ret = onDone(ret);
            return ret;
          };
          var wasmImports = { v: ___cxa_begin_catch, B: ___cxa_end_catch, a: ___cxa_find_matching_catch_2, l: ___cxa_find_matching_catch_3, A: ___cxa_find_matching_catch_4, K: ___cxa_find_matching_catch_5, R: ___cxa_find_matching_catch_6, va: ___cxa_find_matching_catch_7, pa: ___cxa_rethrow, s: ___cxa_throw, C: ___cxa_uncaught_exceptions, c: ___resumeException, Ia: ___syscall__newselect, Ma: ___syscall_bind, La: ___syscall_connect, Ca: ___syscall_faccessat, Q: ___syscall_fcntl64, Ba: ___syscall_fstat64, yb: ___syscall_ftruncate64, wa: ___syscall_getdents64, Ga: ___syscall_getpeername, Ha: ___syscall_getsockopt, ma: ___syscall_ioctl, ya: ___syscall_lstat64, xa: ___syscall_mkdirat, za: ___syscall_newfstatat, na: ___syscall_openat, Ja: ___syscall_recvfrom, tf: ___syscall_renameat, ea: ___syscall_rmdir, Ka: ___syscall_sendto, ha: ___syscall_socket, Aa: ___syscall_stat64, fa: ___syscall_unlinkat, Sa: __emscripten_get_now_is_monotonic, aa: _abort, hf: _duckdb_web_fs_directory_create, jf: _duckdb_web_fs_directory_exists, ff: _duckdb_web_fs_directory_list_files, gf: _duckdb_web_fs_directory_remove, ta: _duckdb_web_fs_file_close, df: _duckdb_web_fs_file_exists, cb: _duckdb_web_fs_file_get_last_modified_time, ef: _duckdb_web_fs_file_move, lf: _duckdb_web_fs_file_open, ba: _duckdb_web_fs_file_read, kf: _duckdb_web_fs_file_truncate, ua: _duckdb_web_fs_file_write, mf: _duckdb_web_fs_get_default_data_protocol, cf: _duckdb_web_fs_glob, ra: _duckdb_web_test_platform_feature, nf: _duckdb_web_udf_scalar_call, Ta: _emscripten_date_now, Ua: _emscripten_get_heap_max, sa: _emscripten_get_now, vf: _emscripten_memcpy_js, wf: _emscripten_resize_heap, Eb: _environ_get, Pb: _environ_sizes_get, X: _fd_close, Ra: _fd_fdstat_get, Ab: _fd_pread, zb: _fd_pwrite, la: _fd_read, Te: _fd_seek, uf: _fd_sync, ca: _fd_write, Na: _getaddrinfo, sf: _getentropy, Fa: _getnameinfo, J: invoke_di, W: invoke_dii, da: invoke_diii, M: invoke_diiii, O: invoke_diiiiid, Wb: invoke_diijii, T: invoke_fi, qa: invoke_fiii, N: invoke_fiiii, Xb: invoke_fiijii, p: invoke_i, ja: invoke_id, qf: invoke_idd, _: invoke_idiii, ka: invoke_if, rf: invoke_iff, d: invoke_ii, P: invoke_iid, S: invoke_iidii, b: invoke_iii, L: invoke_iiid, gc: invoke_iiidj, g: invoke_iiii, Ea: invoke_iiiid, cc: invoke_iiiidjj, j: invoke_iiiii, oa: invoke_iiiiid, o: invoke_iiiiii, Da: invoke_iiiiiid, t: invoke_iiiiiii, u: invoke_iiiiiiii, H: invoke_iiiiiiiii, Z: invoke_iiiiiiiiii, V: invoke_iiiiiiiiiii, q: invoke_iiiiiiiiiiii, x: invoke_iiiiiiiiiiiii, Oa: invoke_iiiiiiiiiiiiiiii, D: invoke_iiiiiiiiiiiiiiiii, r: invoke_iiiiiiiiiiiiiiiiii, _b: invoke_iiiiiiiiiiiij, pc: invoke_iiiiiiiiiiji, fc: invoke_iiiiiiiiijiiiiiii, ue: invoke_iiiiiiiij, bc: invoke_iiiiiiiiji, zd: invoke_iiiiiiij, hc: invoke_iiiiiiiji, Ae: invoke_iiiiiiijii, yd: invoke_iiiiiiijj, bb: invoke_iiiiiiijji, ve: invoke_iiiiiij, Cd: invoke_iiiiiiji, Xa: invoke_iiiiiijii, Yc: invoke_iiiiiijjiijjji, Ve: invoke_iiiiij, ud: invoke_iiiiiji, Be: invoke_iiiiijii, tc: invoke_iiiiijiii, uc: invoke_iiiiijij, Ue: invoke_iiiiijj, _a: invoke_iiiiijjj, Ya: invoke_iiiiijjji, se: invoke_iiiij, vd: invoke_iiiiji, Ad: invoke_iiiijii, Bd: invoke_iiiijiii, Hd: invoke_iiiijj, Zc: invoke_iiiijji, _c: invoke_iiiijjii, we: invoke_iiiijjiii, Ac: invoke_iiiijjj, _e: invoke_iiij, De: invoke_iiiji, ze: invoke_iiijii, rd: invoke_iiijiii, ac: invoke_iiijiiiij, nb: invoke_iiijiiiijj, $b: invoke_iiijiiij, hb: invoke_iiijiiijj, zc: invoke_iiijiij, xb: invoke_iiijiiji, mb: invoke_iiijiijj, ge: invoke_iiijij, $e: invoke_iiijj, Gd: invoke_iiijji, Xc: invoke_iiijjii, Ob: invoke_iiijjiii, dc: invoke_iiijjiij, ec: invoke_iiijjiiji, $c: invoke_iiijjijjiii, od: invoke_iiijjj, gb: invoke_iiijjji, Tc: invoke_iiijjjj, Je: invoke_iij, He: invoke_iiji, jc: invoke_iijii, ub: invoke_iijiii, Tb: invoke_iijiiii, ib: invoke_iijiiijj, wb: invoke_iijiij, kb: invoke_iijiijj, nd: invoke_iijiji, td: invoke_iijj, Nb: invoke_iijji, Rb: invoke_iijjii, Qb: invoke_iijjiii, Wa: invoke_iijjij, Cb: invoke_iijjijj, ce: invoke_iijjj, Za: invoke_iijjjii, ld: invoke_ij, Zd: invoke_iji, Ic: invoke_ijii, Ec: invoke_ijji, ye: invoke_ijjiii, Kb: invoke_ijjji, xe: invoke_j, Ed: invoke_jd, Dd: invoke_jf, Ye: invoke_ji, Xe: invoke_jii, re: invoke_jiii, bf: invoke_jiiii, xd: invoke_jiiiii, sc: invoke_jiiiiii, lc: invoke_jiiiiiii, ie: invoke_jiiiiijiiii, Cc: invoke_jiiiij, ae: invoke_jiiiiji, ne: invoke_jiiiijii, rc: invoke_jiiiijiiii, Wc: invoke_jiiij, fd: invoke_jiiiji, me: invoke_jiiijii, je: invoke_jiiijiii, Pd: invoke_jiiijiijiii, ic: invoke_jiiijj, oc: invoke_jiiijjj, Ee: invoke_jiij, cd: invoke_jiiji, le: invoke_jiijii, ke: invoke_jiijiii, kc: invoke_jiijj, qc: invoke_jiijjjii, sd: invoke_jij, Oc: invoke_jijiii, $a: invoke_jijiiii, Lc: invoke_jijij, tb: invoke_jijj, Dc: invoke_jijji, Nc: invoke_jijjij, vc: invoke_jijjjjii, Id: invoke_jj, Gb: invoke_jji, Kc: invoke_jjiji, Fc: invoke_jjj, Jc: invoke_jjjd, Hb: invoke_jjjii, Ib: invoke_jjjji, k: invoke_v, Pa: invoke_vdii, Qa: invoke_vfii, h: invoke_vi, y: invoke_vid, ga: invoke_viddddi, G: invoke_vif, e: invoke_vii, Y: invoke_viid, U: invoke_viidii, f: invoke_viii, i: invoke_viiii, pf: invoke_viiiidiiii, n: invoke_viiiii, m: invoke_viiiiii, ia: invoke_viiiiiidiii, z: invoke_viiiiiii, E: invoke_viiiiiiii, F: invoke_viiiiiiiii, I: invoke_viiiiiiiiii, of: invoke_viiiiiiiiiii, $: invoke_viiiiiiiiiiiiiii, Ne: invoke_viiiiiiijjjji, Qe: invoke_viiiiiij, yc: invoke_viiiiiiji, Oe: invoke_viiiiiijii, Kd: invoke_viiiiij, ad: invoke_viiiiiji, Lb: invoke_viiiiijii, Gc: invoke_viiiiijiii, he: invoke_viiiiijiiii, vb: invoke_viiiiijj, Pe: invoke_viiiiijjii, qb: invoke_viiiiijjji, Me: invoke_viiiij, oe: invoke_viiiiji, wc: invoke_viiiijii, xc: invoke_viiiijiii, Db: invoke_viiiijiiii, Fb: invoke_viiiijiiiii, md: invoke_viiiijiiiiiiii, Nd: invoke_viiiijijji, Re: invoke_viiiijj, Zb: invoke_viiiijji, Md: invoke_viiiijjij, Ie: invoke_viiij, de: invoke_viiiji, Ce: invoke_viiijii, Bc: invoke_viiijiii, Ld: invoke_viiijiiii, Sd: invoke_viiijiiiijjj, Jd: invoke_viiijiiijii, pd: invoke_viiijij, ab: invoke_viiijiji, qd: invoke_viiijijij, nc: invoke_viiijijj, lb: invoke_viiijijjj, Ze: invoke_viiijj, hd: invoke_viiijji, wd: invoke_viiijjii, Uc: invoke_viiijjiii, Qd: invoke_viiijjiij, Wd: invoke_viiijjij, _d: invoke_viiijjj, Sc: invoke_viiijjjj, fb: invoke_viiijjjji, Le: invoke_viij, fe: invoke_viiji, We: invoke_viijii, Vd: invoke_viijiii, Sb: invoke_viijiiii, pe: invoke_viijiiiii, Jb: invoke_viijiiiiii, Td: invoke_viijiiiij, Qc: invoke_viijiiij, Mc: invoke_viijiij, bd: invoke_viijiiji, pb: invoke_viijiijj, qe: invoke_viijij, eb: invoke_viijiji, Od: invoke_viijijiiii, Rd: invoke_viijijiiiijjj, rb: invoke_viijijj, af: invoke_viijj, ee: invoke_viijji, mc: invoke_viijjii, be: invoke_viijjj, Yd: invoke_viijjji, Se: invoke_vij, Ke: invoke_viji, Vc: invoke_vijii, Ge: invoke_vijiii, Ub: invoke_vijiiii, Mb: invoke_vijiiiii, Vb: invoke_vijiiiiii, Pc: invoke_vijiiiji, ob: invoke_vijiij, jd: invoke_vijiji, Fd: invoke_vijijiiiijjj, $d: invoke_vijijj, Ud: invoke_vijijjiij, sb: invoke_vijijjji, Xd: invoke_vijj, Fe: invoke_vijji, Va: invoke_vijjii, db: invoke_vijjiii, id: invoke_vijjij, Rc: invoke_vijjj, ed: invoke_vijjji, Bb: invoke_vj, Hc: invoke_vjii, te: invoke_vjiii, kd: invoke_vjiiii, Yb: invoke_vjiiiji, gd: invoke_vjjii, dd: invoke_vjjijij, w: _llvm_eh_typeid_for, jb: _strftime_l };
          var wasmExports = createWasm();
          var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports["yf"])();
          var _main = Module["_main"] = (a0, a1) => (_main = Module["_main"] = wasmExports["zf"])(a0, a1);
          var _duckdb_web_fs_glob_add_path = Module["_duckdb_web_fs_glob_add_path"] = (a0) => (_duckdb_web_fs_glob_add_path = Module["_duckdb_web_fs_glob_add_path"] = wasmExports["Bf"])(a0);
          var _duckdb_web_clear_response = Module["_duckdb_web_clear_response"] = () => (_duckdb_web_clear_response = Module["_duckdb_web_clear_response"] = wasmExports["Cf"])();
          var _duckdb_web_fail_with = Module["_duckdb_web_fail_with"] = (a0) => (_duckdb_web_fail_with = Module["_duckdb_web_fail_with"] = wasmExports["Df"])(a0);
          var _duckdb_web_reset = Module["_duckdb_web_reset"] = (a0) => (_duckdb_web_reset = Module["_duckdb_web_reset"] = wasmExports["Ef"])(a0);
          var _duckdb_web_connect = Module["_duckdb_web_connect"] = () => (_duckdb_web_connect = Module["_duckdb_web_connect"] = wasmExports["Ff"])();
          var _duckdb_web_disconnect = Module["_duckdb_web_disconnect"] = (a0) => (_duckdb_web_disconnect = Module["_duckdb_web_disconnect"] = wasmExports["Gf"])(a0);
          var _duckdb_web_flush_files = Module["_duckdb_web_flush_files"] = () => (_duckdb_web_flush_files = Module["_duckdb_web_flush_files"] = wasmExports["Hf"])();
          var _duckdb_web_flush_file = Module["_duckdb_web_flush_file"] = (a0) => (_duckdb_web_flush_file = Module["_duckdb_web_flush_file"] = wasmExports["If"])(a0);
          var _duckdb_web_open = Module["_duckdb_web_open"] = (a0, a1) => (_duckdb_web_open = Module["_duckdb_web_open"] = wasmExports["Jf"])(a0, a1);
          var _duckdb_web_get_global_file_info = Module["_duckdb_web_get_global_file_info"] = (a0, a1) => (_duckdb_web_get_global_file_info = Module["_duckdb_web_get_global_file_info"] = wasmExports["Kf"])(a0, a1);
          var _duckdb_web_collect_file_stats = Module["_duckdb_web_collect_file_stats"] = (a0, a1, a2) => (_duckdb_web_collect_file_stats = Module["_duckdb_web_collect_file_stats"] = wasmExports["Lf"])(a0, a1, a2);
          var _duckdb_web_export_file_stats = Module["_duckdb_web_export_file_stats"] = (a0, a1) => (_duckdb_web_export_file_stats = Module["_duckdb_web_export_file_stats"] = wasmExports["Mf"])(a0, a1);
          var _duckdb_web_fs_drop_file = Module["_duckdb_web_fs_drop_file"] = (a0, a1) => (_duckdb_web_fs_drop_file = Module["_duckdb_web_fs_drop_file"] = wasmExports["Nf"])(a0, a1);
          var _duckdb_web_fs_drop_files = Module["_duckdb_web_fs_drop_files"] = (a0) => (_duckdb_web_fs_drop_files = Module["_duckdb_web_fs_drop_files"] = wasmExports["Of"])(a0);
          var _duckdb_web_fs_glob_file_infos = Module["_duckdb_web_fs_glob_file_infos"] = (a0, a1) => (_duckdb_web_fs_glob_file_infos = Module["_duckdb_web_fs_glob_file_infos"] = wasmExports["Pf"])(a0, a1);
          var _duckdb_web_fs_get_file_info_by_id = Module["_duckdb_web_fs_get_file_info_by_id"] = (a0, a1, a2) => (_duckdb_web_fs_get_file_info_by_id = Module["_duckdb_web_fs_get_file_info_by_id"] = wasmExports["Qf"])(a0, a1, a2);
          var _duckdb_web_fs_get_file_info_by_name = Module["_duckdb_web_fs_get_file_info_by_name"] = (a0, a1, a2) => (_duckdb_web_fs_get_file_info_by_name = Module["_duckdb_web_fs_get_file_info_by_name"] = wasmExports["Rf"])(a0, a1, a2);
          var _duckdb_web_fs_register_file_url = Module["_duckdb_web_fs_register_file_url"] = (a0, a1, a2, a3, a4) => (_duckdb_web_fs_register_file_url = Module["_duckdb_web_fs_register_file_url"] = wasmExports["Sf"])(a0, a1, a2, a3, a4);
          var _duckdb_web_fs_register_file_buffer = Module["_duckdb_web_fs_register_file_buffer"] = (a0, a1, a2, a3) => (_duckdb_web_fs_register_file_buffer = Module["_duckdb_web_fs_register_file_buffer"] = wasmExports["Tf"])(a0, a1, a2, a3);
          var _duckdb_web_copy_file_to_buffer = Module["_duckdb_web_copy_file_to_buffer"] = (a0, a1) => (_duckdb_web_copy_file_to_buffer = Module["_duckdb_web_copy_file_to_buffer"] = wasmExports["Uf"])(a0, a1);
          var _duckdb_web_copy_file_to_path = Module["_duckdb_web_copy_file_to_path"] = (a0, a1, a2) => (_duckdb_web_copy_file_to_path = Module["_duckdb_web_copy_file_to_path"] = wasmExports["Vf"])(a0, a1, a2);
          var _duckdb_web_get_version = Module["_duckdb_web_get_version"] = (a0) => (_duckdb_web_get_version = Module["_duckdb_web_get_version"] = wasmExports["Wf"])(a0);
          var _duckdb_web_get_feature_flags = Module["_duckdb_web_get_feature_flags"] = () => (_duckdb_web_get_feature_flags = Module["_duckdb_web_get_feature_flags"] = wasmExports["Xf"])();
          var _duckdb_web_tokenize = Module["_duckdb_web_tokenize"] = (a0, a1) => (_duckdb_web_tokenize = Module["_duckdb_web_tokenize"] = wasmExports["Yf"])(a0, a1);
          var _duckdb_web_udf_scalar_create = Module["_duckdb_web_udf_scalar_create"] = (a0, a1, a2) => (_duckdb_web_udf_scalar_create = Module["_duckdb_web_udf_scalar_create"] = wasmExports["Zf"])(a0, a1, a2);
          var _duckdb_web_prepared_create = Module["_duckdb_web_prepared_create"] = (a0, a1, a2) => (_duckdb_web_prepared_create = Module["_duckdb_web_prepared_create"] = wasmExports["_f"])(a0, a1, a2);
          var _duckdb_web_prepared_close = Module["_duckdb_web_prepared_close"] = (a0, a1, a2) => (_duckdb_web_prepared_close = Module["_duckdb_web_prepared_close"] = wasmExports["$f"])(a0, a1, a2);
          var _duckdb_web_prepared_run = Module["_duckdb_web_prepared_run"] = (a0, a1, a2, a3) => (_duckdb_web_prepared_run = Module["_duckdb_web_prepared_run"] = wasmExports["ag"])(a0, a1, a2, a3);
          var _duckdb_web_prepared_send = Module["_duckdb_web_prepared_send"] = (a0, a1, a2, a3) => (_duckdb_web_prepared_send = Module["_duckdb_web_prepared_send"] = wasmExports["bg"])(a0, a1, a2, a3);
          var _duckdb_web_query_run = Module["_duckdb_web_query_run"] = (a0, a1, a2) => (_duckdb_web_query_run = Module["_duckdb_web_query_run"] = wasmExports["cg"])(a0, a1, a2);
          var _duckdb_web_pending_query_start = Module["_duckdb_web_pending_query_start"] = (a0, a1, a2) => (_duckdb_web_pending_query_start = Module["_duckdb_web_pending_query_start"] = wasmExports["dg"])(a0, a1, a2);
          var _duckdb_web_pending_query_poll = Module["_duckdb_web_pending_query_poll"] = (a0, a1, a2) => (_duckdb_web_pending_query_poll = Module["_duckdb_web_pending_query_poll"] = wasmExports["eg"])(a0, a1, a2);
          var _duckdb_web_pending_query_cancel = Module["_duckdb_web_pending_query_cancel"] = (a0, a1) => (_duckdb_web_pending_query_cancel = Module["_duckdb_web_pending_query_cancel"] = wasmExports["fg"])(a0, a1);
          var _duckdb_web_query_fetch_results = Module["_duckdb_web_query_fetch_results"] = (a0, a1) => (_duckdb_web_query_fetch_results = Module["_duckdb_web_query_fetch_results"] = wasmExports["gg"])(a0, a1);
          var _duckdb_web_get_tablenames = Module["_duckdb_web_get_tablenames"] = (a0, a1, a2) => (_duckdb_web_get_tablenames = Module["_duckdb_web_get_tablenames"] = wasmExports["hg"])(a0, a1, a2);
          var _duckdb_web_insert_arrow_from_ipc_stream = Module["_duckdb_web_insert_arrow_from_ipc_stream"] = (a0, a1, a2, a3, a4) => (_duckdb_web_insert_arrow_from_ipc_stream = Module["_duckdb_web_insert_arrow_from_ipc_stream"] = wasmExports["ig"])(a0, a1, a2, a3, a4);
          var _duckdb_web_insert_csv_from_path = Module["_duckdb_web_insert_csv_from_path"] = (a0, a1, a2, a3) => (_duckdb_web_insert_csv_from_path = Module["_duckdb_web_insert_csv_from_path"] = wasmExports["jg"])(a0, a1, a2, a3);
          var _duckdb_web_insert_json_from_path = Module["_duckdb_web_insert_json_from_path"] = (a0, a1, a2, a3) => (_duckdb_web_insert_json_from_path = Module["_duckdb_web_insert_json_from_path"] = wasmExports["kg"])(a0, a1, a2, a3);
          var ___errno_location = () => (___errno_location = wasmExports["__errno_location"])();
          var _htonl = (a0) => (_htonl = wasmExports["lg"])(a0);
          var _htons = (a0) => (_htons = wasmExports["mg"])(a0);
          var _ntohs = (a0) => (_ntohs = wasmExports["ng"])(a0);
          var _malloc = Module["_malloc"] = (a0) => (_malloc = Module["_malloc"] = wasmExports["og"])(a0);
          var _free = Module["_free"] = (a0) => (_free = Module["_free"] = wasmExports["pg"])(a0);
          var _setThrew = (a0, a1) => (_setThrew = wasmExports["qg"])(a0, a1);
          var setTempRet0 = (a0) => (setTempRet0 = wasmExports["rg"])(a0);
          var stackSave = () => (stackSave = wasmExports["sg"])();
          var stackRestore = (a0) => (stackRestore = wasmExports["tg"])(a0);
          var stackAlloc = (a0) => (stackAlloc = wasmExports["ug"])(a0);
          var ___cxa_free_exception = (a0) => (___cxa_free_exception = wasmExports["__cxa_free_exception"])(a0);
          var ___cxa_increment_exception_refcount = (a0) => (___cxa_increment_exception_refcount = wasmExports["vg"])(a0);
          var ___cxa_decrement_exception_refcount = (a0) => (___cxa_decrement_exception_refcount = wasmExports["wg"])(a0);
          var ___cxa_can_catch = (a0, a1, a2) => (___cxa_can_catch = wasmExports["xg"])(a0, a1, a2);
          var ___cxa_is_pointer_type = (a0) => (___cxa_is_pointer_type = wasmExports["yg"])(a0);
          var dynCall_jiiii = Module["dynCall_jiiii"] = (a0, a1, a2, a3, a4) => (dynCall_jiiii = Module["dynCall_jiiii"] = wasmExports["zg"])(a0, a1, a2, a3, a4);
          var dynCall_iiiiij = Module["dynCall_iiiiij"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_iiiiij = Module["dynCall_iiiiij"] = wasmExports["Ag"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_iiiiijj = Module["dynCall_iiiiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_iiiiijj = Module["dynCall_iiiiijj"] = wasmExports["Bg"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_viijii = Module["dynCall_viijii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_viijii = Module["dynCall_viijii"] = wasmExports["Cg"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_viiiij = Module["dynCall_viiiij"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_viiiij = Module["dynCall_viiiij"] = wasmExports["Dg"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_iij = Module["dynCall_iij"] = (a0, a1, a2, a3) => (dynCall_iij = Module["dynCall_iij"] = wasmExports["Eg"])(a0, a1, a2, a3);
          var dynCall_iiji = Module["dynCall_iiji"] = (a0, a1, a2, a3, a4) => (dynCall_iiji = Module["dynCall_iiji"] = wasmExports["Fg"])(a0, a1, a2, a3, a4);
          var dynCall_vijji = Module["dynCall_vijji"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_vijji = Module["dynCall_vijji"] = wasmExports["Gg"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_ji = Module["dynCall_ji"] = (a0, a1) => (dynCall_ji = Module["dynCall_ji"] = wasmExports["Hg"])(a0, a1);
          var dynCall_viji = Module["dynCall_viji"] = (a0, a1, a2, a3, a4) => (dynCall_viji = Module["dynCall_viji"] = wasmExports["Ig"])(a0, a1, a2, a3, a4);
          var dynCall_iiiji = Module["dynCall_iiiji"] = (a0, a1, a2, a3, a4, a5) => (dynCall_iiiji = Module["dynCall_iiiji"] = wasmExports["Jg"])(a0, a1, a2, a3, a4, a5);
          var dynCall_viiij = Module["dynCall_viiij"] = (a0, a1, a2, a3, a4, a5) => (dynCall_viiij = Module["dynCall_viiij"] = wasmExports["Kg"])(a0, a1, a2, a3, a4, a5);
          var dynCall_iiiij = Module["dynCall_iiiij"] = (a0, a1, a2, a3, a4, a5) => (dynCall_iiiij = Module["dynCall_iiiij"] = wasmExports["Lg"])(a0, a1, a2, a3, a4, a5);
          var dynCall_iiijj = Module["dynCall_iiijj"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_iiijj = Module["dynCall_iiijj"] = wasmExports["Mg"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_iiij = Module["dynCall_iiij"] = (a0, a1, a2, a3, a4) => (dynCall_iiij = Module["dynCall_iiij"] = wasmExports["Ng"])(a0, a1, a2, a3, a4);
          var dynCall_viijiiiii = Module["dynCall_viijiiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viijiiiii = Module["dynCall_viijiiiii"] = wasmExports["Og"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_viij = Module["dynCall_viij"] = (a0, a1, a2, a3, a4) => (dynCall_viij = Module["dynCall_viij"] = wasmExports["Pg"])(a0, a1, a2, a3, a4);
          var dynCall_vij = Module["dynCall_vij"] = (a0, a1, a2, a3) => (dynCall_vij = Module["dynCall_vij"] = wasmExports["Qg"])(a0, a1, a2, a3);
          var dynCall_jiiijii = Module["dynCall_jiiijii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_jiiijii = Module["dynCall_jiiijii"] = wasmExports["Rg"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_jiijiii = Module["dynCall_jiijiii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_jiijiii = Module["dynCall_jiijiii"] = wasmExports["Sg"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_jiijii = Module["dynCall_jiijii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_jiijii = Module["dynCall_jiijii"] = wasmExports["Tg"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_j = Module["dynCall_j"] = (a0) => (dynCall_j = Module["dynCall_j"] = wasmExports["Ug"])(a0);
          var dynCall_viiiiji = Module["dynCall_viiiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_viiiiji = Module["dynCall_viiiiji"] = wasmExports["Vg"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_jiiiijii = Module["dynCall_jiiiijii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_jiiiijii = Module["dynCall_jiiiijii"] = wasmExports["Wg"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_jiiijiii = Module["dynCall_jiiijiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_jiiijiii = Module["dynCall_jiiijiii"] = wasmExports["Xg"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_jiiiiijiiii = Module["dynCall_jiiiiijiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_jiiiiijiiii = Module["dynCall_jiiiiijiiii"] = wasmExports["Yg"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_viiiiijiiii = Module["dynCall_viiiiijiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_viiiiijiiii = Module["dynCall_viiiiijiiii"] = wasmExports["Zg"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_iiijij = Module["dynCall_iiijij"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_iiijij = Module["dynCall_iiijij"] = wasmExports["_g"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_viiji = Module["dynCall_viiji"] = (a0, a1, a2, a3, a4, a5) => (dynCall_viiji = Module["dynCall_viiji"] = wasmExports["$g"])(a0, a1, a2, a3, a4, a5);
          var dynCall_viiiji = Module["dynCall_viiiji"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_viiiji = Module["dynCall_viiiji"] = wasmExports["ah"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_viijji = Module["dynCall_viijji"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_viijji = Module["dynCall_viijji"] = wasmExports["bh"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_vijijj = Module["dynCall_vijijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_vijijj = Module["dynCall_vijijj"] = wasmExports["ch"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_viiijjj = Module["dynCall_viiijjj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viiijjj = Module["dynCall_viiijjj"] = wasmExports["dh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_iji = Module["dynCall_iji"] = (a0, a1, a2, a3) => (dynCall_iji = Module["dynCall_iji"] = wasmExports["eh"])(a0, a1, a2, a3);
          var dynCall_viijjji = Module["dynCall_viijjji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viijjji = Module["dynCall_viijjji"] = wasmExports["fh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_viijj = Module["dynCall_viijj"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_viijj = Module["dynCall_viijj"] = wasmExports["gh"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_viiijj = Module["dynCall_viiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_viiijj = Module["dynCall_viiijj"] = wasmExports["hh"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_viijjj = Module["dynCall_viijjj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_viijjj = Module["dynCall_viijjj"] = wasmExports["ih"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_vijj = Module["dynCall_vijj"] = (a0, a1, a2, a3, a4, a5) => (dynCall_vijj = Module["dynCall_vijj"] = wasmExports["jh"])(a0, a1, a2, a3, a4, a5);
          var dynCall_viiijjij = Module["dynCall_viiijjij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_viiijjij = Module["dynCall_viiijjij"] = wasmExports["kh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_viijiii = Module["dynCall_viijiii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_viijiii = Module["dynCall_viijiii"] = wasmExports["lh"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_vijijjiij = Module["dynCall_vijijjiij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) => (dynCall_vijijjiij = Module["dynCall_vijijjiij"] = wasmExports["mh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
          var dynCall_viiijjiij = Module["dynCall_viiijjiij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_viiijjiij = Module["dynCall_viiijjiij"] = wasmExports["nh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_jiiijiijiii = Module["dynCall_jiiijiijiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) => (dynCall_jiiijiijiii = Module["dynCall_jiiijiijiii"] = wasmExports["oh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
          var dynCall_viijiiiij = Module["dynCall_viijiiiij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_viijiiiij = Module["dynCall_viijiiiij"] = wasmExports["ph"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_viiijiiiijjj = Module["dynCall_viiijiiiijjj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15) => (dynCall_viiijiiiijjj = Module["dynCall_viiijiiiijjj"] = wasmExports["qh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15);
          var dynCall_viijijiiiijjj = Module["dynCall_viijijiiiijjj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17) => (dynCall_viijijiiiijjj = Module["dynCall_viijijiiiijjj"] = wasmExports["rh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17);
          var dynCall_viiiijjij = Module["dynCall_viiiijjij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_viiiijjij = Module["dynCall_viiiijjij"] = wasmExports["sh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_viiijiiii = Module["dynCall_viiijiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viiijiiii = Module["dynCall_viiijiiii"] = wasmExports["th"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_jiiiiji = Module["dynCall_jiiiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_jiiiiji = Module["dynCall_jiiiiji"] = wasmExports["uh"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_viiiijijji = Module["dynCall_viiiijijji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) => (dynCall_viiiijijji = Module["dynCall_viiiijijji"] = wasmExports["vh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
          var dynCall_viiijiiijii = Module["dynCall_viiijiiijii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) => (dynCall_viiijiiijii = Module["dynCall_viiijiiijii"] = wasmExports["wh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
          var dynCall_viijijiiii = Module["dynCall_viijijiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_viijijiiii = Module["dynCall_viijijiiii"] = wasmExports["xh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_jj = Module["dynCall_jj"] = (a0, a1, a2) => (dynCall_jj = Module["dynCall_jj"] = wasmExports["yh"])(a0, a1, a2);
          var dynCall_jd = Module["dynCall_jd"] = (a0, a1) => (dynCall_jd = Module["dynCall_jd"] = wasmExports["zh"])(a0, a1);
          var dynCall_jf = Module["dynCall_jf"] = (a0, a1) => (dynCall_jf = Module["dynCall_jf"] = wasmExports["Ah"])(a0, a1);
          var dynCall_iijjj = Module["dynCall_iijjj"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_iijjj = Module["dynCall_iijjj"] = wasmExports["Bh"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_iiiijj = Module["dynCall_iiiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_iiiijj = Module["dynCall_iiiijj"] = wasmExports["Ch"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_iiijji = Module["dynCall_iiijji"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_iiijji = Module["dynCall_iiijji"] = wasmExports["Dh"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_vijijiiiijjj = Module["dynCall_vijijiiiijjj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16) => (dynCall_vijijiiiijjj = Module["dynCall_vijijiiiijjj"] = wasmExports["Eh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16);
          var dynCall_viiiiiij = Module["dynCall_viiiiiij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_viiiiiij = Module["dynCall_viiiiiij"] = wasmExports["Fh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_jii = Module["dynCall_jii"] = (a0, a1, a2) => (dynCall_jii = Module["dynCall_jii"] = wasmExports["Gh"])(a0, a1, a2);
          var dynCall_iiiijjiii = Module["dynCall_iiiijjiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_iiiijjiii = Module["dynCall_iiiijjiii"] = wasmExports["Hh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_iiiiiij = Module["dynCall_iiiiiij"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_iiiiiij = Module["dynCall_iiiiiij"] = wasmExports["Ih"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_iiiiiiiij = Module["dynCall_iiiiiiiij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iiiiiiiij = Module["dynCall_iiiiiiiij"] = wasmExports["Jh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_jiii = Module["dynCall_jiii"] = (a0, a1, a2, a3) => (dynCall_jiii = Module["dynCall_jiii"] = wasmExports["Kh"])(a0, a1, a2, a3);
          var dynCall_iiiiiiij = Module["dynCall_iiiiiiij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_iiiiiiij = Module["dynCall_iiiiiiij"] = wasmExports["Lh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_iiiiiiji = Module["dynCall_iiiiiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_iiiiiiji = Module["dynCall_iiiiiiji"] = wasmExports["Mh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_iiiijiii = Module["dynCall_iiiijiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_iiiijiii = Module["dynCall_iiiijiii"] = wasmExports["Nh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_iiiijii = Module["dynCall_iiiijii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_iiiijii = Module["dynCall_iiiijii"] = wasmExports["Oh"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_jiiiii = Module["dynCall_jiiiii"] = (a0, a1, a2, a3, a4, a5) => (dynCall_jiiiii = Module["dynCall_jiiiii"] = wasmExports["Ph"])(a0, a1, a2, a3, a4, a5);
          var dynCall_iiiiji = Module["dynCall_iiiiji"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_iiiiji = Module["dynCall_iiiiji"] = wasmExports["Qh"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_iiiiiji = Module["dynCall_iiiiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_iiiiiji = Module["dynCall_iiiiiji"] = wasmExports["Rh"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_iiijii = Module["dynCall_iiijii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_iiijii = Module["dynCall_iiijii"] = wasmExports["Sh"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_iijj = Module["dynCall_iijj"] = (a0, a1, a2, a3, a4, a5) => (dynCall_iijj = Module["dynCall_iijj"] = wasmExports["Th"])(a0, a1, a2, a3, a4, a5);
          var dynCall_iiijjj = Module["dynCall_iiijjj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_iiijjj = Module["dynCall_iiijjj"] = wasmExports["Uh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_viiiiij = Module["dynCall_viiiiij"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_viiiiij = Module["dynCall_viiiiij"] = wasmExports["Vh"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_iijiji = Module["dynCall_iijiji"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_iijiji = Module["dynCall_iijiji"] = wasmExports["Wh"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_viiiijiiiiiiii = Module["dynCall_viiiijiiiiiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14) => (dynCall_viiiijiiiiiiii = Module["dynCall_viiiijiiiiiiii"] = wasmExports["Xh"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14);
          var dynCall_jiij = Module["dynCall_jiij"] = (a0, a1, a2, a3, a4) => (dynCall_jiij = Module["dynCall_jiij"] = wasmExports["Yh"])(a0, a1, a2, a3, a4);
          var dynCall_jiiiji = Module["dynCall_jiiiji"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_jiiiji = Module["dynCall_jiiiji"] = wasmExports["Zh"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_viijiiji = Module["dynCall_viijiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viijiiji = Module["dynCall_viijiiji"] = wasmExports["_h"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_iiiiiijjiijjji = Module["dynCall_iiiiiijjiijjji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17, a18) => (dynCall_iiiiiijjiijjji = Module["dynCall_iiiiiijjiijjji"] = wasmExports["$h"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17, a18);
          var dynCall_iiijjijjiii = Module["dynCall_iiijjijjiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14) => (dynCall_iiijjijjiii = Module["dynCall_iiijjijjiii"] = wasmExports["ai"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14);
          var dynCall_iiiijjii = Module["dynCall_iiiijjii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iiiijjii = Module["dynCall_iiiijjii"] = wasmExports["bi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_iiiijji = Module["dynCall_iiiijji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_iiiijji = Module["dynCall_iiiijji"] = wasmExports["ci"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_iiijjii = Module["dynCall_iiijjii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_iiijjii = Module["dynCall_iiijjii"] = wasmExports["di"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_vijii = Module["dynCall_vijii"] = (a0, a1, a2, a3, a4, a5) => (dynCall_vijii = Module["dynCall_vijii"] = wasmExports["ei"])(a0, a1, a2, a3, a4, a5);
          var dynCall_vjjijij = Module["dynCall_vjjijij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_vjjijij = Module["dynCall_vjjijij"] = wasmExports["fi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_vijjji = Module["dynCall_vijjji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_vijjji = Module["dynCall_vijjji"] = wasmExports["gi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_vjjii = Module["dynCall_vjjii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_vjjii = Module["dynCall_vjjii"] = wasmExports["hi"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_viiiiiji = Module["dynCall_viiiiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_viiiiiji = Module["dynCall_viiiiiji"] = wasmExports["ii"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_viiijjiii = Module["dynCall_viiijjiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_viiijjiii = Module["dynCall_viiijjiii"] = wasmExports["ji"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_iiijjjj = Module["dynCall_iiijjjj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_iiijjjj = Module["dynCall_iiijjjj"] = wasmExports["ki"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_viiijjjj = Module["dynCall_viiijjjj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_viiijjjj = Module["dynCall_viiijjjj"] = wasmExports["li"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_vijjj = Module["dynCall_vijjj"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_vijjj = Module["dynCall_vijjj"] = wasmExports["mi"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_jijij = Module["dynCall_jijij"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_jijij = Module["dynCall_jijij"] = wasmExports["ni"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_jiiij = Module["dynCall_jiiij"] = (a0, a1, a2, a3, a4, a5) => (dynCall_jiiij = Module["dynCall_jiiij"] = wasmExports["oi"])(a0, a1, a2, a3, a4, a5);
          var dynCall_jijjij = Module["dynCall_jijjij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_jijjij = Module["dynCall_jijjij"] = wasmExports["pi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_jij = Module["dynCall_jij"] = (a0, a1, a2, a3) => (dynCall_jij = Module["dynCall_jij"] = wasmExports["qi"])(a0, a1, a2, a3);
          var dynCall_jijiii = Module["dynCall_jijiii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_jijiii = Module["dynCall_jijiii"] = wasmExports["ri"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_viijiiij = Module["dynCall_viijiiij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viijiiij = Module["dynCall_viijiiij"] = wasmExports["si"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_vijiiiji = Module["dynCall_vijiiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_vijiiiji = Module["dynCall_vijiiiji"] = wasmExports["ti"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_jiiji = Module["dynCall_jiiji"] = (a0, a1, a2, a3, a4, a5) => (dynCall_jiiji = Module["dynCall_jiiji"] = wasmExports["ui"])(a0, a1, a2, a3, a4, a5);
          var dynCall_viiijij = Module["dynCall_viiijij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_viiijij = Module["dynCall_viiijij"] = wasmExports["vi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_viijiij = Module["dynCall_viijiij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_viijiij = Module["dynCall_viijiij"] = wasmExports["wi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_viiiiijj = Module["dynCall_viiiiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viiiiijj = Module["dynCall_viiiiijj"] = wasmExports["xi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_viiijji = Module["dynCall_viiijji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_viiijji = Module["dynCall_viiijji"] = wasmExports["yi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_vijjij = Module["dynCall_vijjij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_vijjij = Module["dynCall_vijjij"] = wasmExports["zi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_vijiji = Module["dynCall_vijiji"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_vijiji = Module["dynCall_vijiji"] = wasmExports["Ai"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_jiiiij = Module["dynCall_jiiiij"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_jiiiij = Module["dynCall_jiiiij"] = wasmExports["Bi"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_ij = Module["dynCall_ij"] = (a0, a1, a2) => (dynCall_ij = Module["dynCall_ij"] = wasmExports["Ci"])(a0, a1, a2);
          var dynCall_jjj = Module["dynCall_jjj"] = (a0, a1, a2, a3, a4) => (dynCall_jjj = Module["dynCall_jjj"] = wasmExports["Di"])(a0, a1, a2, a3, a4);
          var dynCall_jjiji = Module["dynCall_jjiji"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_jjiji = Module["dynCall_jjiji"] = wasmExports["Ei"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_jjjd = Module["dynCall_jjjd"] = (a0, a1, a2, a3, a4, a5) => (dynCall_jjjd = Module["dynCall_jjjd"] = wasmExports["Fi"])(a0, a1, a2, a3, a4, a5);
          var dynCall_jijj = Module["dynCall_jijj"] = (a0, a1, a2, a3, a4, a5) => (dynCall_jijj = Module["dynCall_jijj"] = wasmExports["Gi"])(a0, a1, a2, a3, a4, a5);
          var dynCall_ijii = Module["dynCall_ijii"] = (a0, a1, a2, a3, a4) => (dynCall_ijii = Module["dynCall_ijii"] = wasmExports["Hi"])(a0, a1, a2, a3, a4);
          var dynCall_vjii = Module["dynCall_vjii"] = (a0, a1, a2, a3, a4) => (dynCall_vjii = Module["dynCall_vjii"] = wasmExports["Ii"])(a0, a1, a2, a3, a4);
          var dynCall_vjiiii = Module["dynCall_vjiiii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_vjiiii = Module["dynCall_vjiiii"] = wasmExports["Ji"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_viiiiijiii = Module["dynCall_viiiiijiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_viiiiijiii = Module["dynCall_viiiiijiii"] = wasmExports["Ki"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_ijji = Module["dynCall_ijji"] = (a0, a1, a2, a3, a4, a5) => (dynCall_ijji = Module["dynCall_ijji"] = wasmExports["Li"])(a0, a1, a2, a3, a4, a5);
          var dynCall_iiiiijii = Module["dynCall_iiiiijii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_iiiiijii = Module["dynCall_iiiiijii"] = wasmExports["Mi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_viiijiii = Module["dynCall_viiijiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_viiijiii = Module["dynCall_viiijiii"] = wasmExports["Ni"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_viijij = Module["dynCall_viijij"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_viijij = Module["dynCall_viijij"] = wasmExports["Oi"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_viiiiiiji = Module["dynCall_viiiiiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viiiiiiji = Module["dynCall_viiiiiiji"] = wasmExports["Pi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_viiijii = Module["dynCall_viiijii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_viiijii = Module["dynCall_viiijii"] = wasmExports["Qi"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_viiiijiii = Module["dynCall_viiiijiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viiiijiii = Module["dynCall_viiiijiii"] = wasmExports["Ri"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_viiiijii = Module["dynCall_viiiijii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_viiiijii = Module["dynCall_viiiijii"] = wasmExports["Si"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_iiijiij = Module["dynCall_iiijiij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_iiijiij = Module["dynCall_iiijiij"] = wasmExports["Ti"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_iiiijjj = Module["dynCall_iiiijjj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iiiijjj = Module["dynCall_iiiijjj"] = wasmExports["Ui"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_jijji = Module["dynCall_jijji"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_jijji = Module["dynCall_jijji"] = wasmExports["Vi"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_viiijijij = Module["dynCall_viiijijij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_viiijijij = Module["dynCall_viiijijij"] = wasmExports["Wi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_jijjjjii = Module["dynCall_jijjjjii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_jijjjjii = Module["dynCall_jijjjjii"] = wasmExports["Xi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_iiiiijij = Module["dynCall_iiiiijij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iiiiijij = Module["dynCall_iiiiijij"] = wasmExports["Yi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_iiiiijiii = Module["dynCall_iiiiijiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iiiiijiii = Module["dynCall_iiiiijiii"] = wasmExports["Zi"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_viijjii = Module["dynCall_viijjii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_viijjii = Module["dynCall_viijjii"] = wasmExports["_i"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_iiiiiiiiiiji = Module["dynCall_iiiiiiiiiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) => (dynCall_iiiiiiiiiiji = Module["dynCall_iiiiiiiiiiji"] = wasmExports["$i"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
          var dynCall_iiiiiiijj = Module["dynCall_iiiiiiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_iiiiiiijj = Module["dynCall_iiiiiiijj"] = wasmExports["aj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_viiijjii = Module["dynCall_viiijjii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viiijjii = Module["dynCall_viiijjii"] = wasmExports["bj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_jiiijjj = Module["dynCall_jiiijjj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_jiiijjj = Module["dynCall_jiiijjj"] = wasmExports["cj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_viiijijj = Module["dynCall_viiijijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_viiijijj = Module["dynCall_viiijijj"] = wasmExports["dj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_jiiiiiii = Module["dynCall_jiiiiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_jiiiiiii = Module["dynCall_jiiiiiii"] = wasmExports["ej"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_jiijj = Module["dynCall_jiijj"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_jiijj = Module["dynCall_jiijj"] = wasmExports["fj"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_jiiijj = Module["dynCall_jiiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_jiiijj = Module["dynCall_jiiijj"] = wasmExports["gj"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_iijii = Module["dynCall_iijii"] = (a0, a1, a2, a3, a4, a5) => (dynCall_iijii = Module["dynCall_iijii"] = wasmExports["hj"])(a0, a1, a2, a3, a4, a5);
          var dynCall_iiidj = Module["dynCall_iiidj"] = (a0, a1, a2, a3, a4, a5) => (dynCall_iiidj = Module["dynCall_iiidj"] = wasmExports["ij"])(a0, a1, a2, a3, a4, a5);
          var dynCall_iiiiiiiji = Module["dynCall_iiiiiiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iiiiiiiji = Module["dynCall_iiiiiiiji"] = wasmExports["jj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_iiiiiiiiijiiiiiii = Module["dynCall_iiiiiiiiijiiiiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17) => (dynCall_iiiiiiiiijiiiiiii = Module["dynCall_iiiiiiiiijiiiiiii"] = wasmExports["kj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17);
          var dynCall_iiijjiiji = Module["dynCall_iiijjiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_iiijjiiji = Module["dynCall_iiijjiiji"] = wasmExports["lj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_iiijjiij = Module["dynCall_iiijjiij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_iiijjiij = Module["dynCall_iiijjiij"] = wasmExports["mj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_iiiidjj = Module["dynCall_iiiidjj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_iiiidjj = Module["dynCall_iiiidjj"] = wasmExports["nj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_iiiiiiiiji = Module["dynCall_iiiiiiiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_iiiiiiiiji = Module["dynCall_iiiiiiiiji"] = wasmExports["oj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_iiijiiiij = Module["dynCall_iiijiiiij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_iiijiiiij = Module["dynCall_iiijiiiij"] = wasmExports["pj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_iiijiiij = Module["dynCall_iiijiiij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iiijiiij = Module["dynCall_iiijiiij"] = wasmExports["qj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_iiiiiiiiiiiij = Module["dynCall_iiiiiiiiiiiij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13) => (dynCall_iiiiiiiiiiiij = Module["dynCall_iiiiiiiiiiiij"] = wasmExports["rj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13);
          var dynCall_viiiijji = Module["dynCall_viiiijji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viiiijji = Module["dynCall_viiiijji"] = wasmExports["sj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_jiiiiii = Module["dynCall_jiiiiii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_jiiiiii = Module["dynCall_jiiiiii"] = wasmExports["tj"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_jiiiijiiii = Module["dynCall_jiiiijiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_jiiiijiiii = Module["dynCall_jiiiijiiii"] = wasmExports["uj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_jiijjjii = Module["dynCall_jiijjjii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_jiijjjii = Module["dynCall_jiijjjii"] = wasmExports["vj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_vjiiiji = Module["dynCall_vjiiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_vjiiiji = Module["dynCall_vjiiiji"] = wasmExports["wj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_fiijii = Module["dynCall_fiijii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_fiijii = Module["dynCall_fiijii"] = wasmExports["xj"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_diijii = Module["dynCall_diijii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_diijii = Module["dynCall_diijii"] = wasmExports["yj"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_iiiiiiijii = Module["dynCall_iiiiiiijii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_iiiiiiijii = Module["dynCall_iiiiiiijii"] = wasmExports["zj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_iiijiii = Module["dynCall_iiijiii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_iiijiii = Module["dynCall_iiijiii"] = wasmExports["Aj"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_viijiiii = Module["dynCall_viijiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_viijiiii = Module["dynCall_viijiiii"] = wasmExports["Bj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_vijiii = Module["dynCall_vijiii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_vijiii = Module["dynCall_vijiii"] = wasmExports["Cj"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_iijjii = Module["dynCall_iijjii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_iijjii = Module["dynCall_iijjii"] = wasmExports["Dj"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_iijjiii = Module["dynCall_iijjiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_iijjiii = Module["dynCall_iijjiii"] = wasmExports["Ej"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_iiijjiii = Module["dynCall_iiijjiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iiijjiii = Module["dynCall_iiijjiii"] = wasmExports["Fj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_iijji = Module["dynCall_iijji"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_iijji = Module["dynCall_iijji"] = wasmExports["Gj"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_vijiiiiii = Module["dynCall_vijiiiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_vijiiiiii = Module["dynCall_vijiiiiii"] = wasmExports["Hj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_vijiiii = Module["dynCall_vijiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_vijiiii = Module["dynCall_vijiiii"] = wasmExports["Ij"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_iijiiii = Module["dynCall_iijiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_iijiiii = Module["dynCall_iijiiii"] = wasmExports["Jj"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_vijiiiii = Module["dynCall_vijiiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_vijiiiii = Module["dynCall_vijiiiii"] = wasmExports["Kj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_viiiiijii = Module["dynCall_viiiiijii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viiiiijii = Module["dynCall_viiiiijii"] = wasmExports["Lj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_ijjji = Module["dynCall_ijjji"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_ijjji = Module["dynCall_ijjji"] = wasmExports["Mj"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_viijiiiiii = Module["dynCall_viijiiiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_viijiiiiii = Module["dynCall_viijiiiiii"] = wasmExports["Nj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_jjjji = Module["dynCall_jjjji"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_jjjji = Module["dynCall_jjjji"] = wasmExports["Oj"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_jjjii = Module["dynCall_jjjii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_jjjii = Module["dynCall_jjjii"] = wasmExports["Pj"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_jji = Module["dynCall_jji"] = (a0, a1, a2, a3) => (dynCall_jji = Module["dynCall_jji"] = wasmExports["Qj"])(a0, a1, a2, a3);
          var dynCall_viiiijiiiii = Module["dynCall_viiiijiiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_viiiijiiiii = Module["dynCall_viiiijiiiii"] = wasmExports["Rj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_viiiijiiii = Module["dynCall_viiiijiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_viiiijiiii = Module["dynCall_viiiijiiii"] = wasmExports["Sj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_iijjijj = Module["dynCall_iijjijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_iijjijj = Module["dynCall_iijjijj"] = wasmExports["Tj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_vj = Module["dynCall_vj"] = (a0, a1, a2) => (dynCall_vj = Module["dynCall_vj"] = wasmExports["Uj"])(a0, a1, a2);
          var dynCall_viiiijj = Module["dynCall_viiiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_viiiijj = Module["dynCall_viiiijj"] = wasmExports["Vj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_viiiiijjii = Module["dynCall_viiiiijjii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_viiiiijjii = Module["dynCall_viiiiijjii"] = wasmExports["Wj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_viiiiiijii = Module["dynCall_viiiiiijii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_viiiiiijii = Module["dynCall_viiiiiijii"] = wasmExports["Xj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_viiiiiiijjjji = Module["dynCall_viiiiiiijjjji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16) => (dynCall_viiiiiiijjjji = Module["dynCall_viiiiiiijjjji"] = wasmExports["Yj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16);
          var dynCall_vjiii = Module["dynCall_vjiii"] = (a0, a1, a2, a3, a4, a5) => (dynCall_vjiii = Module["dynCall_vjiii"] = wasmExports["Zj"])(a0, a1, a2, a3, a4, a5);
          var dynCall_ijjiii = Module["dynCall_ijjiii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_ijjiii = Module["dynCall_ijjiii"] = wasmExports["_j"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_iiijiiji = Module["dynCall_iiijiiji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iiijiiji = Module["dynCall_iiijiiji"] = wasmExports["$j"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_iijiij = Module["dynCall_iijiij"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_iijiij = Module["dynCall_iijiij"] = wasmExports["ak"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_iijiii = Module["dynCall_iijiii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_iijiii = Module["dynCall_iijiii"] = wasmExports["bk"])(a0, a1, a2, a3, a4, a5, a6);
          var dynCall_vijijjji = Module["dynCall_vijijjji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_vijijjji = Module["dynCall_vijijjji"] = wasmExports["ck"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_viijiijj = Module["dynCall_viijiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_viijiijj = Module["dynCall_viijiijj"] = wasmExports["dk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_viijijj = Module["dynCall_viijijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viijijj = Module["dynCall_viijijj"] = wasmExports["ek"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_vijiij = Module["dynCall_vijiij"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_vijiij = Module["dynCall_vijiij"] = wasmExports["fk"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_viiiiijjji = Module["dynCall_viiiiijjji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) => (dynCall_viiiiijjji = Module["dynCall_viiiiijjji"] = wasmExports["gk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
          var dynCall_iiijiijj = Module["dynCall_iiijiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_iiijiijj = Module["dynCall_iiijiijj"] = wasmExports["hk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_viiijijjj = Module["dynCall_viiijijjj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) => (dynCall_viiijijjj = Module["dynCall_viiijijjj"] = wasmExports["ik"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
          var dynCall_iijiijj = Module["dynCall_iijiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iijiijj = Module["dynCall_iijiijj"] = wasmExports["jk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_iijiiijj = Module["dynCall_iijiiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_iijiiijj = Module["dynCall_iijiiijj"] = wasmExports["kk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_iiijiiijj = Module["dynCall_iiijiiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_iiijiiijj = Module["dynCall_iiijiiijj"] = wasmExports["lk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_iiijiiiijj = Module["dynCall_iiijiiiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) => (dynCall_iiijiiiijj = Module["dynCall_iiijiiiijj"] = wasmExports["mk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
          var dynCall_viiijjjji = Module["dynCall_viiijjjji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) => (dynCall_viiijjjji = Module["dynCall_viiijjjji"] = wasmExports["nk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
          var dynCall_vijjiii = Module["dynCall_vijjiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_vijjiii = Module["dynCall_vijjiii"] = wasmExports["ok"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_iiijjji = Module["dynCall_iiijjji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iiijjji = Module["dynCall_iiijjji"] = wasmExports["pk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_iiiiiiijji = Module["dynCall_iiiiiiijji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_iiiiiiijji = Module["dynCall_iiiiiiijji"] = wasmExports["qk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_iijjjii = Module["dynCall_iijjjii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iijjjii = Module["dynCall_iijjjii"] = wasmExports["rk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_iiiiijjji = Module["dynCall_iiiiijjji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_iiiiijjji = Module["dynCall_iiiiijjji"] = wasmExports["sk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
          var dynCall_iiiiijjj = Module["dynCall_iiiiijjj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_iiiiijjj = Module["dynCall_iiiiijjj"] = wasmExports["tk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
          var dynCall_viiijiji = Module["dynCall_viiijiji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_viiijiji = Module["dynCall_viiijiji"] = wasmExports["uk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_jijiiii = Module["dynCall_jijiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_jijiiii = Module["dynCall_jijiiii"] = wasmExports["vk"])(a0, a1, a2, a3, a4, a5, a6, a7);
          var dynCall_viijiji = Module["dynCall_viijiji"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_viijiji = Module["dynCall_viijiji"] = wasmExports["wk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_iiiiiijii = Module["dynCall_iiiiiijii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iiiiiijii = Module["dynCall_iiiiiijii"] = wasmExports["xk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          var dynCall_iijjij = Module["dynCall_iijjij"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_iijjij = Module["dynCall_iijjij"] = wasmExports["yk"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
          var dynCall_vijjii = Module["dynCall_vijjii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_vijjii = Module["dynCall_vijjii"] = wasmExports["zk"])(a0, a1, a2, a3, a4, a5, a6, a7);
          function invoke_v(index) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)();
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vii(index, a1, a2) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_ii(index, a1) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vi(index, a1) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iii(index, a1, a2) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiii(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viii(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiii(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_fiii(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_diii(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiii(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viid(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiii(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_i(index) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)();
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiid(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_idiii(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vid(index, a1, a2) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_if(index, a1) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_id(index, a1) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iid(index, a1, a2) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiiidiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vfii(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vdii(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_di(index, a1) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_fi(index, a1) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiid(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iidii(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viidii(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vif(index, a1, a2) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_fiiii(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_diiii(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viddddi(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_dii(index, a1, a2) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_diiiiid(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiid(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiid(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iff(index, a1, a2) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_idd(index, a1, a2) {
            var sp = stackSave();
            try {
              return getWasmTableEntry(index)(a1, a2);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiidiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiii(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              return dynCall_jiiii(index, a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijj(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              dynCall_viijj(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijj(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_iiijj(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiij(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              return dynCall_iiij(index, a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijj(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              dynCall_viiijj(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_ji(index, a1) {
            var sp = stackSave();
            try {
              return dynCall_ji(index, a1);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jii(index, a1, a2) {
            var sp = stackSave();
            try {
              return dynCall_jii(index, a1, a2);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              dynCall_viijii(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiij(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_iiiiij(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_iiiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vij(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              dynCall_vij(index, a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_viiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiiij(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_viiiiiij(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiijjii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              dynCall_viiiiijjii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              dynCall_viiiiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiiiijjjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16) {
            var sp = stackSave();
            try {
              dynCall_viiiiiiijjjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiij(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              dynCall_viiiij(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viij(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              dynCall_viij(index, a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viji(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              dynCall_viji(index, a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iij(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              return dynCall_iij(index, a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiij(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              dynCall_viiij(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiji(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              return dynCall_iiji(index, a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijiii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              dynCall_vijiii(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijji(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              dynCall_vijji(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiij(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              return dynCall_jiij(index, a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiji(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              return dynCall_iiiji(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              dynCall_viiijii(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_iiiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_iiijii(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_ijjiii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_ijjiii(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_j(index) {
            var sp = stackSave();
            try {
              return dynCall_j(index);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiijjiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return dynCall_iiiijjiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiij(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiij(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiiiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vjiii(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              dynCall_vjiii(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiij(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              return dynCall_iiiij(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiii(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              return dynCall_jiii(index, a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijij(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              dynCall_viijij(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viijiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiji(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              dynCall_viiiiji(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_jiiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiijii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_jiiijii(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiijii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_jiijii(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiijiii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_jiijiii(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_jiiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiiiijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              return dynCall_jiiiiijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              dynCall_viiiiijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijij(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_iiijij(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiji(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              dynCall_viiji(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijji(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              dynCall_viijji(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiji(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              dynCall_viiiji(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijjj(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_iijjj(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijjj(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_viijjj(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiiiji(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_jiiiiji(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijijj(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_vijijj(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iji(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              return dynCall_iji(index, a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viijjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijj(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              dynCall_vijj(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijjij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              dynCall_viiijjij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijiii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              dynCall_viijiii(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijijjiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
            var sp = stackSave();
            try {
              dynCall_vijijjiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijiiiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              dynCall_viijiiiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijiiiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15) {
            var sp = stackSave();
            try {
              dynCall_viiijiiiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijijiiiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17) {
            var sp = stackSave();
            try {
              dynCall_viijijiiiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijjiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              dynCall_viiijjiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiijiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
            var sp = stackSave();
            try {
              return dynCall_jiiijiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              dynCall_viijijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiijijji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
            var sp = stackSave();
            try {
              dynCall_viiiijijji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiijjij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              dynCall_viiiijjij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viiijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiij(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              dynCall_viiiiij(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
            var sp = stackSave();
            try {
              dynCall_viiijiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jj(index, a1, a2) {
            var sp = stackSave();
            try {
              return dynCall_jj(index, a1, a2);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiijj(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_iiiijj(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijji(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_iiijji(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijijiiiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16) {
            var sp = stackSave();
            try {
              dynCall_vijijiiiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jd(index, a1) {
            var sp = stackSave();
            try {
              return dynCall_jd(index, a1);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jf(index, a1) {
            var sp = stackSave();
            try {
              return dynCall_jf(index, a1);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_iiiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiijii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_iiiijii(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiij(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiiij(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiiii(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              return dynCall_jiiiii(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijjii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viiijjii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiji(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_iiiiji(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiji(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiji(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijj(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              return dynCall_iijj(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jij(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              return dynCall_jij(index, a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijiii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_iiijiii(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijijij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              dynCall_viiijijij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijij(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_viiijij(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_iiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijiji(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_iijiji(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiijiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14) {
            var sp = stackSave();
            try {
              dynCall_viiiijiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_ij(index, a1, a2) {
            var sp = stackSave();
            try {
              return dynCall_ij(index, a1, a2);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vjiiii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              dynCall_vjiiii(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijiji(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              dynCall_vijiji(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijjij(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_vijjij(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijji(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_viiijji(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vjjii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              dynCall_vjjii(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiiji(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_jiiiji(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijjji(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_vijjji(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vjjijij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              dynCall_vjjijij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiji(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              return dynCall_jiiji(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viijiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_viiiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijjijjiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14) {
            var sp = stackSave();
            try {
              return dynCall_iiijjijjiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiijjii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_iiiijjii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiijji(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_iiiijji(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiijjiijjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17, a18) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiijjiijjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17, a18);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijjii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_iiijjii(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiij(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              return dynCall_jiiij(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijii(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              dynCall_vijii(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijjiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              dynCall_viiijjiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijjjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return dynCall_iiijjjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijjjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              dynCall_viiijjjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijjj(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              dynCall_vijjj(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijiiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viijiiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_vijiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jijiii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_jijiii(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jijjij(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_jijjij(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijiij(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_viijiij(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jijij(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_jijij(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jjiji(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_jjiji(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jjjd(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              return dynCall_jjjd(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_ijii(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              return dynCall_ijii(index, a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vjii(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              dynCall_vjii(index, a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              dynCall_viiiiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jjj(index, a1, a2, a3, a4) {
            var sp = stackSave();
            try {
              return dynCall_jjj(index, a1, a2, a3, a4);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_ijji(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              return dynCall_ijji(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jijji(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_jijji(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiiij(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_jiiiij(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_viiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_iiiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijiij(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_iiijiij(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viiiiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viiiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_viiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jijjjjii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              return dynCall_jijjjjii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiijij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_iiiiijij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_iiiiijiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiiiii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_jiiiiii(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiiijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return dynCall_jiiiijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiijjjii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return dynCall_jiijjjii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiiiiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_jiiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              dynCall_viiijijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijjii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_viijjii(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_jiiiiiii(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiijj(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_jiijj(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijii(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              return dynCall_iijii(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jiiijj(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_jiiijj(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiidj(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              return dynCall_iiidj(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiiijiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiiiiijiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijjiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              return dynCall_iiijjiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijjiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return dynCall_iiijjiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiidjj(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_iiiidjj(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijiiiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return dynCall_iiijiiiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijiiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_iiijiiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiiiiiiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiiiiiiiij(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiijji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viiiijji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vjiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_vjiiiji(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_fiijii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_fiijii(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_diijii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_diijii(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_vijiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijiiii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              dynCall_vijiiii(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijiiii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_iijiiii(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_viijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijjii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_iijjii(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijjiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_iijjiii(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijjiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_iiijjiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijji(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_iijji(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_vijiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viiiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_ijjji(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_ijjji(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              dynCall_viijiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jjjji(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_jjjji(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jjjii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_jjjii(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jji(index, a1, a2, a3) {
            var sp = stackSave();
            try {
              return dynCall_jji(index, a1, a2, a3);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiijiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              dynCall_viiiijiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              dynCall_viiiijiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijjijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return dynCall_iijjijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vj(index, a1, a2) {
            var sp = stackSave();
            try {
              dynCall_vj(index, a1, a2);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_iiijiiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijiij(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_iijiij(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viiiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijiii(index, a1, a2, a3, a4, a5, a6) {
            var sp = stackSave();
            try {
              return dynCall_iijiii(index, a1, a2, a3, a4, a5, a6);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jijj(index, a1, a2, a3, a4, a5) {
            var sp = stackSave();
            try {
              return dynCall_jijj(index, a1, a2, a3, a4, a5);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijijjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              dynCall_vijijjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viijijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiiiijjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
            var sp = stackSave();
            try {
              dynCall_viiiiijjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              dynCall_viijiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijiij(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              dynCall_vijiij(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijiiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
            var sp = stackSave();
            try {
              return dynCall_iiijiiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return dynCall_iiijiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
            var sp = stackSave();
            try {
              dynCall_viiijijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_iijiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return dynCall_iijiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              return dynCall_iiijiiijj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiijjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_iiijjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijjjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
            var sp = stackSave();
            try {
              dynCall_viiijjjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viijiji(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_viijiji(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijjiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              dynCall_vijjiii(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiiijji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiiijji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_viiijiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              dynCall_viiijiji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_jijiiii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              return dynCall_jijiiii(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
            var sp = stackSave();
            try {
              return dynCall_iiiiijjj(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijjjii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_iijjjii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiijjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
            var sp = stackSave();
            try {
              return dynCall_iiiiijjji(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iiiiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            var sp = stackSave();
            try {
              return dynCall_iiiiiijii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_iijjij(index, a1, a2, a3, a4, a5, a6, a7, a8) {
            var sp = stackSave();
            try {
              return dynCall_iijjij(index, a1, a2, a3, a4, a5, a6, a7, a8);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function invoke_vijjii(index, a1, a2, a3, a4, a5, a6, a7) {
            var sp = stackSave();
            try {
              dynCall_vijjii(index, a1, a2, a3, a4, a5, a6, a7);
            } catch (e) {
              stackRestore(sp);
              if (e !== e + 0)
                throw e;
              _setThrew(1, 0);
            }
          }
          function applySignatureConversions(wasmExports2) {
            wasmExports2 = Object.assign({}, wasmExports2);
            var makeWrapper_p = (f) => () => f() >>> 0;
            var makeWrapper_pp = (f) => (a0) => f(a0) >>> 0;
            wasmExports2["__errno_location"] = makeWrapper_p(wasmExports2["__errno_location"]);
            wasmExports2["og"] = makeWrapper_pp(wasmExports2["og"]);
            wasmExports2["sg"] = makeWrapper_p(wasmExports2["sg"]);
            wasmExports2["ug"] = makeWrapper_pp(wasmExports2["ug"]);
            return wasmExports2;
          }
          Module["stackAlloc"] = stackAlloc;
          Module["stackSave"] = stackSave;
          Module["stackRestore"] = stackRestore;
          Module["ccall"] = ccall;
          var calledRun;
          dependenciesFulfilled = function runCaller() {
            if (!calledRun)
              run();
            if (!calledRun)
              dependenciesFulfilled = runCaller;
          };
          function callMain() {
            var entryFunction = _main;
            var argc = 0;
            var argv = 0;
            try {
              var ret = entryFunction(argc, argv);
              exitJS(ret, true);
              return ret;
            } catch (e) {
              return handleException(e);
            }
          }
          function run() {
            if (runDependencies > 0) {
              return;
            }
            preRun();
            if (runDependencies > 0) {
              return;
            }
            function doRun() {
              if (calledRun)
                return;
              calledRun = true;
              Module["calledRun"] = true;
              if (ABORT)
                return;
              initRuntime();
              preMain();
              readyPromiseResolve(Module);
              if (Module["onRuntimeInitialized"])
                Module["onRuntimeInitialized"]();
              if (shouldRunNow)
                callMain();
              postRun();
            }
            if (Module["setStatus"]) {
              Module["setStatus"]("Running...");
              setTimeout(function() {
                setTimeout(function() {
                  Module["setStatus"]("");
                }, 1);
                doRun();
              }, 1);
            } else {
              doRun();
            }
          }
          if (Module["preInit"]) {
            if (typeof Module["preInit"] == "function")
              Module["preInit"] = [Module["preInit"]];
            while (Module["preInit"].length > 0) {
              Module["preInit"].pop()();
            }
          }
          var shouldRunNow = true;
          if (Module["noInitialRun"])
            shouldRunNow = false;
          run();
          return moduleArg.ready;
        };
      })();
      if (typeof exports2 === "object" && typeof module2 === "object")
        module2.exports = DuckDB3;
      else if (typeof define === "function" && define["amd"])
        define([], () => DuckDB3);
    }
  });

  // src/bindings/duckdb-eh.js
  var require_duckdb_eh = __commonJS({
    "src/bindings/duckdb-eh.js"(exports2, module2) {
      "use strict";
      var DuckDB3 = (() => {
        var _scriptDir = typeof document !== "undefined" && document.currentScript ? document.currentScript.src : void 0;
        if (typeof __filename !== "undefined")
          _scriptDir = _scriptDir || __filename;
        return function(moduleArg = {}) {
          var Module = moduleArg;
          var readyPromiseResolve, readyPromiseReject;
          Module["ready"] = new Promise((resolve, reject) => {
            readyPromiseResolve = resolve;
            readyPromiseReject = reject;
          });
          var moduleOverrides = Object.assign({}, Module);
          var arguments_ = [];
          var thisProgram = "./this.program";
          var quit_ = (status, toThrow) => {
            throw toThrow;
          };
          var ENVIRONMENT_IS_WEB = typeof window == "object";
          var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
          var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
          var scriptDirectory = "";
          function locateFile(path) {
            if (Module["locateFile"]) {
              return Module["locateFile"](path, scriptDirectory);
            }
            return scriptDirectory + path;
          }
          var read_, readAsync, readBinary;
          if (ENVIRONMENT_IS_NODE) {
            var fs = require_fs();
            var nodePath = require_path();
            if (ENVIRONMENT_IS_WORKER) {
              scriptDirectory = nodePath.dirname(scriptDirectory) + "/";
            } else {
              scriptDirectory = __dirname + "/";
            }
            read_ = (filename, binary) => {
              filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
              return fs.readFileSync(filename, binary ? void 0 : "utf8");
            };
            readBinary = (filename) => {
              var ret = read_(filename, true);
              if (!ret.buffer) {
                ret = new Uint8Array(ret);
              }
              return ret;
            };
            readAsync = (filename, onload, onerror, binary = true) => {
              filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
              fs.readFile(filename, binary ? void 0 : "utf8", (err2, data) => {
                if (err2)
                  onerror(err2);
                else
                  onload(binary ? data.buffer : data);
              });
            };
            if (!Module["thisProgram"] && process.argv.length > 1) {
              thisProgram = process.argv[1].replace(/\\/g, "/");
            }
            arguments_ = process.argv.slice(2);
            quit_ = (status, toThrow) => {
              process.exitCode = status;
              throw toThrow;
            };
            Module["inspect"] = () => "[Emscripten Module object]";
          } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
            if (ENVIRONMENT_IS_WORKER) {
              scriptDirectory = self.location.href;
            } else if (typeof document != "undefined" && document.currentScript) {
              scriptDirectory = document.currentScript.src;
            }
            if (_scriptDir) {
              scriptDirectory = _scriptDir;
            }
            if (scriptDirectory.indexOf("blob:") !== 0) {
              scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
            } else {
              scriptDirectory = "";
            }
            {
              read_ = (url) => {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, false);
                xhr.send(null);
                return xhr.responseText;
              };
              if (ENVIRONMENT_IS_WORKER) {
                readBinary = (url) => {
                  var xhr = new XMLHttpRequest();
                  xhr.open("GET", url, false);
                  xhr.responseType = "arraybuffer";
                  xhr.send(null);
                  return new Uint8Array(xhr.response);
                };
              }
              readAsync = (url, onload, onerror) => {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.responseType = "arraybuffer";
                xhr.onload = () => {
                  if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                    onload(xhr.response);
                    return;
                  }
                  onerror();
                };
                xhr.onerror = onerror;
                xhr.send(null);
              };
            }
          } else {
          }
          var out = Module["print"] || console.log.bind(console);
          var err = Module["printErr"] || console.error.bind(console);
          Object.assign(Module, moduleOverrides);
          moduleOverrides = null;
          if (Module["arguments"])
            arguments_ = Module["arguments"];
          if (Module["thisProgram"])
            thisProgram = Module["thisProgram"];
          if (Module["quit"])
            quit_ = Module["quit"];
          var wasmBinary;
          if (Module["wasmBinary"])
            wasmBinary = Module["wasmBinary"];
          if (typeof WebAssembly != "object") {
            abort("no native wasm support detected");
          }
          var wasmMemory;
          var ABORT = false;
          var EXITSTATUS;
          function assert(condition, text) {
            if (!condition) {
              abort(text);
            }
          }
          var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
          function updateMemoryViews() {
            var b = wasmMemory.buffer;
            Module["HEAP8"] = HEAP8 = new Int8Array(b);
            Module["HEAP16"] = HEAP16 = new Int16Array(b);
            Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
            Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
            Module["HEAP32"] = HEAP32 = new Int32Array(b);
            Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
            Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
            Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
          }
          var __ATPRERUN__ = [];
          var __ATINIT__ = [];
          var __ATMAIN__ = [];
          var __ATPOSTRUN__ = [];
          var runtimeInitialized = false;
          function preRun() {
            if (Module["preRun"]) {
              if (typeof Module["preRun"] == "function")
                Module["preRun"] = [Module["preRun"]];
              while (Module["preRun"].length) {
                addOnPreRun(Module["preRun"].shift());
              }
            }
            callRuntimeCallbacks(__ATPRERUN__);
          }
          function initRuntime() {
            runtimeInitialized = true;
            callRuntimeCallbacks(__ATINIT__);
          }
          function preMain() {
            callRuntimeCallbacks(__ATMAIN__);
          }
          function postRun() {
            if (Module["postRun"]) {
              if (typeof Module["postRun"] == "function")
                Module["postRun"] = [Module["postRun"]];
              while (Module["postRun"].length) {
                addOnPostRun(Module["postRun"].shift());
              }
            }
            callRuntimeCallbacks(__ATPOSTRUN__);
          }
          function addOnPreRun(cb) {
            __ATPRERUN__.unshift(cb);
          }
          function addOnInit(cb) {
            __ATINIT__.unshift(cb);
          }
          function addOnPostRun(cb) {
            __ATPOSTRUN__.unshift(cb);
          }
          var runDependencies = 0;
          var runDependencyWatcher = null;
          var dependenciesFulfilled = null;
          function addRunDependency(id) {
            runDependencies++;
            Module["monitorRunDependencies"]?.(runDependencies);
          }
          function removeRunDependency(id) {
            runDependencies--;
            Module["monitorRunDependencies"]?.(runDependencies);
            if (runDependencies == 0) {
              if (runDependencyWatcher !== null) {
                clearInterval(runDependencyWatcher);
                runDependencyWatcher = null;
              }
              if (dependenciesFulfilled) {
                var callback = dependenciesFulfilled;
                dependenciesFulfilled = null;
                callback();
              }
            }
          }
          function abort(what) {
            Module["onAbort"]?.(what);
            what = "Aborted(" + what + ")";
            err(what);
            ABORT = true;
            EXITSTATUS = 1;
            what += ". Build with -sASSERTIONS for more info.";
            if (runtimeInitialized) {
              ___trap();
            }
            var e = new WebAssembly.RuntimeError(what);
            readyPromiseReject(e);
            throw e;
          }
          var dataURIPrefix = "data:application/octet-stream;base64,";
          var isDataURI = (filename) => filename.startsWith(dataURIPrefix);
          var isFileURI = (filename) => filename.startsWith("file://");
          var wasmBinaryFile;
          wasmBinaryFile = "./duckdb-eh.wasm";
          if (!isDataURI(wasmBinaryFile)) {
            wasmBinaryFile = locateFile(wasmBinaryFile);
          }
          function getBinarySync(file) {
            if (file == wasmBinaryFile && wasmBinary) {
              return new Uint8Array(wasmBinary);
            }
            if (readBinary) {
              return readBinary(file);
            }
            throw "both async and sync fetching of the wasm failed";
          }
          function getBinaryPromise(binaryFile) {
            if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
              if (typeof fetch == "function") {
                return fetch(binaryFile, { credentials: "same-origin" }).then((response) => {
                  if (!response["ok"]) {
                    throw "failed to load wasm binary file at '" + binaryFile + "'";
                  }
                  return response["arrayBuffer"]();
                }).catch(() => getBinarySync(binaryFile));
              }
            }
            return Promise.resolve().then(() => getBinarySync(binaryFile));
          }
          function instantiateArrayBuffer(binaryFile, imports, receiver) {
            return getBinaryPromise(binaryFile).then((binary) => WebAssembly.instantiate(binary, imports)).then((instance9) => instance9).then(receiver, (reason) => {
              err(`failed to asynchronously prepare wasm: ${reason}`);
              abort(reason);
            });
          }
          function instantiateAsync(binary, binaryFile, imports, callback) {
            if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
              return fetch(binaryFile, { credentials: "same-origin" }).then((response) => {
                var result = WebAssembly.instantiateStreaming(response, imports);
                return result.then(callback, function(reason) {
                  err(`wasm streaming compile failed: ${reason}`);
                  err("falling back to ArrayBuffer instantiation");
                  return instantiateArrayBuffer(binaryFile, imports, callback);
                });
              });
            }
            return instantiateArrayBuffer(binaryFile, imports, callback);
          }
          function createWasm() {
            var info = { "a": wasmImports };
            function receiveInstance(instance9, module3) {
              wasmExports = instance9.exports;
              wasmExports = applySignatureConversions(wasmExports);
              wasmMemory = wasmExports["fa"];
              updateMemoryViews();
              addOnInit(wasmExports["ga"]);
              removeRunDependency("wasm-instantiate");
              return wasmExports;
            }
            addRunDependency("wasm-instantiate");
            function receiveInstantiationResult(result) {
              receiveInstance(result["instance"]);
            }
            if (Module["instantiateWasm"]) {
              try {
                return Module["instantiateWasm"](info, receiveInstance);
              } catch (e) {
                err(`Module.instantiateWasm callback failed with error: ${e}`);
                readyPromiseReject(e);
              }
            }
            instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
            return {};
          }
          var tempDouble;
          var tempI64;
          function ExitStatus(status) {
            this.name = "ExitStatus";
            this.message = `Program terminated with exit(${status})`;
            this.status = status;
          }
          var callRuntimeCallbacks = (callbacks) => {
            while (callbacks.length > 0) {
              callbacks.shift()(Module);
            }
          };
          var noExitRuntime = Module["noExitRuntime"] || true;
          var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : void 0;
          var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
            idx >>>= 0;
            var endIdx = idx + maxBytesToRead;
            var endPtr = idx;
            while (heapOrArray[endPtr] && !(endPtr >= endIdx))
              ++endPtr;
            if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
              return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
            }
            var str = "";
            while (idx < endPtr) {
              var u0 = heapOrArray[idx++];
              if (!(u0 & 128)) {
                str += String.fromCharCode(u0);
                continue;
              }
              var u1 = heapOrArray[idx++] & 63;
              if ((u0 & 224) == 192) {
                str += String.fromCharCode((u0 & 31) << 6 | u1);
                continue;
              }
              var u2 = heapOrArray[idx++] & 63;
              if ((u0 & 240) == 224) {
                u0 = (u0 & 15) << 12 | u1 << 6 | u2;
              } else {
                u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
              }
              if (u0 < 65536) {
                str += String.fromCharCode(u0);
              } else {
                var ch = u0 - 65536;
                str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
              }
            }
            return str;
          };
          var UTF8ToString = (ptr, maxBytesToRead) => {
            ptr >>>= 0;
            return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
          };
          var SYSCALLS = { varargs: void 0, get() {
            var ret = HEAP32[+SYSCALLS.varargs >>> 2 >>> 0];
            SYSCALLS.varargs += 4;
            return ret;
          }, getp() {
            return SYSCALLS.get();
          }, getStr(ptr) {
            var ret = UTF8ToString(ptr);
            return ret;
          } };
          var convertI32PairToI53Checked = (lo, hi) => hi + 2097152 >>> 0 < 4194305 - !!lo ? (lo >>> 0) + hi * 4294967296 : NaN;
          function ___syscall__newselect(nfds, readfds, writefds, exceptfds, timeout) {
            readfds >>>= 0;
            writefds >>>= 0;
            exceptfds >>>= 0;
            timeout >>>= 0;
            var total = 0;
            var srcReadLow = readfds ? HEAP32[readfds >>> 2 >>> 0] : 0, srcReadHigh = readfds ? HEAP32[readfds + 4 >>> 2 >>> 0] : 0;
            var srcWriteLow = writefds ? HEAP32[writefds >>> 2 >>> 0] : 0, srcWriteHigh = writefds ? HEAP32[writefds + 4 >>> 2 >>> 0] : 0;
            var srcExceptLow = exceptfds ? HEAP32[exceptfds >>> 2 >>> 0] : 0, srcExceptHigh = exceptfds ? HEAP32[exceptfds + 4 >>> 2 >>> 0] : 0;
            var dstReadLow = 0, dstReadHigh = 0;
            var dstWriteLow = 0, dstWriteHigh = 0;
            var dstExceptLow = 0, dstExceptHigh = 0;
            var allLow = (readfds ? HEAP32[readfds >>> 2 >>> 0] : 0) | (writefds ? HEAP32[writefds >>> 2 >>> 0] : 0) | (exceptfds ? HEAP32[exceptfds >>> 2 >>> 0] : 0);
            var allHigh = (readfds ? HEAP32[readfds + 4 >>> 2 >>> 0] : 0) | (writefds ? HEAP32[writefds + 4 >>> 2 >>> 0] : 0) | (exceptfds ? HEAP32[exceptfds + 4 >>> 2 >>> 0] : 0);
            var check = function(fd2, low, high, val) {
              return fd2 < 32 ? low & val : high & val;
            };
            for (var fd = 0; fd < nfds; fd++) {
              var mask = 1 << fd % 32;
              if (!check(fd, allLow, allHigh, mask)) {
                continue;
              }
              var stream = SYSCALLS.getStreamFromFD(fd);
              var flags = SYSCALLS.DEFAULT_POLLMASK;
              if (stream.stream_ops.poll) {
                var timeoutInMillis = -1;
                if (timeout) {
                  var tv_sec = readfds ? HEAP32[timeout >>> 2 >>> 0] : 0, tv_usec = readfds ? HEAP32[timeout + 4 >>> 2 >>> 0] : 0;
                  timeoutInMillis = (tv_sec + tv_usec / 1e6) * 1e3;
                }
                flags = stream.stream_ops.poll(stream, timeoutInMillis);
              }
              if (flags & 1 && check(fd, srcReadLow, srcReadHigh, mask)) {
                fd < 32 ? dstReadLow = dstReadLow | mask : dstReadHigh = dstReadHigh | mask;
                total++;
              }
              if (flags & 4 && check(fd, srcWriteLow, srcWriteHigh, mask)) {
                fd < 32 ? dstWriteLow = dstWriteLow | mask : dstWriteHigh = dstWriteHigh | mask;
                total++;
              }
              if (flags & 2 && check(fd, srcExceptLow, srcExceptHigh, mask)) {
                fd < 32 ? dstExceptLow = dstExceptLow | mask : dstExceptHigh = dstExceptHigh | mask;
                total++;
              }
            }
            if (readfds) {
              HEAP32[readfds >>> 2 >>> 0] = dstReadLow;
              HEAP32[readfds + 4 >>> 2 >>> 0] = dstReadHigh;
            }
            if (writefds) {
              HEAP32[writefds >>> 2 >>> 0] = dstWriteLow;
              HEAP32[writefds + 4 >>> 2 >>> 0] = dstWriteHigh;
            }
            if (exceptfds) {
              HEAP32[exceptfds >>> 2 >>> 0] = dstExceptLow;
              HEAP32[exceptfds + 4 >>> 2 >>> 0] = dstExceptHigh;
            }
            return total;
          }
          function SOCKFS() {
            abort("missing function: $SOCKFS");
          }
          SOCKFS.stub = true;
          function FS() {
            abort("missing function: $FS");
          }
          FS.stub = true;
          var getSocketFromFD = (fd) => {
            var socket = SOCKFS.getSocket(fd);
            if (!socket)
              throw new FS.ErrnoError(8);
            return socket;
          };
          var inetNtop4 = (addr) => (addr & 255) + "." + (addr >> 8 & 255) + "." + (addr >> 16 & 255) + "." + (addr >> 24 & 255);
          var inetNtop6 = (ints) => {
            var str = "";
            var word = 0;
            var longest = 0;
            var lastzero = 0;
            var zstart = 0;
            var len = 0;
            var i = 0;
            var parts = [ints[0] & 65535, ints[0] >> 16, ints[1] & 65535, ints[1] >> 16, ints[2] & 65535, ints[2] >> 16, ints[3] & 65535, ints[3] >> 16];
            var hasipv4 = true;
            var v4part = "";
            for (i = 0; i < 5; i++) {
              if (parts[i] !== 0) {
                hasipv4 = false;
                break;
              }
            }
            if (hasipv4) {
              v4part = inetNtop4(parts[6] | parts[7] << 16);
              if (parts[5] === -1) {
                str = "::ffff:";
                str += v4part;
                return str;
              }
              if (parts[5] === 0) {
                str = "::";
                if (v4part === "0.0.0.0")
                  v4part = "";
                if (v4part === "0.0.0.1")
                  v4part = "1";
                str += v4part;
                return str;
              }
            }
            for (word = 0; word < 8; word++) {
              if (parts[word] === 0) {
                if (word - lastzero > 1) {
                  len = 0;
                }
                lastzero = word;
                len++;
              }
              if (len > longest) {
                longest = len;
                zstart = word - longest + 1;
              }
            }
            for (word = 0; word < 8; word++) {
              if (longest > 1) {
                if (parts[word] === 0 && word >= zstart && word < zstart + longest) {
                  if (word === zstart) {
                    str += ":";
                    if (zstart === 0)
                      str += ":";
                  }
                  continue;
                }
              }
              str += Number(_ntohs(parts[word] & 65535)).toString(16);
              str += word < 7 ? ":" : "";
            }
            return str;
          };
          var readSockaddr = (sa, salen) => {
            var family = HEAP16[sa >>> 1 >>> 0];
            var port = _ntohs(HEAPU16[sa + 2 >>> 1 >>> 0]);
            var addr;
            switch (family) {
              case 2:
                if (salen !== 16) {
                  return { errno: 28 };
                }
                addr = HEAP32[sa + 4 >>> 2 >>> 0];
                addr = inetNtop4(addr);
                break;
              case 10:
                if (salen !== 28) {
                  return { errno: 28 };
                }
                addr = [HEAP32[sa + 8 >>> 2 >>> 0], HEAP32[sa + 12 >>> 2 >>> 0], HEAP32[sa + 16 >>> 2 >>> 0], HEAP32[sa + 20 >>> 2 >>> 0]];
                addr = inetNtop6(addr);
                break;
              default:
                return { errno: 5 };
            }
            return { family, addr, port };
          };
          var inetPton4 = (str) => {
            var b = str.split(".");
            for (var i = 0; i < 4; i++) {
              var tmp2 = Number(b[i]);
              if (isNaN(tmp2))
                return null;
              b[i] = tmp2;
            }
            return (b[0] | b[1] << 8 | b[2] << 16 | b[3] << 24) >>> 0;
          };
          var jstoi_q = (str) => parseInt(str);
          var inetPton6 = (str) => {
            var words;
            var w, offset, z;
            var valid6regx = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i;
            var parts = [];
            if (!valid6regx.test(str)) {
              return null;
            }
            if (str === "::") {
              return [0, 0, 0, 0, 0, 0, 0, 0];
            }
            if (str.startsWith("::")) {
              str = str.replace("::", "Z:");
            } else {
              str = str.replace("::", ":Z:");
            }
            if (str.indexOf(".") > 0) {
              str = str.replace(new RegExp("[.]", "g"), ":");
              words = str.split(":");
              words[words.length - 4] = jstoi_q(words[words.length - 4]) + jstoi_q(words[words.length - 3]) * 256;
              words[words.length - 3] = jstoi_q(words[words.length - 2]) + jstoi_q(words[words.length - 1]) * 256;
              words = words.slice(0, words.length - 2);
            } else {
              words = str.split(":");
            }
            offset = 0;
            z = 0;
            for (w = 0; w < words.length; w++) {
              if (typeof words[w] == "string") {
                if (words[w] === "Z") {
                  for (z = 0; z < 8 - words.length + 1; z++) {
                    parts[w + z] = 0;
                  }
                  offset = z - 1;
                } else {
                  parts[w + offset] = _htons(parseInt(words[w], 16));
                }
              } else {
                parts[w + offset] = words[w];
              }
            }
            return [parts[1] << 16 | parts[0], parts[3] << 16 | parts[2], parts[5] << 16 | parts[4], parts[7] << 16 | parts[6]];
          };
          var DNS = { address_map: { id: 1, addrs: {}, names: {} }, lookup_name(name) {
            var res = inetPton4(name);
            if (res !== null) {
              return name;
            }
            res = inetPton6(name);
            if (res !== null) {
              return name;
            }
            var addr;
            if (DNS.address_map.addrs[name]) {
              addr = DNS.address_map.addrs[name];
            } else {
              var id = DNS.address_map.id++;
              assert(id < 65535, "exceeded max address mappings of 65535");
              addr = "172.29." + (id & 255) + "." + (id & 65280);
              DNS.address_map.names[addr] = name;
              DNS.address_map.addrs[name] = addr;
            }
            return addr;
          }, lookup_addr(addr) {
            if (DNS.address_map.names[addr]) {
              return DNS.address_map.names[addr];
            }
            return null;
          } };
          var getSocketAddress = (addrp, addrlen, allowNull) => {
            if (allowNull && addrp === 0)
              return null;
            var info = readSockaddr(addrp, addrlen);
            if (info.errno)
              throw new FS.ErrnoError(info.errno);
            info.addr = DNS.lookup_addr(info.addr) || info.addr;
            return info;
          };
          function ___syscall_bind(fd, addr, addrlen, d1, d2, d3) {
            addr >>>= 0;
            addrlen >>>= 0;
            var sock = getSocketFromFD(fd);
            var info = getSocketAddress(addr, addrlen);
            sock.sock_ops.bind(sock, info.addr, info.port);
            return 0;
          }
          function ___syscall_connect(fd, addr, addrlen, d1, d2, d3) {
            addr >>>= 0;
            addrlen >>>= 0;
            var sock = getSocketFromFD(fd);
            var info = getSocketAddress(addr, addrlen);
            sock.sock_ops.connect(sock, info.addr, info.port);
            return 0;
          }
          function ___syscall_faccessat(dirfd, path, amode, flags) {
            path >>>= 0;
          }
          function ___syscall_fcntl64(fd, cmd, varargs) {
            varargs >>>= 0;
            SYSCALLS.varargs = varargs;
            return 0;
          }
          function ___syscall_fstat64(fd, buf) {
            buf >>>= 0;
          }
          function ___syscall_ftruncate64(fd, length_low, length_high) {
            var length = convertI32PairToI53Checked(length_low, length_high);
          }
          var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
            outIdx >>>= 0;
            if (!(maxBytesToWrite > 0))
              return 0;
            var startIdx = outIdx;
            var endIdx = outIdx + maxBytesToWrite - 1;
            for (var i = 0; i < str.length; ++i) {
              var u = str.charCodeAt(i);
              if (u >= 55296 && u <= 57343) {
                var u1 = str.charCodeAt(++i);
                u = 65536 + ((u & 1023) << 10) | u1 & 1023;
              }
              if (u <= 127) {
                if (outIdx >= endIdx)
                  break;
                heap[outIdx++ >>> 0] = u;
              } else if (u <= 2047) {
                if (outIdx + 1 >= endIdx)
                  break;
                heap[outIdx++ >>> 0] = 192 | u >> 6;
                heap[outIdx++ >>> 0] = 128 | u & 63;
              } else if (u <= 65535) {
                if (outIdx + 2 >= endIdx)
                  break;
                heap[outIdx++ >>> 0] = 224 | u >> 12;
                heap[outIdx++ >>> 0] = 128 | u >> 6 & 63;
                heap[outIdx++ >>> 0] = 128 | u & 63;
              } else {
                if (outIdx + 3 >= endIdx)
                  break;
                heap[outIdx++ >>> 0] = 240 | u >> 18;
                heap[outIdx++ >>> 0] = 128 | u >> 12 & 63;
                heap[outIdx++ >>> 0] = 128 | u >> 6 & 63;
                heap[outIdx++ >>> 0] = 128 | u & 63;
              }
            }
            heap[outIdx >>> 0] = 0;
            return outIdx - startIdx;
          };
          var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
          function ___syscall_getdents64(fd, dirp, count) {
            dirp >>>= 0;
            count >>>= 0;
          }
          var zeroMemory = (address, size) => {
            HEAPU8.fill(0, address, address + size);
            return address;
          };
          var writeSockaddr = (sa, family, addr, port, addrlen) => {
            switch (family) {
              case 2:
                addr = inetPton4(addr);
                zeroMemory(sa, 16);
                if (addrlen) {
                  HEAP32[addrlen >>> 2 >>> 0] = 16;
                }
                HEAP16[sa >>> 1 >>> 0] = family;
                HEAP32[sa + 4 >>> 2 >>> 0] = addr;
                HEAP16[sa + 2 >>> 1 >>> 0] = _htons(port);
                break;
              case 10:
                addr = inetPton6(addr);
                zeroMemory(sa, 28);
                if (addrlen) {
                  HEAP32[addrlen >>> 2 >>> 0] = 28;
                }
                HEAP32[sa >>> 2 >>> 0] = family;
                HEAP32[sa + 8 >>> 2 >>> 0] = addr[0];
                HEAP32[sa + 12 >>> 2 >>> 0] = addr[1];
                HEAP32[sa + 16 >>> 2 >>> 0] = addr[2];
                HEAP32[sa + 20 >>> 2 >>> 0] = addr[3];
                HEAP16[sa + 2 >>> 1 >>> 0] = _htons(port);
                break;
              default:
                return 5;
            }
            return 0;
          };
          function ___syscall_getpeername(fd, addr, addrlen, d1, d2, d3) {
            addr >>>= 0;
            addrlen >>>= 0;
            var sock = getSocketFromFD(fd);
            if (!sock.daddr) {
              return -53;
            }
            var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(sock.daddr), sock.dport, addrlen);
            return 0;
          }
          function ___syscall_getsockopt(fd, level, optname, optval, optlen, d1) {
            optval >>>= 0;
            optlen >>>= 0;
            var sock = getSocketFromFD(fd);
            if (level === 1) {
              if (optname === 4) {
                HEAP32[optval >>> 2 >>> 0] = sock.error;
                HEAP32[optlen >>> 2 >>> 0] = 4;
                sock.error = null;
                return 0;
              }
            }
            return -50;
          }
          function ___syscall_ioctl(fd, op, varargs) {
            varargs >>>= 0;
            SYSCALLS.varargs = varargs;
            return 0;
          }
          function ___syscall_lstat64(path, buf) {
            path >>>= 0;
            buf >>>= 0;
          }
          function ___syscall_mkdirat(dirfd, path, mode) {
            path >>>= 0;
          }
          function ___syscall_newfstatat(dirfd, path, buf, flags) {
            path >>>= 0;
            buf >>>= 0;
          }
          function ___syscall_openat(dirfd, path, flags, varargs) {
            path >>>= 0;
            varargs >>>= 0;
            SYSCALLS.varargs = varargs;
          }
          function ___syscall_recvfrom(fd, buf, len, flags, addr, addrlen) {
            buf >>>= 0;
            len >>>= 0;
            addr >>>= 0;
            addrlen >>>= 0;
            var sock = getSocketFromFD(fd);
            var msg = sock.sock_ops.recvmsg(sock, len);
            if (!msg)
              return 0;
            if (addr) {
              var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(msg.addr), msg.port, addrlen);
            }
            HEAPU8.set(msg.buffer, buf >>> 0);
            return msg.buffer.byteLength;
          }
          function ___syscall_renameat(olddirfd, oldpath, newdirfd, newpath) {
            oldpath >>>= 0;
            newpath >>>= 0;
          }
          function ___syscall_rmdir(path) {
            path >>>= 0;
          }
          function ___syscall_sendto(fd, message, length, flags, addr, addr_len) {
            message >>>= 0;
            length >>>= 0;
            addr >>>= 0;
            addr_len >>>= 0;
          }
          var ___syscall_socket = (domain, type, protocol) => {
          };
          function ___syscall_stat64(path, buf) {
            path >>>= 0;
            buf >>>= 0;
          }
          function ___syscall_unlinkat(dirfd, path, flags) {
            path >>>= 0;
          }
          var nowIsMonotonic = 1;
          var __emscripten_get_now_is_monotonic = () => nowIsMonotonic;
          var _abort = () => {
            abort("");
          };
          function _duckdb_web_fs_directory_create(path, pathLen) {
            return globalThis.DUCKDB_RUNTIME.createDirectory(Module, path, pathLen);
          }
          function _duckdb_web_fs_directory_exists(path, pathLen) {
            return globalThis.DUCKDB_RUNTIME.checkDirectory(Module, path, pathLen);
          }
          function _duckdb_web_fs_directory_list_files(path, pathLen) {
            return globalThis.DUCKDB_RUNTIME.listDirectoryEntries(Module, path, pathLen);
          }
          function _duckdb_web_fs_directory_remove(path, pathLen) {
            return globalThis.DUCKDB_RUNTIME.removeDirectory(Module, path, pathLen);
          }
          function _duckdb_web_fs_file_close(fileId) {
            return globalThis.DUCKDB_RUNTIME.closeFile(Module, fileId);
          }
          function _duckdb_web_fs_file_exists(path, pathLen) {
            return globalThis.DUCKDB_RUNTIME.checkFile(Module, path, pathLen);
          }
          function _duckdb_web_fs_file_get_last_modified_time(fileId) {
            return globalThis.DUCKDB_RUNTIME.getLastFileModificationTime(Module, fileId);
          }
          function _duckdb_web_fs_file_move(from, fromLen, to, toLen) {
            return globalThis.DUCKDB_RUNTIME.moveFile(Module, from, fromLen, to, toLen);
          }
          function _duckdb_web_fs_file_open(fileId, flags) {
            return globalThis.DUCKDB_RUNTIME.openFile(Module, fileId, flags);
          }
          function _duckdb_web_fs_file_read(fileId, buf, size, location) {
            return globalThis.DUCKDB_RUNTIME.readFile(Module, fileId, buf, size, location);
          }
          function _duckdb_web_fs_file_truncate(fileId, newSize) {
            return globalThis.DUCKDB_RUNTIME.truncateFile(Module, fileId, newSize);
          }
          function _duckdb_web_fs_file_write(fileId, buf, size, location) {
            return globalThis.DUCKDB_RUNTIME.writeFile(Module, fileId, buf, size, location);
          }
          function _duckdb_web_fs_get_default_data_protocol(Module2) {
            return globalThis.DUCKDB_RUNTIME.getDefaultDataProtocol(Module2);
          }
          function _duckdb_web_fs_glob(path, pathLen) {
            return globalThis.DUCKDB_RUNTIME.glob(Module, path, pathLen);
          }
          function _duckdb_web_test_platform_feature(feature) {
            return globalThis.DUCKDB_RUNTIME.testPlatformFeature(Module, feature);
          }
          function _duckdb_web_udf_scalar_call(funcId, descPtr, descSize, ptrsPtr, ptrsSize, response) {
            return globalThis.DUCKDB_RUNTIME.callScalarUDF(Module, funcId, descPtr, descSize, ptrsPtr, ptrsSize, response);
          }
          var _emscripten_date_now = () => Date.now();
          var getHeapMax = () => 4294901760;
          function _emscripten_get_heap_max() {
            return getHeapMax();
          }
          var _emscripten_get_now;
          _emscripten_get_now = () => performance.now();
          function _emscripten_memcpy_js(dest, src, num) {
            dest >>>= 0;
            src >>>= 0;
            num >>>= 0;
            return HEAPU8.copyWithin(dest >>> 0, src >>> 0, src + num >>> 0);
          }
          var growMemory = (size) => {
            var b = wasmMemory.buffer;
            var pages = (size - b.byteLength + 65535) / 65536;
            try {
              wasmMemory.grow(pages);
              updateMemoryViews();
              return 1;
            } catch (e) {
            }
          };
          function _emscripten_resize_heap(requestedSize) {
            requestedSize >>>= 0;
            var oldSize = HEAPU8.length;
            var maxHeapSize = getHeapMax();
            if (requestedSize > maxHeapSize) {
              return false;
            }
            var alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
            for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
              var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
              overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
              var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
              var replacement = growMemory(newSize);
              if (replacement) {
                return true;
              }
            }
            return false;
          }
          var ENV = {};
          var getExecutableName = () => thisProgram || "./this.program";
          var getEnvStrings = () => {
            if (!getEnvStrings.strings) {
              var lang = (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
              var env = { "USER": "web_user", "LOGNAME": "web_user", "PATH": "/", "PWD": "/", "HOME": "/home/web_user", "LANG": lang, "_": getExecutableName() };
              for (var x in ENV) {
                if (ENV[x] === void 0)
                  delete env[x];
                else
                  env[x] = ENV[x];
              }
              var strings = [];
              for (var x in env) {
                strings.push(`${x}=${env[x]}`);
              }
              getEnvStrings.strings = strings;
            }
            return getEnvStrings.strings;
          };
          var stringToAscii = (str, buffer) => {
            for (var i = 0; i < str.length; ++i) {
              HEAP8[buffer++ >>> 0 >>> 0] = str.charCodeAt(i);
            }
            HEAP8[buffer >>> 0 >>> 0] = 0;
          };
          var _environ_get = function(__environ, environ_buf) {
            __environ >>>= 0;
            environ_buf >>>= 0;
            var bufSize = 0;
            getEnvStrings().forEach((string, i) => {
              var ptr = environ_buf + bufSize;
              HEAPU32[__environ + i * 4 >>> 2 >>> 0] = ptr;
              stringToAscii(string, ptr);
              bufSize += string.length + 1;
            });
            return 0;
          };
          var _environ_sizes_get = function(penviron_count, penviron_buf_size) {
            penviron_count >>>= 0;
            penviron_buf_size >>>= 0;
            var strings = getEnvStrings();
            HEAPU32[penviron_count >>> 2 >>> 0] = strings.length;
            var bufSize = 0;
            strings.forEach((string) => bufSize += string.length + 1);
            HEAPU32[penviron_buf_size >>> 2 >>> 0] = bufSize;
            return 0;
          };
          var _fd_close = (fd) => 52;
          function _fd_fdstat_get(fd, pbuf) {
            pbuf >>>= 0;
            var rightsBase = 0;
            var rightsInheriting = 0;
            var flags = 0;
            {
              var type = 2;
              if (fd == 0) {
                rightsBase = 2;
              } else if (fd == 1 || fd == 2) {
                rightsBase = 64;
              }
              flags = 1;
            }
            HEAP8[pbuf >>> 0 >>> 0] = type;
            HEAP16[pbuf + 2 >>> 1 >>> 0] = flags;
            tempI64 = [rightsBase >>> 0, (tempDouble = rightsBase, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[pbuf + 8 >>> 2 >>> 0] = tempI64[0], HEAP32[pbuf + 12 >>> 2 >>> 0] = tempI64[1];
            tempI64 = [rightsInheriting >>> 0, (tempDouble = rightsInheriting, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[pbuf + 16 >>> 2 >>> 0] = tempI64[0], HEAP32[pbuf + 20 >>> 2 >>> 0] = tempI64[1];
            return 0;
          }
          function _fd_pread(fd, iov, iovcnt, offset_low, offset_high, pnum) {
            iov >>>= 0;
            iovcnt >>>= 0;
            var offset = convertI32PairToI53Checked(offset_low, offset_high);
            pnum >>>= 0;
            return 52;
          }
          function _fd_pwrite(fd, iov, iovcnt, offset_low, offset_high, pnum) {
            iov >>>= 0;
            iovcnt >>>= 0;
            var offset = convertI32PairToI53Checked(offset_low, offset_high);
            pnum >>>= 0;
            return 52;
          }
          function _fd_read(fd, iov, iovcnt, pnum) {
            iov >>>= 0;
            iovcnt >>>= 0;
            pnum >>>= 0;
            return 52;
          }
          function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
            var offset = convertI32PairToI53Checked(offset_low, offset_high);
            newOffset >>>= 0;
            return 70;
          }
          var _fd_sync = (fd) => 52;
          var printCharBuffers = [null, [], []];
          var printChar = (stream, curr) => {
            var buffer = printCharBuffers[stream];
            if (curr === 0 || curr === 10) {
              (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
              buffer.length = 0;
            } else {
              buffer.push(curr);
            }
          };
          function _fd_write(fd, iov, iovcnt, pnum) {
            iov >>>= 0;
            iovcnt >>>= 0;
            pnum >>>= 0;
            var num = 0;
            for (var i = 0; i < iovcnt; i++) {
              var ptr = HEAPU32[iov >>> 2 >>> 0];
              var len = HEAPU32[iov + 4 >>> 2 >>> 0];
              iov += 8;
              for (var j = 0; j < len; j++) {
                printChar(fd, HEAPU8[ptr + j >>> 0]);
              }
              num += len;
            }
            HEAPU32[pnum >>> 2 >>> 0] = num;
            return 0;
          }
          function _getaddrinfo(node, service, hint, out2) {
            node >>>= 0;
            service >>>= 0;
            hint >>>= 0;
            out2 >>>= 0;
            var addr = 0;
            var port = 0;
            var flags = 0;
            var family = 0;
            var type = 0;
            var proto = 0;
            var ai;
            function allocaddrinfo(family2, type2, proto2, canon, addr2, port2) {
              var sa, salen, ai2;
              var errno;
              salen = family2 === 10 ? 28 : 16;
              addr2 = family2 === 10 ? inetNtop6(addr2) : inetNtop4(addr2);
              sa = _malloc(salen);
              errno = writeSockaddr(sa, family2, addr2, port2);
              assert(!errno);
              ai2 = _malloc(32);
              HEAP32[ai2 + 4 >>> 2 >>> 0] = family2;
              HEAP32[ai2 + 8 >>> 2 >>> 0] = type2;
              HEAP32[ai2 + 12 >>> 2 >>> 0] = proto2;
              HEAPU32[ai2 + 24 >>> 2 >>> 0] = canon;
              HEAPU32[ai2 + 20 >>> 2 >>> 0] = sa;
              if (family2 === 10) {
                HEAP32[ai2 + 16 >>> 2 >>> 0] = 28;
              } else {
                HEAP32[ai2 + 16 >>> 2 >>> 0] = 16;
              }
              HEAP32[ai2 + 28 >>> 2 >>> 0] = 0;
              return ai2;
            }
            if (hint) {
              flags = HEAP32[hint >>> 2 >>> 0];
              family = HEAP32[hint + 4 >>> 2 >>> 0];
              type = HEAP32[hint + 8 >>> 2 >>> 0];
              proto = HEAP32[hint + 12 >>> 2 >>> 0];
            }
            if (type && !proto) {
              proto = type === 2 ? 17 : 6;
            }
            if (!type && proto) {
              type = proto === 17 ? 2 : 1;
            }
            if (proto === 0) {
              proto = 6;
            }
            if (type === 0) {
              type = 1;
            }
            if (!node && !service) {
              return -2;
            }
            if (flags & ~(1 | 2 | 4 | 1024 | 8 | 16 | 32)) {
              return -1;
            }
            if (hint !== 0 && HEAP32[hint >>> 2 >>> 0] & 2 && !node) {
              return -1;
            }
            if (flags & 32) {
              return -2;
            }
            if (type !== 0 && type !== 1 && type !== 2) {
              return -7;
            }
            if (family !== 0 && family !== 2 && family !== 10) {
              return -6;
            }
            if (service) {
              service = UTF8ToString(service);
              port = parseInt(service, 10);
              if (isNaN(port)) {
                if (flags & 1024) {
                  return -2;
                }
                return -8;
              }
            }
            if (!node) {
              if (family === 0) {
                family = 2;
              }
              if ((flags & 1) === 0) {
                if (family === 2) {
                  addr = _htonl(2130706433);
                } else {
                  addr = [0, 0, 0, 1];
                }
              }
              ai = allocaddrinfo(family, type, proto, null, addr, port);
              HEAPU32[out2 >>> 2 >>> 0] = ai;
              return 0;
            }
            node = UTF8ToString(node);
            addr = inetPton4(node);
            if (addr !== null) {
              if (family === 0 || family === 2) {
                family = 2;
              } else if (family === 10 && flags & 8) {
                addr = [0, 0, _htonl(65535), addr];
                family = 10;
              } else {
                return -2;
              }
            } else {
              addr = inetPton6(node);
              if (addr !== null) {
                if (family === 0 || family === 10) {
                  family = 10;
                } else {
                  return -2;
                }
              }
            }
            if (addr != null) {
              ai = allocaddrinfo(family, type, proto, node, addr, port);
              HEAPU32[out2 >>> 2 >>> 0] = ai;
              return 0;
            }
            if (flags & 4) {
              return -2;
            }
            node = DNS.lookup_name(node);
            addr = inetPton4(node);
            if (family === 0) {
              family = 2;
            } else if (family === 10) {
              addr = [0, 0, _htonl(65535), addr];
            }
            ai = allocaddrinfo(family, type, proto, null, addr, port);
            HEAPU32[out2 >>> 2 >>> 0] = ai;
            return 0;
          }
          var initRandomFill = () => {
            if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
              return (view) => crypto.getRandomValues(view);
            } else if (ENVIRONMENT_IS_NODE) {
              try {
                var crypto_module = __require("crypto");
                var randomFillSync = crypto_module["randomFillSync"];
                if (randomFillSync) {
                  return (view) => crypto_module["randomFillSync"](view);
                }
                var randomBytes = crypto_module["randomBytes"];
                return (view) => (view.set(randomBytes(view.byteLength)), view);
              } catch (e) {
              }
            }
            abort("initRandomDevice");
          };
          var randomFill = (view) => (randomFill = initRandomFill())(view);
          function _getentropy(buffer, size) {
            buffer >>>= 0;
            size >>>= 0;
            randomFill(HEAPU8.subarray(buffer >>> 0, buffer + size >>> 0));
            return 0;
          }
          function _getnameinfo(sa, salen, node, nodelen, serv, servlen, flags) {
            sa >>>= 0;
            node >>>= 0;
            serv >>>= 0;
            var info = readSockaddr(sa, salen);
            if (info.errno) {
              return -6;
            }
            var port = info.port;
            var addr = info.addr;
            var overflowed = false;
            if (node && nodelen) {
              var lookup;
              if (flags & 1 || !(lookup = DNS.lookup_addr(addr))) {
                if (flags & 8) {
                  return -2;
                }
              } else {
                addr = lookup;
              }
              var numBytesWrittenExclNull = stringToUTF8(addr, node, nodelen);
              if (numBytesWrittenExclNull + 1 >= nodelen) {
                overflowed = true;
              }
            }
            if (serv && servlen) {
              port = "" + port;
              var numBytesWrittenExclNull = stringToUTF8(port, serv, servlen);
              if (numBytesWrittenExclNull + 1 >= servlen) {
                overflowed = true;
              }
            }
            if (overflowed) {
              return -12;
            }
            return 0;
          }
          var isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
          var arraySum = (array, index) => {
            var sum2 = 0;
            for (var i = 0; i <= index; sum2 += array[i++]) {
            }
            return sum2;
          };
          var MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          var MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          var addDays = (date, days) => {
            var newDate = new Date(date.getTime());
            while (days > 0) {
              var leap = isLeapYear(newDate.getFullYear());
              var currentMonth = newDate.getMonth();
              var daysInCurrentMonth = (leap ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR)[currentMonth];
              if (days > daysInCurrentMonth - newDate.getDate()) {
                days -= daysInCurrentMonth - newDate.getDate() + 1;
                newDate.setDate(1);
                if (currentMonth < 11) {
                  newDate.setMonth(currentMonth + 1);
                } else {
                  newDate.setMonth(0);
                  newDate.setFullYear(newDate.getFullYear() + 1);
                }
              } else {
                newDate.setDate(newDate.getDate() + days);
                return newDate;
              }
            }
            return newDate;
          };
          var lengthBytesUTF8 = (str) => {
            var len = 0;
            for (var i = 0; i < str.length; ++i) {
              var c = str.charCodeAt(i);
              if (c <= 127) {
                len++;
              } else if (c <= 2047) {
                len += 2;
              } else if (c >= 55296 && c <= 57343) {
                len += 4;
                ++i;
              } else {
                len += 3;
              }
            }
            return len;
          };
          function intArrayFromString(stringy, dontAddNull, length) {
            var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
            var u8array = new Array(len);
            var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
            if (dontAddNull)
              u8array.length = numBytesWritten;
            return u8array;
          }
          var writeArrayToMemory = (array, buffer) => {
            HEAP8.set(array, buffer >>> 0);
          };
          function _strftime(s, maxsize, format, tm) {
            s >>>= 0;
            maxsize >>>= 0;
            format >>>= 0;
            tm >>>= 0;
            var tm_zone = HEAPU32[tm + 40 >>> 2 >>> 0];
            var date = { tm_sec: HEAP32[tm >>> 2 >>> 0], tm_min: HEAP32[tm + 4 >>> 2 >>> 0], tm_hour: HEAP32[tm + 8 >>> 2 >>> 0], tm_mday: HEAP32[tm + 12 >>> 2 >>> 0], tm_mon: HEAP32[tm + 16 >>> 2 >>> 0], tm_year: HEAP32[tm + 20 >>> 2 >>> 0], tm_wday: HEAP32[tm + 24 >>> 2 >>> 0], tm_yday: HEAP32[tm + 28 >>> 2 >>> 0], tm_isdst: HEAP32[tm + 32 >>> 2 >>> 0], tm_gmtoff: HEAP32[tm + 36 >>> 2 >>> 0], tm_zone: tm_zone ? UTF8ToString(tm_zone) : "" };
            var pattern = UTF8ToString(format);
            var EXPANSION_RULES_1 = { "%c": "%a %b %d %H:%M:%S %Y", "%D": "%m/%d/%y", "%F": "%Y-%m-%d", "%h": "%b", "%r": "%I:%M:%S %p", "%R": "%H:%M", "%T": "%H:%M:%S", "%x": "%m/%d/%y", "%X": "%H:%M:%S", "%Ec": "%c", "%EC": "%C", "%Ex": "%m/%d/%y", "%EX": "%H:%M:%S", "%Ey": "%y", "%EY": "%Y", "%Od": "%d", "%Oe": "%e", "%OH": "%H", "%OI": "%I", "%Om": "%m", "%OM": "%M", "%OS": "%S", "%Ou": "%u", "%OU": "%U", "%OV": "%V", "%Ow": "%w", "%OW": "%W", "%Oy": "%y" };
            for (var rule in EXPANSION_RULES_1) {
              pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
            }
            var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            function leadingSomething(value, digits, character) {
              var str = typeof value == "number" ? value.toString() : value || "";
              while (str.length < digits) {
                str = character[0] + str;
              }
              return str;
            }
            function leadingNulls(value, digits) {
              return leadingSomething(value, digits, "0");
            }
            function compareByDay(date1, date2) {
              function sgn(value) {
                return value < 0 ? -1 : value > 0 ? 1 : 0;
              }
              var compare;
              if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
                if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
                  compare = sgn(date1.getDate() - date2.getDate());
                }
              }
              return compare;
            }
            function getFirstWeekStartDate(janFourth) {
              switch (janFourth.getDay()) {
                case 0:
                  return new Date(janFourth.getFullYear() - 1, 11, 29);
                case 1:
                  return janFourth;
                case 2:
                  return new Date(janFourth.getFullYear(), 0, 3);
                case 3:
                  return new Date(janFourth.getFullYear(), 0, 2);
                case 4:
                  return new Date(janFourth.getFullYear(), 0, 1);
                case 5:
                  return new Date(janFourth.getFullYear() - 1, 11, 31);
                case 6:
                  return new Date(janFourth.getFullYear() - 1, 11, 30);
              }
            }
            function getWeekBasedYear(date2) {
              var thisDate = addDays(new Date(date2.tm_year + 1900, 0, 1), date2.tm_yday);
              var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
              var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
              var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
              var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
              if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
                if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
                  return thisDate.getFullYear() + 1;
                }
                return thisDate.getFullYear();
              }
              return thisDate.getFullYear() - 1;
            }
            var EXPANSION_RULES_2 = { "%a": (date2) => WEEKDAYS[date2.tm_wday].substring(0, 3), "%A": (date2) => WEEKDAYS[date2.tm_wday], "%b": (date2) => MONTHS[date2.tm_mon].substring(0, 3), "%B": (date2) => MONTHS[date2.tm_mon], "%C": (date2) => {
              var year = date2.tm_year + 1900;
              return leadingNulls(year / 100 | 0, 2);
            }, "%d": (date2) => leadingNulls(date2.tm_mday, 2), "%e": (date2) => leadingSomething(date2.tm_mday, 2, " "), "%g": (date2) => getWeekBasedYear(date2).toString().substring(2), "%G": (date2) => getWeekBasedYear(date2), "%H": (date2) => leadingNulls(date2.tm_hour, 2), "%I": (date2) => {
              var twelveHour = date2.tm_hour;
              if (twelveHour == 0)
                twelveHour = 12;
              else if (twelveHour > 12)
                twelveHour -= 12;
              return leadingNulls(twelveHour, 2);
            }, "%j": (date2) => leadingNulls(date2.tm_mday + arraySum(isLeapYear(date2.tm_year + 1900) ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR, date2.tm_mon - 1), 3), "%m": (date2) => leadingNulls(date2.tm_mon + 1, 2), "%M": (date2) => leadingNulls(date2.tm_min, 2), "%n": () => "\n", "%p": (date2) => {
              if (date2.tm_hour >= 0 && date2.tm_hour < 12) {
                return "AM";
              }
              return "PM";
            }, "%S": (date2) => leadingNulls(date2.tm_sec, 2), "%t": () => "	", "%u": (date2) => date2.tm_wday || 7, "%U": (date2) => {
              var days = date2.tm_yday + 7 - date2.tm_wday;
              return leadingNulls(Math.floor(days / 7), 2);
            }, "%V": (date2) => {
              var val = Math.floor((date2.tm_yday + 7 - (date2.tm_wday + 6) % 7) / 7);
              if ((date2.tm_wday + 371 - date2.tm_yday - 2) % 7 <= 2) {
                val++;
              }
              if (!val) {
                val = 52;
                var dec31 = (date2.tm_wday + 7 - date2.tm_yday - 1) % 7;
                if (dec31 == 4 || dec31 == 5 && isLeapYear(date2.tm_year % 400 - 1)) {
                  val++;
                }
              } else if (val == 53) {
                var jan1 = (date2.tm_wday + 371 - date2.tm_yday) % 7;
                if (jan1 != 4 && (jan1 != 3 || !isLeapYear(date2.tm_year)))
                  val = 1;
              }
              return leadingNulls(val, 2);
            }, "%w": (date2) => date2.tm_wday, "%W": (date2) => {
              var days = date2.tm_yday + 7 - (date2.tm_wday + 6) % 7;
              return leadingNulls(Math.floor(days / 7), 2);
            }, "%y": (date2) => (date2.tm_year + 1900).toString().substring(2), "%Y": (date2) => date2.tm_year + 1900, "%z": (date2) => {
              var off = date2.tm_gmtoff;
              var ahead = off >= 0;
              off = Math.abs(off) / 60;
              off = off / 60 * 100 + off % 60;
              return (ahead ? "+" : "-") + String("0000" + off).slice(-4);
            }, "%Z": (date2) => date2.tm_zone, "%%": () => "%" };
            pattern = pattern.replace(/%%/g, "\0\0");
            for (var rule in EXPANSION_RULES_2) {
              if (pattern.includes(rule)) {
                pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
              }
            }
            pattern = pattern.replace(/\0\0/g, "%");
            var bytes = intArrayFromString(pattern, false);
            if (bytes.length > maxsize) {
              return 0;
            }
            writeArrayToMemory(bytes, s);
            return bytes.length - 1;
          }
          function _strftime_l(s, maxsize, format, tm, loc) {
            s >>>= 0;
            maxsize >>>= 0;
            format >>>= 0;
            tm >>>= 0;
            loc >>>= 0;
            return _strftime(s, maxsize, format, tm);
          }
          var runtimeKeepaliveCounter = 0;
          var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
          var _proc_exit = (code) => {
            EXITSTATUS = code;
            if (!keepRuntimeAlive()) {
              Module["onExit"]?.(code);
              ABORT = true;
            }
            quit_(code, new ExitStatus(code));
          };
          var exitJS = (status, implicit) => {
            EXITSTATUS = status;
            _proc_exit(status);
          };
          var handleException = (e) => {
            if (e instanceof ExitStatus || e == "unwind") {
              return EXITSTATUS;
            }
            quit_(1, e);
          };
          var getCFunc = (ident) => {
            var func = Module["_" + ident];
            return func;
          };
          var stringToUTF8OnStack = (str) => {
            var size = lengthBytesUTF8(str) + 1;
            var ret = stackAlloc(size);
            stringToUTF8(str, ret, size);
            return ret;
          };
          var ccall = (ident, returnType, argTypes, args, opts) => {
            var toC = { "string": (str) => {
              var ret2 = 0;
              if (str !== null && str !== void 0 && str !== 0) {
                ret2 = stringToUTF8OnStack(str);
              }
              return ret2;
            }, "array": (arr) => {
              var ret2 = stackAlloc(arr.length);
              writeArrayToMemory(arr, ret2);
              return ret2;
            } };
            function convertReturnValue(ret2) {
              if (returnType === "string") {
                return UTF8ToString(ret2);
              }
              if (returnType === "boolean")
                return Boolean(ret2);
              return ret2;
            }
            var func = getCFunc(ident);
            var cArgs = [];
            var stack = 0;
            if (args) {
              for (var i = 0; i < args.length; i++) {
                var converter = toC[argTypes[i]];
                if (converter) {
                  if (stack === 0)
                    stack = stackSave();
                  cArgs[i] = converter(args[i]);
                } else {
                  cArgs[i] = args[i];
                }
              }
            }
            var ret = func.apply(null, cArgs);
            function onDone(ret2) {
              if (stack !== 0)
                stackRestore(stack);
              return convertReturnValue(ret2);
            }
            ret = onDone(ret);
            return ret;
          };
          var wasmImports = { Z: ___syscall__newselect, ba: ___syscall_bind, aa: ___syscall_connect, V: ___syscall_faccessat, a: ___syscall_fcntl64, U: ___syscall_fstat64, v: ___syscall_ftruncate64, P: ___syscall_getdents64, X: ___syscall_getpeername, Y: ___syscall_getsockopt, o: ___syscall_ioctl, R: ___syscall_lstat64, Q: ___syscall_mkdirat, S: ___syscall_newfstatat, p: ___syscall_openat, _: ___syscall_recvfrom, N: ___syscall_renameat, i: ___syscall_rmdir, $: ___syscall_sendto, l: ___syscall_socket, T: ___syscall_stat64, j: ___syscall_unlinkat, q: __emscripten_get_now_is_monotonic, c: _abort, F: _duckdb_web_fs_directory_create, G: _duckdb_web_fs_directory_exists, D: _duckdb_web_fs_directory_list_files, E: _duckdb_web_fs_directory_remove, g: _duckdb_web_fs_file_close, A: _duckdb_web_fs_file_exists, u: _duckdb_web_fs_file_get_last_modified_time, B: _duckdb_web_fs_file_move, I: _duckdb_web_fs_file_open, d: _duckdb_web_fs_file_read, H: _duckdb_web_fs_file_truncate, h: _duckdb_web_fs_file_write, J: _duckdb_web_fs_get_default_data_protocol, z: _duckdb_web_fs_glob, f: _duckdb_web_test_platform_feature, L: _duckdb_web_udf_scalar_call, r: _emscripten_date_now, s: _emscripten_get_heap_max, k: _emscripten_get_now, da: _emscripten_memcpy_js, ea: _emscripten_resize_heap, C: _environ_get, K: _environ_sizes_get, b: _fd_close, ca: _fd_fdstat_get, x: _fd_pread, w: _fd_pwrite, n: _fd_read, y: _fd_seek, O: _fd_sync, e: _fd_write, m: _getaddrinfo, M: _getentropy, W: _getnameinfo, t: _strftime_l };
          var wasmExports = createWasm();
          var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports["ga"])();
          var _main = Module["_main"] = (a0, a1) => (_main = Module["_main"] = wasmExports["ha"])(a0, a1);
          var _duckdb_web_fs_glob_add_path = Module["_duckdb_web_fs_glob_add_path"] = (a0) => (_duckdb_web_fs_glob_add_path = Module["_duckdb_web_fs_glob_add_path"] = wasmExports["ja"])(a0);
          var _duckdb_web_clear_response = Module["_duckdb_web_clear_response"] = () => (_duckdb_web_clear_response = Module["_duckdb_web_clear_response"] = wasmExports["ka"])();
          var _duckdb_web_fail_with = Module["_duckdb_web_fail_with"] = (a0) => (_duckdb_web_fail_with = Module["_duckdb_web_fail_with"] = wasmExports["la"])(a0);
          var _duckdb_web_reset = Module["_duckdb_web_reset"] = (a0) => (_duckdb_web_reset = Module["_duckdb_web_reset"] = wasmExports["ma"])(a0);
          var _duckdb_web_connect = Module["_duckdb_web_connect"] = () => (_duckdb_web_connect = Module["_duckdb_web_connect"] = wasmExports["na"])();
          var _duckdb_web_disconnect = Module["_duckdb_web_disconnect"] = (a0) => (_duckdb_web_disconnect = Module["_duckdb_web_disconnect"] = wasmExports["oa"])(a0);
          var _duckdb_web_flush_files = Module["_duckdb_web_flush_files"] = () => (_duckdb_web_flush_files = Module["_duckdb_web_flush_files"] = wasmExports["pa"])();
          var _duckdb_web_flush_file = Module["_duckdb_web_flush_file"] = (a0) => (_duckdb_web_flush_file = Module["_duckdb_web_flush_file"] = wasmExports["qa"])(a0);
          var _duckdb_web_open = Module["_duckdb_web_open"] = (a0, a1) => (_duckdb_web_open = Module["_duckdb_web_open"] = wasmExports["ra"])(a0, a1);
          var _duckdb_web_get_global_file_info = Module["_duckdb_web_get_global_file_info"] = (a0, a1) => (_duckdb_web_get_global_file_info = Module["_duckdb_web_get_global_file_info"] = wasmExports["sa"])(a0, a1);
          var _duckdb_web_collect_file_stats = Module["_duckdb_web_collect_file_stats"] = (a0, a1, a2) => (_duckdb_web_collect_file_stats = Module["_duckdb_web_collect_file_stats"] = wasmExports["ta"])(a0, a1, a2);
          var _duckdb_web_export_file_stats = Module["_duckdb_web_export_file_stats"] = (a0, a1) => (_duckdb_web_export_file_stats = Module["_duckdb_web_export_file_stats"] = wasmExports["ua"])(a0, a1);
          var _duckdb_web_fs_drop_file = Module["_duckdb_web_fs_drop_file"] = (a0, a1) => (_duckdb_web_fs_drop_file = Module["_duckdb_web_fs_drop_file"] = wasmExports["va"])(a0, a1);
          var _duckdb_web_fs_drop_files = Module["_duckdb_web_fs_drop_files"] = (a0) => (_duckdb_web_fs_drop_files = Module["_duckdb_web_fs_drop_files"] = wasmExports["wa"])(a0);
          var _duckdb_web_fs_glob_file_infos = Module["_duckdb_web_fs_glob_file_infos"] = (a0, a1) => (_duckdb_web_fs_glob_file_infos = Module["_duckdb_web_fs_glob_file_infos"] = wasmExports["xa"])(a0, a1);
          var _duckdb_web_fs_get_file_info_by_id = Module["_duckdb_web_fs_get_file_info_by_id"] = (a0, a1, a2) => (_duckdb_web_fs_get_file_info_by_id = Module["_duckdb_web_fs_get_file_info_by_id"] = wasmExports["ya"])(a0, a1, a2);
          var _duckdb_web_fs_get_file_info_by_name = Module["_duckdb_web_fs_get_file_info_by_name"] = (a0, a1, a2) => (_duckdb_web_fs_get_file_info_by_name = Module["_duckdb_web_fs_get_file_info_by_name"] = wasmExports["za"])(a0, a1, a2);
          var _duckdb_web_fs_register_file_url = Module["_duckdb_web_fs_register_file_url"] = (a0, a1, a2, a3, a4) => (_duckdb_web_fs_register_file_url = Module["_duckdb_web_fs_register_file_url"] = wasmExports["Aa"])(a0, a1, a2, a3, a4);
          var _duckdb_web_fs_register_file_buffer = Module["_duckdb_web_fs_register_file_buffer"] = (a0, a1, a2, a3) => (_duckdb_web_fs_register_file_buffer = Module["_duckdb_web_fs_register_file_buffer"] = wasmExports["Ba"])(a0, a1, a2, a3);
          var _duckdb_web_copy_file_to_buffer = Module["_duckdb_web_copy_file_to_buffer"] = (a0, a1) => (_duckdb_web_copy_file_to_buffer = Module["_duckdb_web_copy_file_to_buffer"] = wasmExports["Ca"])(a0, a1);
          var _duckdb_web_copy_file_to_path = Module["_duckdb_web_copy_file_to_path"] = (a0, a1, a2) => (_duckdb_web_copy_file_to_path = Module["_duckdb_web_copy_file_to_path"] = wasmExports["Da"])(a0, a1, a2);
          var _duckdb_web_get_version = Module["_duckdb_web_get_version"] = (a0) => (_duckdb_web_get_version = Module["_duckdb_web_get_version"] = wasmExports["Ea"])(a0);
          var _duckdb_web_get_feature_flags = Module["_duckdb_web_get_feature_flags"] = () => (_duckdb_web_get_feature_flags = Module["_duckdb_web_get_feature_flags"] = wasmExports["Fa"])();
          var _duckdb_web_tokenize = Module["_duckdb_web_tokenize"] = (a0, a1) => (_duckdb_web_tokenize = Module["_duckdb_web_tokenize"] = wasmExports["Ga"])(a0, a1);
          var _duckdb_web_udf_scalar_create = Module["_duckdb_web_udf_scalar_create"] = (a0, a1, a2) => (_duckdb_web_udf_scalar_create = Module["_duckdb_web_udf_scalar_create"] = wasmExports["Ha"])(a0, a1, a2);
          var _duckdb_web_prepared_create = Module["_duckdb_web_prepared_create"] = (a0, a1, a2) => (_duckdb_web_prepared_create = Module["_duckdb_web_prepared_create"] = wasmExports["Ia"])(a0, a1, a2);
          var _duckdb_web_prepared_close = Module["_duckdb_web_prepared_close"] = (a0, a1, a2) => (_duckdb_web_prepared_close = Module["_duckdb_web_prepared_close"] = wasmExports["Ja"])(a0, a1, a2);
          var _duckdb_web_prepared_run = Module["_duckdb_web_prepared_run"] = (a0, a1, a2, a3) => (_duckdb_web_prepared_run = Module["_duckdb_web_prepared_run"] = wasmExports["Ka"])(a0, a1, a2, a3);
          var _duckdb_web_prepared_send = Module["_duckdb_web_prepared_send"] = (a0, a1, a2, a3) => (_duckdb_web_prepared_send = Module["_duckdb_web_prepared_send"] = wasmExports["La"])(a0, a1, a2, a3);
          var _duckdb_web_query_run = Module["_duckdb_web_query_run"] = (a0, a1, a2) => (_duckdb_web_query_run = Module["_duckdb_web_query_run"] = wasmExports["Ma"])(a0, a1, a2);
          var _duckdb_web_pending_query_start = Module["_duckdb_web_pending_query_start"] = (a0, a1, a2) => (_duckdb_web_pending_query_start = Module["_duckdb_web_pending_query_start"] = wasmExports["Na"])(a0, a1, a2);
          var _duckdb_web_pending_query_poll = Module["_duckdb_web_pending_query_poll"] = (a0, a1, a2) => (_duckdb_web_pending_query_poll = Module["_duckdb_web_pending_query_poll"] = wasmExports["Oa"])(a0, a1, a2);
          var _duckdb_web_pending_query_cancel = Module["_duckdb_web_pending_query_cancel"] = (a0, a1) => (_duckdb_web_pending_query_cancel = Module["_duckdb_web_pending_query_cancel"] = wasmExports["Pa"])(a0, a1);
          var _duckdb_web_query_fetch_results = Module["_duckdb_web_query_fetch_results"] = (a0, a1) => (_duckdb_web_query_fetch_results = Module["_duckdb_web_query_fetch_results"] = wasmExports["Qa"])(a0, a1);
          var _duckdb_web_get_tablenames = Module["_duckdb_web_get_tablenames"] = (a0, a1, a2) => (_duckdb_web_get_tablenames = Module["_duckdb_web_get_tablenames"] = wasmExports["Ra"])(a0, a1, a2);
          var _duckdb_web_insert_arrow_from_ipc_stream = Module["_duckdb_web_insert_arrow_from_ipc_stream"] = (a0, a1, a2, a3, a4) => (_duckdb_web_insert_arrow_from_ipc_stream = Module["_duckdb_web_insert_arrow_from_ipc_stream"] = wasmExports["Sa"])(a0, a1, a2, a3, a4);
          var _duckdb_web_insert_csv_from_path = Module["_duckdb_web_insert_csv_from_path"] = (a0, a1, a2, a3) => (_duckdb_web_insert_csv_from_path = Module["_duckdb_web_insert_csv_from_path"] = wasmExports["Ta"])(a0, a1, a2, a3);
          var _duckdb_web_insert_json_from_path = Module["_duckdb_web_insert_json_from_path"] = (a0, a1, a2, a3) => (_duckdb_web_insert_json_from_path = Module["_duckdb_web_insert_json_from_path"] = wasmExports["Ua"])(a0, a1, a2, a3);
          var ___errno_location = () => (___errno_location = wasmExports["__errno_location"])();
          var _htonl = (a0) => (_htonl = wasmExports["Va"])(a0);
          var _htons = (a0) => (_htons = wasmExports["Wa"])(a0);
          var _ntohs = (a0) => (_ntohs = wasmExports["Xa"])(a0);
          var _malloc = Module["_malloc"] = (a0) => (_malloc = Module["_malloc"] = wasmExports["Ya"])(a0);
          var _free = Module["_free"] = (a0) => (_free = Module["_free"] = wasmExports["Za"])(a0);
          var ___trap = () => (___trap = wasmExports["_a"])();
          var stackSave = () => (stackSave = wasmExports["$a"])();
          var stackRestore = (a0) => (stackRestore = wasmExports["ab"])(a0);
          var stackAlloc = (a0) => (stackAlloc = wasmExports["bb"])(a0);
          function applySignatureConversions(wasmExports2) {
            wasmExports2 = Object.assign({}, wasmExports2);
            var makeWrapper_p = (f) => () => f() >>> 0;
            var makeWrapper_pp = (f) => (a0) => f(a0) >>> 0;
            wasmExports2["__errno_location"] = makeWrapper_p(wasmExports2["__errno_location"]);
            wasmExports2["Ya"] = makeWrapper_pp(wasmExports2["Ya"]);
            wasmExports2["$a"] = makeWrapper_p(wasmExports2["$a"]);
            wasmExports2["bb"] = makeWrapper_pp(wasmExports2["bb"]);
            return wasmExports2;
          }
          Module["stackAlloc"] = stackAlloc;
          Module["stackSave"] = stackSave;
          Module["stackRestore"] = stackRestore;
          Module["ccall"] = ccall;
          var calledRun;
          dependenciesFulfilled = function runCaller() {
            if (!calledRun)
              run();
            if (!calledRun)
              dependenciesFulfilled = runCaller;
          };
          function callMain() {
            var entryFunction = _main;
            var argc = 0;
            var argv = 0;
            try {
              var ret = entryFunction(argc, argv);
              exitJS(ret, true);
              return ret;
            } catch (e) {
              return handleException(e);
            }
          }
          function run() {
            if (runDependencies > 0) {
              return;
            }
            preRun();
            if (runDependencies > 0) {
              return;
            }
            function doRun() {
              if (calledRun)
                return;
              calledRun = true;
              Module["calledRun"] = true;
              if (ABORT)
                return;
              initRuntime();
              preMain();
              readyPromiseResolve(Module);
              if (Module["onRuntimeInitialized"])
                Module["onRuntimeInitialized"]();
              if (shouldRunNow)
                callMain();
              postRun();
            }
            if (Module["setStatus"]) {
              Module["setStatus"]("Running...");
              setTimeout(function() {
                setTimeout(function() {
                  Module["setStatus"]("");
                }, 1);
                doRun();
              }, 1);
            } else {
              doRun();
            }
          }
          if (Module["preInit"]) {
            if (typeof Module["preInit"] == "function")
              Module["preInit"] = [Module["preInit"]];
            while (Module["preInit"].length > 0) {
              Module["preInit"].pop()();
            }
          }
          var shouldRunNow = true;
          if (Module["noInitialRun"])
            shouldRunNow = false;
          run();
          return moduleArg.ready;
        };
      })();
      if (typeof exports2 === "object" && typeof module2 === "object")
        module2.exports = DuckDB3;
      else if (typeof define === "function" && define["amd"])
        define([], () => DuckDB3);
    }
  });

  // ../../node_modules/web-worker/cjs/browser.js
  var require_browser = __commonJS({
    "../../node_modules/web-worker/cjs/browser.js"(exports2, module2) {
      module2.exports = Worker;
    }
  });

  // ../../node_modules/apache-arrow/node_modules/tslib/tslib.es6.mjs
  function __rest(s, e) {
    var t = {};
    for (var p in s)
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
          t[p[i]] = s[p[i]];
      }
    return t;
  }
  function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }
  function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m)
      return m.call(o);
    if (o && typeof o.length === "number")
      return {
        next: function() {
          if (o && i >= o.length)
            o = void 0;
          return { value: o && o[i++], done: !o };
        }
      };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
  }
  function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
  }
  function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator)
      throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
      return this;
    }, i;
    function verb(n) {
      if (g[n])
        i[n] = function(v) {
          return new Promise(function(a, b) {
            q.push([n, v, a, b]) > 1 || resume(n, v);
          });
        };
    }
    function resume(n, v) {
      try {
        step(g[n](v));
      } catch (e) {
        settle(q[0][3], e);
      }
    }
    function step(r) {
      r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
    }
    function fulfill(value) {
      resume("next", value);
    }
    function reject(value) {
      resume("throw", value);
    }
    function settle(f, v) {
      if (f(v), q.shift(), q.length)
        resume(q[0][0], q[0][1]);
    }
  }
  function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function(e) {
      throw e;
    }), verb("return"), i[Symbol.iterator] = function() {
      return this;
    }, i;
    function verb(n, f) {
      i[n] = o[n] ? function(v) {
        return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v;
      } : f;
    }
  }
  function __asyncValues(o) {
    if (!Symbol.asyncIterator)
      throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
      return this;
    }, i);
    function verb(n) {
      i[n] = o[n] && function(v) {
        return new Promise(function(resolve, reject) {
          v = o[n](v), settle(resolve, reject, v.done, v.value);
        });
      };
    }
    function settle(resolve, reject, d, v) {
      Promise.resolve(v).then(function(v2) {
        resolve({ value: v2, done: d });
      }, reject);
    }
  }

  // ../../node_modules/apache-arrow/util/buffer.mjs
  var buffer_exports = {};
  __export(buffer_exports, {
    compareArrayLike: () => compareArrayLike,
    joinUint8Arrays: () => joinUint8Arrays,
    memcpy: () => memcpy,
    rebaseValueOffsets: () => rebaseValueOffsets,
    toArrayBufferView: () => toArrayBufferView,
    toArrayBufferViewAsyncIterator: () => toArrayBufferViewAsyncIterator,
    toArrayBufferViewIterator: () => toArrayBufferViewIterator,
    toBigInt64Array: () => toBigInt64Array,
    toBigUint64Array: () => toBigUint64Array,
    toFloat32Array: () => toFloat32Array,
    toFloat32ArrayAsyncIterator: () => toFloat32ArrayAsyncIterator,
    toFloat32ArrayIterator: () => toFloat32ArrayIterator,
    toFloat64Array: () => toFloat64Array,
    toFloat64ArrayAsyncIterator: () => toFloat64ArrayAsyncIterator,
    toFloat64ArrayIterator: () => toFloat64ArrayIterator,
    toInt16Array: () => toInt16Array,
    toInt16ArrayAsyncIterator: () => toInt16ArrayAsyncIterator,
    toInt16ArrayIterator: () => toInt16ArrayIterator,
    toInt32Array: () => toInt32Array,
    toInt32ArrayAsyncIterator: () => toInt32ArrayAsyncIterator,
    toInt32ArrayIterator: () => toInt32ArrayIterator,
    toInt8Array: () => toInt8Array,
    toInt8ArrayAsyncIterator: () => toInt8ArrayAsyncIterator,
    toInt8ArrayIterator: () => toInt8ArrayIterator,
    toUint16Array: () => toUint16Array,
    toUint16ArrayAsyncIterator: () => toUint16ArrayAsyncIterator,
    toUint16ArrayIterator: () => toUint16ArrayIterator,
    toUint32Array: () => toUint32Array,
    toUint32ArrayAsyncIterator: () => toUint32ArrayAsyncIterator,
    toUint32ArrayIterator: () => toUint32ArrayIterator,
    toUint8Array: () => toUint8Array,
    toUint8ArrayAsyncIterator: () => toUint8ArrayAsyncIterator,
    toUint8ArrayIterator: () => toUint8ArrayIterator,
    toUint8ClampedArray: () => toUint8ClampedArray,
    toUint8ClampedArrayAsyncIterator: () => toUint8ClampedArrayAsyncIterator,
    toUint8ClampedArrayIterator: () => toUint8ClampedArrayIterator
  });

  // ../../node_modules/apache-arrow/util/utf8.mjs
  var decoder = new TextDecoder("utf-8");
  var decodeUtf8 = (buffer) => decoder.decode(buffer);
  var encoder = new TextEncoder();
  var encodeUtf8 = (value) => encoder.encode(value);

  // ../../node_modules/apache-arrow/util/compat.mjs
  var isNumber = (x) => typeof x === "number";
  var isBoolean = (x) => typeof x === "boolean";
  var isFunction = (x) => typeof x === "function";
  var isObject = (x) => x != null && Object(x) === x;
  var isPromise = (x) => {
    return isObject(x) && isFunction(x.then);
  };
  var isIterable = (x) => {
    return isObject(x) && isFunction(x[Symbol.iterator]);
  };
  var isAsyncIterable = (x) => {
    return isObject(x) && isFunction(x[Symbol.asyncIterator]);
  };
  var isArrowJSON = (x) => {
    return isObject(x) && isObject(x["schema"]);
  };
  var isIteratorResult = (x) => {
    return isObject(x) && "done" in x && "value" in x;
  };
  var isFileHandle = (x) => {
    return isObject(x) && isFunction(x["stat"]) && isNumber(x["fd"]);
  };
  var isFetchResponse = (x) => {
    return isObject(x) && isReadableDOMStream(x["body"]);
  };
  var isReadableInterop = (x) => "_getDOMStream" in x && "_getNodeStream" in x;
  var isWritableDOMStream = (x) => {
    return isObject(x) && isFunction(x["abort"]) && isFunction(x["getWriter"]) && !isReadableInterop(x);
  };
  var isReadableDOMStream = (x) => {
    return isObject(x) && isFunction(x["cancel"]) && isFunction(x["getReader"]) && !isReadableInterop(x);
  };
  var isWritableNodeStream = (x) => {
    return isObject(x) && isFunction(x["end"]) && isFunction(x["write"]) && isBoolean(x["writable"]) && !isReadableInterop(x);
  };
  var isReadableNodeStream = (x) => {
    return isObject(x) && isFunction(x["read"]) && isFunction(x["pipe"]) && isBoolean(x["readable"]) && !isReadableInterop(x);
  };
  var isFlatbuffersByteBuffer = (x) => {
    return isObject(x) && isFunction(x["clear"]) && isFunction(x["bytes"]) && isFunction(x["position"]) && isFunction(x["setPosition"]) && isFunction(x["capacity"]) && isFunction(x["getBufferIdentifier"]) && isFunction(x["createLong"]);
  };

  // ../../node_modules/apache-arrow/util/buffer.mjs
  var SharedArrayBuf = typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;
  function collapseContiguousByteRanges(chunks) {
    const result = chunks[0] ? [chunks[0]] : [];
    let xOffset, yOffset, xLen, yLen;
    for (let x, y, i = 0, j = 0, n = chunks.length; ++i < n; ) {
      x = result[j];
      y = chunks[i];
      if (!x || !y || x.buffer !== y.buffer || y.byteOffset < x.byteOffset) {
        y && (result[++j] = y);
        continue;
      }
      ({ byteOffset: xOffset, byteLength: xLen } = x);
      ({ byteOffset: yOffset, byteLength: yLen } = y);
      if (xOffset + xLen < yOffset || yOffset + yLen < xOffset) {
        y && (result[++j] = y);
        continue;
      }
      result[j] = new Uint8Array(x.buffer, xOffset, yOffset - xOffset + yLen);
    }
    return result;
  }
  function memcpy(target, source, targetByteOffset = 0, sourceByteLength = source.byteLength) {
    const targetByteLength = target.byteLength;
    const dst = new Uint8Array(target.buffer, target.byteOffset, targetByteLength);
    const src = new Uint8Array(source.buffer, source.byteOffset, Math.min(sourceByteLength, targetByteLength));
    dst.set(src, targetByteOffset);
    return target;
  }
  function joinUint8Arrays(chunks, size) {
    const result = collapseContiguousByteRanges(chunks);
    const byteLength = result.reduce((x, b) => x + b.byteLength, 0);
    let source, sliced, buffer;
    let offset = 0, index = -1;
    const length = Math.min(size || Number.POSITIVE_INFINITY, byteLength);
    for (const n = result.length; ++index < n; ) {
      source = result[index];
      sliced = source.subarray(0, Math.min(source.length, length - offset));
      if (length <= offset + sliced.length) {
        if (sliced.length < source.length) {
          result[index] = source.subarray(sliced.length);
        } else if (sliced.length === source.length) {
          index++;
        }
        buffer ? memcpy(buffer, sliced, offset) : buffer = sliced;
        break;
      }
      memcpy(buffer || (buffer = new Uint8Array(length)), sliced, offset);
      offset += sliced.length;
    }
    return [buffer || new Uint8Array(0), result.slice(index), byteLength - (buffer ? buffer.byteLength : 0)];
  }
  function toArrayBufferView(ArrayBufferViewCtor, input) {
    let value = isIteratorResult(input) ? input.value : input;
    if (value instanceof ArrayBufferViewCtor) {
      if (ArrayBufferViewCtor === Uint8Array) {
        return new ArrayBufferViewCtor(value.buffer, value.byteOffset, value.byteLength);
      }
      return value;
    }
    if (!value) {
      return new ArrayBufferViewCtor(0);
    }
    if (typeof value === "string") {
      value = encodeUtf8(value);
    }
    if (value instanceof ArrayBuffer) {
      return new ArrayBufferViewCtor(value);
    }
    if (value instanceof SharedArrayBuf) {
      return new ArrayBufferViewCtor(value);
    }
    if (isFlatbuffersByteBuffer(value)) {
      return toArrayBufferView(ArrayBufferViewCtor, value.bytes());
    }
    return !ArrayBuffer.isView(value) ? ArrayBufferViewCtor.from(value) : value.byteLength <= 0 ? new ArrayBufferViewCtor(0) : new ArrayBufferViewCtor(value.buffer, value.byteOffset, value.byteLength / ArrayBufferViewCtor.BYTES_PER_ELEMENT);
  }
  var toInt8Array = (input) => toArrayBufferView(Int8Array, input);
  var toInt16Array = (input) => toArrayBufferView(Int16Array, input);
  var toInt32Array = (input) => toArrayBufferView(Int32Array, input);
  var toBigInt64Array = (input) => toArrayBufferView(BigInt64Array, input);
  var toUint8Array = (input) => toArrayBufferView(Uint8Array, input);
  var toUint16Array = (input) => toArrayBufferView(Uint16Array, input);
  var toUint32Array = (input) => toArrayBufferView(Uint32Array, input);
  var toBigUint64Array = (input) => toArrayBufferView(BigUint64Array, input);
  var toFloat32Array = (input) => toArrayBufferView(Float32Array, input);
  var toFloat64Array = (input) => toArrayBufferView(Float64Array, input);
  var toUint8ClampedArray = (input) => toArrayBufferView(Uint8ClampedArray, input);
  var pump = (iterator) => {
    iterator.next();
    return iterator;
  };
  function* toArrayBufferViewIterator(ArrayCtor, source) {
    const wrap = function* (x) {
      yield x;
    };
    const buffers = typeof source === "string" ? wrap(source) : ArrayBuffer.isView(source) ? wrap(source) : source instanceof ArrayBuffer ? wrap(source) : source instanceof SharedArrayBuf ? wrap(source) : !isIterable(source) ? wrap(source) : source;
    yield* pump(function* (it2) {
      let r = null;
      do {
        r = it2.next(yield toArrayBufferView(ArrayCtor, r));
      } while (!r.done);
    }(buffers[Symbol.iterator]()));
    return new ArrayCtor();
  }
  var toInt8ArrayIterator = (input) => toArrayBufferViewIterator(Int8Array, input);
  var toInt16ArrayIterator = (input) => toArrayBufferViewIterator(Int16Array, input);
  var toInt32ArrayIterator = (input) => toArrayBufferViewIterator(Int32Array, input);
  var toUint8ArrayIterator = (input) => toArrayBufferViewIterator(Uint8Array, input);
  var toUint16ArrayIterator = (input) => toArrayBufferViewIterator(Uint16Array, input);
  var toUint32ArrayIterator = (input) => toArrayBufferViewIterator(Uint32Array, input);
  var toFloat32ArrayIterator = (input) => toArrayBufferViewIterator(Float32Array, input);
  var toFloat64ArrayIterator = (input) => toArrayBufferViewIterator(Float64Array, input);
  var toUint8ClampedArrayIterator = (input) => toArrayBufferViewIterator(Uint8ClampedArray, input);
  function toArrayBufferViewAsyncIterator(ArrayCtor, source) {
    return __asyncGenerator(this, arguments, function* toArrayBufferViewAsyncIterator_1() {
      if (isPromise(source)) {
        return yield __await(yield __await(yield* __asyncDelegator(__asyncValues(toArrayBufferViewAsyncIterator(ArrayCtor, yield __await(source))))));
      }
      const wrap = function(x) {
        return __asyncGenerator(this, arguments, function* () {
          yield yield __await(yield __await(x));
        });
      };
      const emit = function(source2) {
        return __asyncGenerator(this, arguments, function* () {
          yield __await(yield* __asyncDelegator(__asyncValues(pump(function* (it2) {
            let r = null;
            do {
              r = it2.next(yield r === null || r === void 0 ? void 0 : r.value);
            } while (!r.done);
          }(source2[Symbol.iterator]())))));
        });
      };
      const buffers = typeof source === "string" ? wrap(source) : ArrayBuffer.isView(source) ? wrap(source) : source instanceof ArrayBuffer ? wrap(source) : source instanceof SharedArrayBuf ? wrap(source) : isIterable(source) ? emit(source) : !isAsyncIterable(source) ? wrap(source) : source;
      yield __await(
        // otherwise if AsyncIterable, use it
        yield* __asyncDelegator(__asyncValues(pump(function(it2) {
          return __asyncGenerator(this, arguments, function* () {
            let r = null;
            do {
              r = yield __await(it2.next(yield yield __await(toArrayBufferView(ArrayCtor, r))));
            } while (!r.done);
          });
        }(buffers[Symbol.asyncIterator]()))))
      );
      return yield __await(new ArrayCtor());
    });
  }
  var toInt8ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Int8Array, input);
  var toInt16ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Int16Array, input);
  var toInt32ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Int32Array, input);
  var toUint8ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Uint8Array, input);
  var toUint16ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Uint16Array, input);
  var toUint32ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Uint32Array, input);
  var toFloat32ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Float32Array, input);
  var toFloat64ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Float64Array, input);
  var toUint8ClampedArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Uint8ClampedArray, input);
  function rebaseValueOffsets(offset, length, valueOffsets) {
    if (offset !== 0) {
      valueOffsets = valueOffsets.slice(0, length + 1);
      for (let i = -1; ++i <= length; ) {
        valueOffsets[i] += offset;
      }
    }
    return valueOffsets;
  }
  function compareArrayLike(a, b) {
    let i = 0;
    const n = a.length;
    if (n !== b.length) {
      return false;
    }
    if (n > 0) {
      do {
        if (a[i] !== b[i]) {
          return false;
        }
      } while (++i < n);
    }
    return true;
  }

  // ../../node_modules/apache-arrow/io/adapters.mjs
  var adapters_default = {
    fromIterable(source) {
      return pump2(fromIterable(source));
    },
    fromAsyncIterable(source) {
      return pump2(fromAsyncIterable(source));
    },
    fromDOMStream(source) {
      return pump2(fromDOMStream(source));
    },
    fromNodeStream(stream) {
      return pump2(fromNodeStream(stream));
    },
    // @ts-ignore
    toDOMStream(source, options) {
      throw new Error(`"toDOMStream" not available in this environment`);
    },
    // @ts-ignore
    toNodeStream(source, options) {
      throw new Error(`"toNodeStream" not available in this environment`);
    }
  };
  var pump2 = (iterator) => {
    iterator.next();
    return iterator;
  };
  function* fromIterable(source) {
    let done, threw = false;
    let buffers = [], buffer;
    let cmd, size, bufferLength = 0;
    function byteRange() {
      if (cmd === "peek") {
        return joinUint8Arrays(buffers, size)[0];
      }
      [buffer, buffers, bufferLength] = joinUint8Arrays(buffers, size);
      return buffer;
    }
    ({ cmd, size } = yield null);
    const it2 = toUint8ArrayIterator(source)[Symbol.iterator]();
    try {
      do {
        ({ done, value: buffer } = Number.isNaN(size - bufferLength) ? it2.next() : it2.next(size - bufferLength));
        if (!done && buffer.byteLength > 0) {
          buffers.push(buffer);
          bufferLength += buffer.byteLength;
        }
        if (done || size <= bufferLength) {
          do {
            ({ cmd, size } = yield byteRange());
          } while (size < bufferLength);
        }
      } while (!done);
    } catch (e) {
      (threw = true) && typeof it2.throw === "function" && it2.throw(e);
    } finally {
      threw === false && typeof it2.return === "function" && it2.return(null);
    }
    return null;
  }
  function fromAsyncIterable(source) {
    return __asyncGenerator(this, arguments, function* fromAsyncIterable_1() {
      let done, threw = false;
      let buffers = [], buffer;
      let cmd, size, bufferLength = 0;
      function byteRange() {
        if (cmd === "peek") {
          return joinUint8Arrays(buffers, size)[0];
        }
        [buffer, buffers, bufferLength] = joinUint8Arrays(buffers, size);
        return buffer;
      }
      ({ cmd, size } = yield yield __await(null));
      const it2 = toUint8ArrayAsyncIterator(source)[Symbol.asyncIterator]();
      try {
        do {
          ({ done, value: buffer } = Number.isNaN(size - bufferLength) ? yield __await(it2.next()) : yield __await(it2.next(size - bufferLength)));
          if (!done && buffer.byteLength > 0) {
            buffers.push(buffer);
            bufferLength += buffer.byteLength;
          }
          if (done || size <= bufferLength) {
            do {
              ({ cmd, size } = yield yield __await(byteRange()));
            } while (size < bufferLength);
          }
        } while (!done);
      } catch (e) {
        (threw = true) && typeof it2.throw === "function" && (yield __await(it2.throw(e)));
      } finally {
        threw === false && typeof it2.return === "function" && (yield __await(it2.return(new Uint8Array(0))));
      }
      return yield __await(null);
    });
  }
  function fromDOMStream(source) {
    return __asyncGenerator(this, arguments, function* fromDOMStream_1() {
      let done = false, threw = false;
      let buffers = [], buffer;
      let cmd, size, bufferLength = 0;
      function byteRange() {
        if (cmd === "peek") {
          return joinUint8Arrays(buffers, size)[0];
        }
        [buffer, buffers, bufferLength] = joinUint8Arrays(buffers, size);
        return buffer;
      }
      ({ cmd, size } = yield yield __await(null));
      const it2 = new AdaptiveByteReader(source);
      try {
        do {
          ({ done, value: buffer } = Number.isNaN(size - bufferLength) ? yield __await(it2["read"]()) : yield __await(it2["read"](size - bufferLength)));
          if (!done && buffer.byteLength > 0) {
            buffers.push(toUint8Array(buffer));
            bufferLength += buffer.byteLength;
          }
          if (done || size <= bufferLength) {
            do {
              ({ cmd, size } = yield yield __await(byteRange()));
            } while (size < bufferLength);
          }
        } while (!done);
      } catch (e) {
        (threw = true) && (yield __await(it2["cancel"](e)));
      } finally {
        threw === false ? yield __await(it2["cancel"]()) : source["locked"] && it2.releaseLock();
      }
      return yield __await(null);
    });
  }
  var AdaptiveByteReader = class {
    constructor(source) {
      this.source = source;
      this.reader = null;
      this.reader = this.source["getReader"]();
      this.reader["closed"].catch(() => {
      });
    }
    get closed() {
      return this.reader ? this.reader["closed"].catch(() => {
      }) : Promise.resolve();
    }
    releaseLock() {
      if (this.reader) {
        this.reader.releaseLock();
      }
      this.reader = null;
    }
    cancel(reason) {
      return __awaiter(this, void 0, void 0, function* () {
        const { reader, source } = this;
        reader && (yield reader["cancel"](reason).catch(() => {
        }));
        source && (source["locked"] && this.releaseLock());
      });
    }
    read(size) {
      return __awaiter(this, void 0, void 0, function* () {
        if (size === 0) {
          return { done: this.reader == null, value: new Uint8Array(0) };
        }
        const result = yield this.reader.read();
        !result.done && (result.value = toUint8Array(result));
        return result;
      });
    }
  };
  var onEvent = (stream, event) => {
    const handler = (_) => resolve([event, _]);
    let resolve;
    return [event, handler, new Promise((r) => (resolve = r) && stream["once"](event, handler))];
  };
  function fromNodeStream(stream) {
    return __asyncGenerator(this, arguments, function* fromNodeStream_1() {
      const events = [];
      let event = "error";
      let done = false, err = null;
      let cmd, size, bufferLength = 0;
      let buffers = [], buffer;
      function byteRange() {
        if (cmd === "peek") {
          return joinUint8Arrays(buffers, size)[0];
        }
        [buffer, buffers, bufferLength] = joinUint8Arrays(buffers, size);
        return buffer;
      }
      ({ cmd, size } = yield yield __await(null));
      if (stream["isTTY"]) {
        yield yield __await(new Uint8Array(0));
        return yield __await(null);
      }
      try {
        events[0] = onEvent(stream, "end");
        events[1] = onEvent(stream, "error");
        do {
          events[2] = onEvent(stream, "readable");
          [event, err] = yield __await(Promise.race(events.map((x) => x[2])));
          if (event === "error") {
            break;
          }
          if (!(done = event === "end")) {
            if (!Number.isFinite(size - bufferLength)) {
              buffer = toUint8Array(stream["read"]());
            } else {
              buffer = toUint8Array(stream["read"](size - bufferLength));
              if (buffer.byteLength < size - bufferLength) {
                buffer = toUint8Array(stream["read"]());
              }
            }
            if (buffer.byteLength > 0) {
              buffers.push(buffer);
              bufferLength += buffer.byteLength;
            }
          }
          if (done || size <= bufferLength) {
            do {
              ({ cmd, size } = yield yield __await(byteRange()));
            } while (size < bufferLength);
          }
        } while (!done);
      } finally {
        yield __await(cleanup(events, event === "error" ? err : null));
      }
      return yield __await(null);
      function cleanup(events2, err2) {
        buffer = buffers = null;
        return new Promise((resolve, reject) => {
          for (const [evt, fn] of events2) {
            stream["off"](evt, fn);
          }
          try {
            const destroy = stream["destroy"];
            destroy && destroy.call(stream, err2);
            err2 = void 0;
          } catch (e) {
            err2 = e || err2;
          } finally {
            err2 != null ? reject(err2) : resolve();
          }
        });
      }
    });
  }

  // ../../node_modules/apache-arrow/enum.mjs
  var MetadataVersion;
  (function(MetadataVersion3) {
    MetadataVersion3[MetadataVersion3["V1"] = 0] = "V1";
    MetadataVersion3[MetadataVersion3["V2"] = 1] = "V2";
    MetadataVersion3[MetadataVersion3["V3"] = 2] = "V3";
    MetadataVersion3[MetadataVersion3["V4"] = 3] = "V4";
    MetadataVersion3[MetadataVersion3["V5"] = 4] = "V5";
  })(MetadataVersion || (MetadataVersion = {}));
  var UnionMode;
  (function(UnionMode3) {
    UnionMode3[UnionMode3["Sparse"] = 0] = "Sparse";
    UnionMode3[UnionMode3["Dense"] = 1] = "Dense";
  })(UnionMode || (UnionMode = {}));
  var Precision;
  (function(Precision3) {
    Precision3[Precision3["HALF"] = 0] = "HALF";
    Precision3[Precision3["SINGLE"] = 1] = "SINGLE";
    Precision3[Precision3["DOUBLE"] = 2] = "DOUBLE";
  })(Precision || (Precision = {}));
  var DateUnit;
  (function(DateUnit3) {
    DateUnit3[DateUnit3["DAY"] = 0] = "DAY";
    DateUnit3[DateUnit3["MILLISECOND"] = 1] = "MILLISECOND";
  })(DateUnit || (DateUnit = {}));
  var TimeUnit;
  (function(TimeUnit3) {
    TimeUnit3[TimeUnit3["SECOND"] = 0] = "SECOND";
    TimeUnit3[TimeUnit3["MILLISECOND"] = 1] = "MILLISECOND";
    TimeUnit3[TimeUnit3["MICROSECOND"] = 2] = "MICROSECOND";
    TimeUnit3[TimeUnit3["NANOSECOND"] = 3] = "NANOSECOND";
  })(TimeUnit || (TimeUnit = {}));
  var IntervalUnit;
  (function(IntervalUnit3) {
    IntervalUnit3[IntervalUnit3["YEAR_MONTH"] = 0] = "YEAR_MONTH";
    IntervalUnit3[IntervalUnit3["DAY_TIME"] = 1] = "DAY_TIME";
    IntervalUnit3[IntervalUnit3["MONTH_DAY_NANO"] = 2] = "MONTH_DAY_NANO";
  })(IntervalUnit || (IntervalUnit = {}));
  var MessageHeader;
  (function(MessageHeader3) {
    MessageHeader3[MessageHeader3["NONE"] = 0] = "NONE";
    MessageHeader3[MessageHeader3["Schema"] = 1] = "Schema";
    MessageHeader3[MessageHeader3["DictionaryBatch"] = 2] = "DictionaryBatch";
    MessageHeader3[MessageHeader3["RecordBatch"] = 3] = "RecordBatch";
    MessageHeader3[MessageHeader3["Tensor"] = 4] = "Tensor";
    MessageHeader3[MessageHeader3["SparseTensor"] = 5] = "SparseTensor";
  })(MessageHeader || (MessageHeader = {}));
  var Type;
  (function(Type3) {
    Type3[Type3["NONE"] = 0] = "NONE";
    Type3[Type3["Null"] = 1] = "Null";
    Type3[Type3["Int"] = 2] = "Int";
    Type3[Type3["Float"] = 3] = "Float";
    Type3[Type3["Binary"] = 4] = "Binary";
    Type3[Type3["Utf8"] = 5] = "Utf8";
    Type3[Type3["Bool"] = 6] = "Bool";
    Type3[Type3["Decimal"] = 7] = "Decimal";
    Type3[Type3["Date"] = 8] = "Date";
    Type3[Type3["Time"] = 9] = "Time";
    Type3[Type3["Timestamp"] = 10] = "Timestamp";
    Type3[Type3["Interval"] = 11] = "Interval";
    Type3[Type3["List"] = 12] = "List";
    Type3[Type3["Struct"] = 13] = "Struct";
    Type3[Type3["Union"] = 14] = "Union";
    Type3[Type3["FixedSizeBinary"] = 15] = "FixedSizeBinary";
    Type3[Type3["FixedSizeList"] = 16] = "FixedSizeList";
    Type3[Type3["Map"] = 17] = "Map";
    Type3[Type3["Dictionary"] = -1] = "Dictionary";
    Type3[Type3["Int8"] = -2] = "Int8";
    Type3[Type3["Int16"] = -3] = "Int16";
    Type3[Type3["Int32"] = -4] = "Int32";
    Type3[Type3["Int64"] = -5] = "Int64";
    Type3[Type3["Uint8"] = -6] = "Uint8";
    Type3[Type3["Uint16"] = -7] = "Uint16";
    Type3[Type3["Uint32"] = -8] = "Uint32";
    Type3[Type3["Uint64"] = -9] = "Uint64";
    Type3[Type3["Float16"] = -10] = "Float16";
    Type3[Type3["Float32"] = -11] = "Float32";
    Type3[Type3["Float64"] = -12] = "Float64";
    Type3[Type3["DateDay"] = -13] = "DateDay";
    Type3[Type3["DateMillisecond"] = -14] = "DateMillisecond";
    Type3[Type3["TimestampSecond"] = -15] = "TimestampSecond";
    Type3[Type3["TimestampMillisecond"] = -16] = "TimestampMillisecond";
    Type3[Type3["TimestampMicrosecond"] = -17] = "TimestampMicrosecond";
    Type3[Type3["TimestampNanosecond"] = -18] = "TimestampNanosecond";
    Type3[Type3["TimeSecond"] = -19] = "TimeSecond";
    Type3[Type3["TimeMillisecond"] = -20] = "TimeMillisecond";
    Type3[Type3["TimeMicrosecond"] = -21] = "TimeMicrosecond";
    Type3[Type3["TimeNanosecond"] = -22] = "TimeNanosecond";
    Type3[Type3["DenseUnion"] = -23] = "DenseUnion";
    Type3[Type3["SparseUnion"] = -24] = "SparseUnion";
    Type3[Type3["IntervalDayTime"] = -25] = "IntervalDayTime";
    Type3[Type3["IntervalYearMonth"] = -26] = "IntervalYearMonth";
  })(Type || (Type = {}));
  var BufferType;
  (function(BufferType2) {
    BufferType2[BufferType2["OFFSET"] = 0] = "OFFSET";
    BufferType2[BufferType2["DATA"] = 1] = "DATA";
    BufferType2[BufferType2["VALIDITY"] = 2] = "VALIDITY";
    BufferType2[BufferType2["TYPE"] = 3] = "TYPE";
  })(BufferType || (BufferType = {}));

  // ../../node_modules/apache-arrow/util/vector.mjs
  var vector_exports = {};
  __export(vector_exports, {
    clampIndex: () => clampIndex,
    clampRange: () => clampRange,
    createElementComparator: () => createElementComparator
  });

  // ../../node_modules/apache-arrow/util/pretty.mjs
  var undf = void 0;
  function valueToString(x) {
    if (x === null) {
      return "null";
    }
    if (x === undf) {
      return "undefined";
    }
    switch (typeof x) {
      case "number":
        return `${x}`;
      case "bigint":
        return `${x}`;
      case "string":
        return `"${x}"`;
    }
    if (typeof x[Symbol.toPrimitive] === "function") {
      return x[Symbol.toPrimitive]("string");
    }
    if (ArrayBuffer.isView(x)) {
      if (x instanceof BigInt64Array || x instanceof BigUint64Array) {
        return `[${[...x].map((x2) => valueToString(x2))}]`;
      }
      return `[${x}]`;
    }
    return ArrayBuffer.isView(x) ? `[${x}]` : JSON.stringify(x, (_, y) => typeof y === "bigint" ? `${y}` : y);
  }

  // ../../node_modules/apache-arrow/util/bn.mjs
  var bn_exports = {};
  __export(bn_exports, {
    BN: () => BN,
    bigNumToBigInt: () => bigNumToBigInt,
    bigNumToString: () => bigNumToString,
    isArrowBigNumSymbol: () => isArrowBigNumSymbol
  });
  var isArrowBigNumSymbol = Symbol.for("isArrowBigNum");
  function BigNum(x, ...xs) {
    if (xs.length === 0) {
      return Object.setPrototypeOf(toArrayBufferView(this["TypedArray"], x), this.constructor.prototype);
    }
    return Object.setPrototypeOf(new this["TypedArray"](x, ...xs), this.constructor.prototype);
  }
  BigNum.prototype[isArrowBigNumSymbol] = true;
  BigNum.prototype.toJSON = function() {
    return `"${bigNumToString(this)}"`;
  };
  BigNum.prototype.valueOf = function() {
    return bigNumToNumber(this);
  };
  BigNum.prototype.toString = function() {
    return bigNumToString(this);
  };
  BigNum.prototype[Symbol.toPrimitive] = function(hint = "default") {
    switch (hint) {
      case "number":
        return bigNumToNumber(this);
      case "string":
        return bigNumToString(this);
      case "default":
        return bigNumToBigInt(this);
    }
    return bigNumToString(this);
  };
  function SignedBigNum(...args) {
    return BigNum.apply(this, args);
  }
  function UnsignedBigNum(...args) {
    return BigNum.apply(this, args);
  }
  function DecimalBigNum(...args) {
    return BigNum.apply(this, args);
  }
  Object.setPrototypeOf(SignedBigNum.prototype, Object.create(Int32Array.prototype));
  Object.setPrototypeOf(UnsignedBigNum.prototype, Object.create(Uint32Array.prototype));
  Object.setPrototypeOf(DecimalBigNum.prototype, Object.create(Uint32Array.prototype));
  Object.assign(SignedBigNum.prototype, BigNum.prototype, { "constructor": SignedBigNum, "signed": true, "TypedArray": Int32Array, "BigIntArray": BigInt64Array });
  Object.assign(UnsignedBigNum.prototype, BigNum.prototype, { "constructor": UnsignedBigNum, "signed": false, "TypedArray": Uint32Array, "BigIntArray": BigUint64Array });
  Object.assign(DecimalBigNum.prototype, BigNum.prototype, { "constructor": DecimalBigNum, "signed": true, "TypedArray": Uint32Array, "BigIntArray": BigUint64Array });
  function bigNumToNumber(bn) {
    const { buffer, byteOffset, length, "signed": signed } = bn;
    const words = new BigUint64Array(buffer, byteOffset, length);
    const negative = signed && words.at(-1) & BigInt(1) << BigInt(63);
    let number = negative ? BigInt(1) : BigInt(0);
    let i = BigInt(0);
    if (!negative) {
      for (const word of words) {
        number += word * (BigInt(1) << BigInt(32) * i++);
      }
    } else {
      for (const word of words) {
        number += ~word * (BigInt(1) << BigInt(32) * i++);
      }
      number *= BigInt(-1);
    }
    return number;
  }
  var bigNumToString = (a) => {
    if (a.byteLength === 8) {
      const bigIntArray = new a["BigIntArray"](a.buffer, a.byteOffset, 1);
      return `${bigIntArray[0]}`;
    }
    if (!a["signed"]) {
      return unsignedBigNumToString(a);
    }
    let array = new Uint16Array(a.buffer, a.byteOffset, a.byteLength / 2);
    const highOrderWord = new Int16Array([array.at(-1)])[0];
    if (highOrderWord >= 0) {
      return unsignedBigNumToString(a);
    }
    array = array.slice();
    let carry = 1;
    for (let i = 0; i < array.length; i++) {
      const elem = array[i];
      const updated = ~elem + carry;
      array[i] = updated;
      carry &= elem === 0 ? 1 : 0;
    }
    const negated = unsignedBigNumToString(array);
    return `-${negated}`;
  };
  var bigNumToBigInt = (a) => {
    if (a.byteLength === 8) {
      const bigIntArray = new a["BigIntArray"](a.buffer, a.byteOffset, 1);
      return bigIntArray[0];
    } else {
      return bigNumToString(a);
    }
  };
  function unsignedBigNumToString(a) {
    let digits = "";
    const base64 = new Uint32Array(2);
    let base32 = new Uint16Array(a.buffer, a.byteOffset, a.byteLength / 2);
    const checks = new Uint32Array((base32 = new Uint16Array(base32).reverse()).buffer);
    let i = -1;
    const n = base32.length - 1;
    do {
      for (base64[0] = base32[i = 0]; i < n; ) {
        base32[i++] = base64[1] = base64[0] / 10;
        base64[0] = (base64[0] - base64[1] * 10 << 16) + base32[i];
      }
      base32[i] = base64[1] = base64[0] / 10;
      base64[0] = base64[0] - base64[1] * 10;
      digits = `${base64[0]}${digits}`;
    } while (checks[0] || checks[1] || checks[2] || checks[3]);
    return digits !== null && digits !== void 0 ? digits : `0`;
  }
  var BN = class _BN {
    /** @nocollapse */
    static new(num, isSigned) {
      switch (isSigned) {
        case true:
          return new SignedBigNum(num);
        case false:
          return new UnsignedBigNum(num);
      }
      switch (num.constructor) {
        case Int8Array:
        case Int16Array:
        case Int32Array:
        case BigInt64Array:
          return new SignedBigNum(num);
      }
      if (num.byteLength === 16) {
        return new DecimalBigNum(num);
      }
      return new UnsignedBigNum(num);
    }
    /** @nocollapse */
    static signed(num) {
      return new SignedBigNum(num);
    }
    /** @nocollapse */
    static unsigned(num) {
      return new UnsignedBigNum(num);
    }
    /** @nocollapse */
    static decimal(num) {
      return new DecimalBigNum(num);
    }
    constructor(num, isSigned) {
      return _BN.new(num, isSigned);
    }
  };

  // ../../node_modules/apache-arrow/util/bigint.mjs
  function bigIntToNumber(number) {
    if (typeof number === "bigint" && (number < Number.MIN_SAFE_INTEGER || number > Number.MAX_SAFE_INTEGER)) {
      throw new TypeError(`${number} is not safe to convert to a number.`);
    }
    return Number(number);
  }

  // ../../node_modules/apache-arrow/type.mjs
  var _a;
  var _b;
  var _c;
  var _d;
  var _e;
  var _f;
  var _g;
  var _h;
  var _j;
  var _k;
  var _l;
  var _m;
  var _o;
  var _p;
  var _q;
  var _r;
  var _s;
  var _t;
  var _u;
  var DataType = class _DataType {
    /** @nocollapse */
    static isNull(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Null;
    }
    /** @nocollapse */
    static isInt(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Int;
    }
    /** @nocollapse */
    static isFloat(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Float;
    }
    /** @nocollapse */
    static isBinary(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Binary;
    }
    /** @nocollapse */
    static isUtf8(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Utf8;
    }
    /** @nocollapse */
    static isBool(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Bool;
    }
    /** @nocollapse */
    static isDecimal(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Decimal;
    }
    /** @nocollapse */
    static isDate(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Date;
    }
    /** @nocollapse */
    static isTime(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Time;
    }
    /** @nocollapse */
    static isTimestamp(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Timestamp;
    }
    /** @nocollapse */
    static isInterval(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Interval;
    }
    /** @nocollapse */
    static isList(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.List;
    }
    /** @nocollapse */
    static isStruct(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Struct;
    }
    /** @nocollapse */
    static isUnion(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Union;
    }
    /** @nocollapse */
    static isFixedSizeBinary(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.FixedSizeBinary;
    }
    /** @nocollapse */
    static isFixedSizeList(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.FixedSizeList;
    }
    /** @nocollapse */
    static isMap(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Map;
    }
    /** @nocollapse */
    static isDictionary(x) {
      return (x === null || x === void 0 ? void 0 : x.typeId) === Type.Dictionary;
    }
    /** @nocollapse */
    static isDenseUnion(x) {
      return _DataType.isUnion(x) && x.mode === UnionMode.Dense;
    }
    /** @nocollapse */
    static isSparseUnion(x) {
      return _DataType.isUnion(x) && x.mode === UnionMode.Sparse;
    }
    get typeId() {
      return Type.NONE;
    }
  };
  _a = Symbol.toStringTag;
  DataType[_a] = ((proto) => {
    proto.children = null;
    proto.ArrayType = Array;
    return proto[Symbol.toStringTag] = "DataType";
  })(DataType.prototype);
  var Null = class extends DataType {
    toString() {
      return `Null`;
    }
    get typeId() {
      return Type.Null;
    }
  };
  _b = Symbol.toStringTag;
  Null[_b] = ((proto) => proto[Symbol.toStringTag] = "Null")(Null.prototype);
  var Int_ = class extends DataType {
    constructor(isSigned, bitWidth) {
      super();
      this.isSigned = isSigned;
      this.bitWidth = bitWidth;
    }
    get typeId() {
      return Type.Int;
    }
    get ArrayType() {
      switch (this.bitWidth) {
        case 8:
          return this.isSigned ? Int8Array : Uint8Array;
        case 16:
          return this.isSigned ? Int16Array : Uint16Array;
        case 32:
          return this.isSigned ? Int32Array : Uint32Array;
        case 64:
          return this.isSigned ? BigInt64Array : BigUint64Array;
      }
      throw new Error(`Unrecognized ${this[Symbol.toStringTag]} type`);
    }
    toString() {
      return `${this.isSigned ? `I` : `Ui`}nt${this.bitWidth}`;
    }
  };
  _c = Symbol.toStringTag;
  Int_[_c] = ((proto) => {
    proto.isSigned = null;
    proto.bitWidth = null;
    return proto[Symbol.toStringTag] = "Int";
  })(Int_.prototype);
  var Int8 = class extends Int_ {
    constructor() {
      super(true, 8);
    }
    get ArrayType() {
      return Int8Array;
    }
  };
  var Int16 = class extends Int_ {
    constructor() {
      super(true, 16);
    }
    get ArrayType() {
      return Int16Array;
    }
  };
  var Int32 = class extends Int_ {
    constructor() {
      super(true, 32);
    }
    get ArrayType() {
      return Int32Array;
    }
  };
  var Int64 = class extends Int_ {
    constructor() {
      super(true, 64);
    }
    get ArrayType() {
      return BigInt64Array;
    }
  };
  var Uint8 = class extends Int_ {
    constructor() {
      super(false, 8);
    }
    get ArrayType() {
      return Uint8Array;
    }
  };
  var Uint16 = class extends Int_ {
    constructor() {
      super(false, 16);
    }
    get ArrayType() {
      return Uint16Array;
    }
  };
  var Uint32 = class extends Int_ {
    constructor() {
      super(false, 32);
    }
    get ArrayType() {
      return Uint32Array;
    }
  };
  var Uint64 = class extends Int_ {
    constructor() {
      super(false, 64);
    }
    get ArrayType() {
      return BigUint64Array;
    }
  };
  Object.defineProperty(Int8.prototype, "ArrayType", { value: Int8Array });
  Object.defineProperty(Int16.prototype, "ArrayType", { value: Int16Array });
  Object.defineProperty(Int32.prototype, "ArrayType", { value: Int32Array });
  Object.defineProperty(Int64.prototype, "ArrayType", { value: BigInt64Array });
  Object.defineProperty(Uint8.prototype, "ArrayType", { value: Uint8Array });
  Object.defineProperty(Uint16.prototype, "ArrayType", { value: Uint16Array });
  Object.defineProperty(Uint32.prototype, "ArrayType", { value: Uint32Array });
  Object.defineProperty(Uint64.prototype, "ArrayType", { value: BigUint64Array });
  var Float = class extends DataType {
    constructor(precision) {
      super();
      this.precision = precision;
    }
    get typeId() {
      return Type.Float;
    }
    get ArrayType() {
      switch (this.precision) {
        case Precision.HALF:
          return Uint16Array;
        case Precision.SINGLE:
          return Float32Array;
        case Precision.DOUBLE:
          return Float64Array;
      }
      throw new Error(`Unrecognized ${this[Symbol.toStringTag]} type`);
    }
    toString() {
      return `Float${this.precision << 5 || 16}`;
    }
  };
  _d = Symbol.toStringTag;
  Float[_d] = ((proto) => {
    proto.precision = null;
    return proto[Symbol.toStringTag] = "Float";
  })(Float.prototype);
  var Float16 = class extends Float {
    constructor() {
      super(Precision.HALF);
    }
  };
  var Float32 = class extends Float {
    constructor() {
      super(Precision.SINGLE);
    }
  };
  var Float64 = class extends Float {
    constructor() {
      super(Precision.DOUBLE);
    }
  };
  Object.defineProperty(Float16.prototype, "ArrayType", { value: Uint16Array });
  Object.defineProperty(Float32.prototype, "ArrayType", { value: Float32Array });
  Object.defineProperty(Float64.prototype, "ArrayType", { value: Float64Array });
  var Binary = class extends DataType {
    constructor() {
      super();
    }
    get typeId() {
      return Type.Binary;
    }
    toString() {
      return `Binary`;
    }
  };
  _e = Symbol.toStringTag;
  Binary[_e] = ((proto) => {
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = "Binary";
  })(Binary.prototype);
  var Utf8 = class extends DataType {
    constructor() {
      super();
    }
    get typeId() {
      return Type.Utf8;
    }
    toString() {
      return `Utf8`;
    }
  };
  _f = Symbol.toStringTag;
  Utf8[_f] = ((proto) => {
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = "Utf8";
  })(Utf8.prototype);
  var Bool = class extends DataType {
    constructor() {
      super();
    }
    get typeId() {
      return Type.Bool;
    }
    toString() {
      return `Bool`;
    }
  };
  _g = Symbol.toStringTag;
  Bool[_g] = ((proto) => {
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = "Bool";
  })(Bool.prototype);
  var Decimal = class extends DataType {
    constructor(scale, precision, bitWidth = 128) {
      super();
      this.scale = scale;
      this.precision = precision;
      this.bitWidth = bitWidth;
    }
    get typeId() {
      return Type.Decimal;
    }
    toString() {
      return `Decimal[${this.precision}e${this.scale > 0 ? `+` : ``}${this.scale}]`;
    }
  };
  _h = Symbol.toStringTag;
  Decimal[_h] = ((proto) => {
    proto.scale = null;
    proto.precision = null;
    proto.ArrayType = Uint32Array;
    return proto[Symbol.toStringTag] = "Decimal";
  })(Decimal.prototype);
  var Date_ = class extends DataType {
    constructor(unit) {
      super();
      this.unit = unit;
    }
    get typeId() {
      return Type.Date;
    }
    toString() {
      return `Date${(this.unit + 1) * 32}<${DateUnit[this.unit]}>`;
    }
  };
  _j = Symbol.toStringTag;
  Date_[_j] = ((proto) => {
    proto.unit = null;
    proto.ArrayType = Int32Array;
    return proto[Symbol.toStringTag] = "Date";
  })(Date_.prototype);
  var DateDay = class extends Date_ {
    constructor() {
      super(DateUnit.DAY);
    }
  };
  var DateMillisecond = class extends Date_ {
    constructor() {
      super(DateUnit.MILLISECOND);
    }
  };
  var Time_ = class extends DataType {
    constructor(unit, bitWidth) {
      super();
      this.unit = unit;
      this.bitWidth = bitWidth;
    }
    get typeId() {
      return Type.Time;
    }
    toString() {
      return `Time${this.bitWidth}<${TimeUnit[this.unit]}>`;
    }
    get ArrayType() {
      switch (this.bitWidth) {
        case 32:
          return Int32Array;
        case 64:
          return BigInt64Array;
      }
      throw new Error(`Unrecognized ${this[Symbol.toStringTag]} type`);
    }
  };
  _k = Symbol.toStringTag;
  Time_[_k] = ((proto) => {
    proto.unit = null;
    proto.bitWidth = null;
    return proto[Symbol.toStringTag] = "Time";
  })(Time_.prototype);
  var Timestamp_ = class extends DataType {
    constructor(unit, timezone) {
      super();
      this.unit = unit;
      this.timezone = timezone;
    }
    get typeId() {
      return Type.Timestamp;
    }
    toString() {
      return `Timestamp<${TimeUnit[this.unit]}${this.timezone ? `, ${this.timezone}` : ``}>`;
    }
  };
  _l = Symbol.toStringTag;
  Timestamp_[_l] = ((proto) => {
    proto.unit = null;
    proto.timezone = null;
    proto.ArrayType = Int32Array;
    return proto[Symbol.toStringTag] = "Timestamp";
  })(Timestamp_.prototype);
  var TimestampSecond = class extends Timestamp_ {
    constructor(timezone) {
      super(TimeUnit.SECOND, timezone);
    }
  };
  var Interval_ = class extends DataType {
    constructor(unit) {
      super();
      this.unit = unit;
    }
    get typeId() {
      return Type.Interval;
    }
    toString() {
      return `Interval<${IntervalUnit[this.unit]}>`;
    }
  };
  _m = Symbol.toStringTag;
  Interval_[_m] = ((proto) => {
    proto.unit = null;
    proto.ArrayType = Int32Array;
    return proto[Symbol.toStringTag] = "Interval";
  })(Interval_.prototype);
  var List = class extends DataType {
    constructor(child) {
      super();
      this.children = [child];
    }
    get typeId() {
      return Type.List;
    }
    toString() {
      return `List<${this.valueType}>`;
    }
    get valueType() {
      return this.children[0].type;
    }
    get valueField() {
      return this.children[0];
    }
    get ArrayType() {
      return this.valueType.ArrayType;
    }
  };
  _o = Symbol.toStringTag;
  List[_o] = ((proto) => {
    proto.children = null;
    return proto[Symbol.toStringTag] = "List";
  })(List.prototype);
  var Struct = class extends DataType {
    constructor(children) {
      super();
      this.children = children;
    }
    get typeId() {
      return Type.Struct;
    }
    toString() {
      return `Struct<{${this.children.map((f) => `${f.name}:${f.type}`).join(`, `)}}>`;
    }
  };
  _p = Symbol.toStringTag;
  Struct[_p] = ((proto) => {
    proto.children = null;
    return proto[Symbol.toStringTag] = "Struct";
  })(Struct.prototype);
  var Union_ = class extends DataType {
    constructor(mode, typeIds, children) {
      super();
      this.mode = mode;
      this.children = children;
      this.typeIds = typeIds = Int32Array.from(typeIds);
      this.typeIdToChildIndex = typeIds.reduce((typeIdToChildIndex, typeId, idx) => (typeIdToChildIndex[typeId] = idx) && typeIdToChildIndex || typeIdToChildIndex, /* @__PURE__ */ Object.create(null));
    }
    get typeId() {
      return Type.Union;
    }
    toString() {
      return `${this[Symbol.toStringTag]}<${this.children.map((x) => `${x.type}`).join(` | `)}>`;
    }
  };
  _q = Symbol.toStringTag;
  Union_[_q] = ((proto) => {
    proto.mode = null;
    proto.typeIds = null;
    proto.children = null;
    proto.typeIdToChildIndex = null;
    proto.ArrayType = Int8Array;
    return proto[Symbol.toStringTag] = "Union";
  })(Union_.prototype);
  var FixedSizeBinary = class extends DataType {
    constructor(byteWidth) {
      super();
      this.byteWidth = byteWidth;
    }
    get typeId() {
      return Type.FixedSizeBinary;
    }
    toString() {
      return `FixedSizeBinary[${this.byteWidth}]`;
    }
  };
  _r = Symbol.toStringTag;
  FixedSizeBinary[_r] = ((proto) => {
    proto.byteWidth = null;
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = "FixedSizeBinary";
  })(FixedSizeBinary.prototype);
  var FixedSizeList = class extends DataType {
    constructor(listSize, child) {
      super();
      this.listSize = listSize;
      this.children = [child];
    }
    get typeId() {
      return Type.FixedSizeList;
    }
    get valueType() {
      return this.children[0].type;
    }
    get valueField() {
      return this.children[0];
    }
    get ArrayType() {
      return this.valueType.ArrayType;
    }
    toString() {
      return `FixedSizeList[${this.listSize}]<${this.valueType}>`;
    }
  };
  _s = Symbol.toStringTag;
  FixedSizeList[_s] = ((proto) => {
    proto.children = null;
    proto.listSize = null;
    return proto[Symbol.toStringTag] = "FixedSizeList";
  })(FixedSizeList.prototype);
  var Map_ = class extends DataType {
    constructor(child, keysSorted = false) {
      super();
      this.children = [child];
      this.keysSorted = keysSorted;
    }
    get typeId() {
      return Type.Map;
    }
    get keyType() {
      return this.children[0].type.children[0].type;
    }
    get valueType() {
      return this.children[0].type.children[1].type;
    }
    get childType() {
      return this.children[0].type;
    }
    toString() {
      return `Map<{${this.children[0].type.children.map((f) => `${f.name}:${f.type}`).join(`, `)}}>`;
    }
  };
  _t = Symbol.toStringTag;
  Map_[_t] = ((proto) => {
    proto.children = null;
    proto.keysSorted = null;
    return proto[Symbol.toStringTag] = "Map_";
  })(Map_.prototype);
  var getId = ((atomicDictionaryId) => () => ++atomicDictionaryId)(-1);
  var Dictionary = class extends DataType {
    constructor(dictionary, indices, id, isOrdered) {
      super();
      this.indices = indices;
      this.dictionary = dictionary;
      this.isOrdered = isOrdered || false;
      this.id = id == null ? getId() : bigIntToNumber(id);
    }
    get typeId() {
      return Type.Dictionary;
    }
    get children() {
      return this.dictionary.children;
    }
    get valueType() {
      return this.dictionary;
    }
    get ArrayType() {
      return this.dictionary.ArrayType;
    }
    toString() {
      return `Dictionary<${this.indices}, ${this.dictionary}>`;
    }
  };
  _u = Symbol.toStringTag;
  Dictionary[_u] = ((proto) => {
    proto.id = null;
    proto.indices = null;
    proto.isOrdered = null;
    proto.dictionary = null;
    return proto[Symbol.toStringTag] = "Dictionary";
  })(Dictionary.prototype);
  function strideForType(type) {
    const t = type;
    switch (type.typeId) {
      case Type.Decimal:
        return type.bitWidth / 32;
      case Type.Timestamp:
        return 2;
      case Type.Date:
        return 1 + t.unit;
      case Type.Interval:
        return 1 + t.unit;
      case Type.FixedSizeList:
        return t.listSize;
      case Type.FixedSizeBinary:
        return t.byteWidth;
      default:
        return 1;
    }
  }

  // ../../node_modules/apache-arrow/visitor.mjs
  var Visitor = class {
    visitMany(nodes, ...args) {
      return nodes.map((node, i) => this.visit(node, ...args.map((x) => x[i])));
    }
    visit(...args) {
      return this.getVisitFn(args[0], false).apply(this, args);
    }
    getVisitFn(node, throwIfNotFound = true) {
      return getVisitFn(this, node, throwIfNotFound);
    }
    getVisitFnByTypeId(typeId, throwIfNotFound = true) {
      return getVisitFnByTypeId(this, typeId, throwIfNotFound);
    }
    visitNull(_node, ..._args) {
      return null;
    }
    visitBool(_node, ..._args) {
      return null;
    }
    visitInt(_node, ..._args) {
      return null;
    }
    visitFloat(_node, ..._args) {
      return null;
    }
    visitUtf8(_node, ..._args) {
      return null;
    }
    visitBinary(_node, ..._args) {
      return null;
    }
    visitFixedSizeBinary(_node, ..._args) {
      return null;
    }
    visitDate(_node, ..._args) {
      return null;
    }
    visitTimestamp(_node, ..._args) {
      return null;
    }
    visitTime(_node, ..._args) {
      return null;
    }
    visitDecimal(_node, ..._args) {
      return null;
    }
    visitList(_node, ..._args) {
      return null;
    }
    visitStruct(_node, ..._args) {
      return null;
    }
    visitUnion(_node, ..._args) {
      return null;
    }
    visitDictionary(_node, ..._args) {
      return null;
    }
    visitInterval(_node, ..._args) {
      return null;
    }
    visitFixedSizeList(_node, ..._args) {
      return null;
    }
    visitMap(_node, ..._args) {
      return null;
    }
  };
  function getVisitFn(visitor, node, throwIfNotFound = true) {
    if (typeof node === "number") {
      return getVisitFnByTypeId(visitor, node, throwIfNotFound);
    }
    if (typeof node === "string" && node in Type) {
      return getVisitFnByTypeId(visitor, Type[node], throwIfNotFound);
    }
    if (node && node instanceof DataType) {
      return getVisitFnByTypeId(visitor, inferDType(node), throwIfNotFound);
    }
    if ((node === null || node === void 0 ? void 0 : node.type) && node.type instanceof DataType) {
      return getVisitFnByTypeId(visitor, inferDType(node.type), throwIfNotFound);
    }
    return getVisitFnByTypeId(visitor, Type.NONE, throwIfNotFound);
  }
  function getVisitFnByTypeId(visitor, dtype, throwIfNotFound = true) {
    let fn = null;
    switch (dtype) {
      case Type.Null:
        fn = visitor.visitNull;
        break;
      case Type.Bool:
        fn = visitor.visitBool;
        break;
      case Type.Int:
        fn = visitor.visitInt;
        break;
      case Type.Int8:
        fn = visitor.visitInt8 || visitor.visitInt;
        break;
      case Type.Int16:
        fn = visitor.visitInt16 || visitor.visitInt;
        break;
      case Type.Int32:
        fn = visitor.visitInt32 || visitor.visitInt;
        break;
      case Type.Int64:
        fn = visitor.visitInt64 || visitor.visitInt;
        break;
      case Type.Uint8:
        fn = visitor.visitUint8 || visitor.visitInt;
        break;
      case Type.Uint16:
        fn = visitor.visitUint16 || visitor.visitInt;
        break;
      case Type.Uint32:
        fn = visitor.visitUint32 || visitor.visitInt;
        break;
      case Type.Uint64:
        fn = visitor.visitUint64 || visitor.visitInt;
        break;
      case Type.Float:
        fn = visitor.visitFloat;
        break;
      case Type.Float16:
        fn = visitor.visitFloat16 || visitor.visitFloat;
        break;
      case Type.Float32:
        fn = visitor.visitFloat32 || visitor.visitFloat;
        break;
      case Type.Float64:
        fn = visitor.visitFloat64 || visitor.visitFloat;
        break;
      case Type.Utf8:
        fn = visitor.visitUtf8;
        break;
      case Type.Binary:
        fn = visitor.visitBinary;
        break;
      case Type.FixedSizeBinary:
        fn = visitor.visitFixedSizeBinary;
        break;
      case Type.Date:
        fn = visitor.visitDate;
        break;
      case Type.DateDay:
        fn = visitor.visitDateDay || visitor.visitDate;
        break;
      case Type.DateMillisecond:
        fn = visitor.visitDateMillisecond || visitor.visitDate;
        break;
      case Type.Timestamp:
        fn = visitor.visitTimestamp;
        break;
      case Type.TimestampSecond:
        fn = visitor.visitTimestampSecond || visitor.visitTimestamp;
        break;
      case Type.TimestampMillisecond:
        fn = visitor.visitTimestampMillisecond || visitor.visitTimestamp;
        break;
      case Type.TimestampMicrosecond:
        fn = visitor.visitTimestampMicrosecond || visitor.visitTimestamp;
        break;
      case Type.TimestampNanosecond:
        fn = visitor.visitTimestampNanosecond || visitor.visitTimestamp;
        break;
      case Type.Time:
        fn = visitor.visitTime;
        break;
      case Type.TimeSecond:
        fn = visitor.visitTimeSecond || visitor.visitTime;
        break;
      case Type.TimeMillisecond:
        fn = visitor.visitTimeMillisecond || visitor.visitTime;
        break;
      case Type.TimeMicrosecond:
        fn = visitor.visitTimeMicrosecond || visitor.visitTime;
        break;
      case Type.TimeNanosecond:
        fn = visitor.visitTimeNanosecond || visitor.visitTime;
        break;
      case Type.Decimal:
        fn = visitor.visitDecimal;
        break;
      case Type.List:
        fn = visitor.visitList;
        break;
      case Type.Struct:
        fn = visitor.visitStruct;
        break;
      case Type.Union:
        fn = visitor.visitUnion;
        break;
      case Type.DenseUnion:
        fn = visitor.visitDenseUnion || visitor.visitUnion;
        break;
      case Type.SparseUnion:
        fn = visitor.visitSparseUnion || visitor.visitUnion;
        break;
      case Type.Dictionary:
        fn = visitor.visitDictionary;
        break;
      case Type.Interval:
        fn = visitor.visitInterval;
        break;
      case Type.IntervalDayTime:
        fn = visitor.visitIntervalDayTime || visitor.visitInterval;
        break;
      case Type.IntervalYearMonth:
        fn = visitor.visitIntervalYearMonth || visitor.visitInterval;
        break;
      case Type.FixedSizeList:
        fn = visitor.visitFixedSizeList;
        break;
      case Type.Map:
        fn = visitor.visitMap;
        break;
    }
    if (typeof fn === "function")
      return fn;
    if (!throwIfNotFound)
      return () => null;
    throw new Error(`Unrecognized type '${Type[dtype]}'`);
  }
  function inferDType(type) {
    switch (type.typeId) {
      case Type.Null:
        return Type.Null;
      case Type.Int: {
        const { bitWidth, isSigned } = type;
        switch (bitWidth) {
          case 8:
            return isSigned ? Type.Int8 : Type.Uint8;
          case 16:
            return isSigned ? Type.Int16 : Type.Uint16;
          case 32:
            return isSigned ? Type.Int32 : Type.Uint32;
          case 64:
            return isSigned ? Type.Int64 : Type.Uint64;
        }
        return Type.Int;
      }
      case Type.Float:
        switch (type.precision) {
          case Precision.HALF:
            return Type.Float16;
          case Precision.SINGLE:
            return Type.Float32;
          case Precision.DOUBLE:
            return Type.Float64;
        }
        return Type.Float;
      case Type.Binary:
        return Type.Binary;
      case Type.Utf8:
        return Type.Utf8;
      case Type.Bool:
        return Type.Bool;
      case Type.Decimal:
        return Type.Decimal;
      case Type.Time:
        switch (type.unit) {
          case TimeUnit.SECOND:
            return Type.TimeSecond;
          case TimeUnit.MILLISECOND:
            return Type.TimeMillisecond;
          case TimeUnit.MICROSECOND:
            return Type.TimeMicrosecond;
          case TimeUnit.NANOSECOND:
            return Type.TimeNanosecond;
        }
        return Type.Time;
      case Type.Timestamp:
        switch (type.unit) {
          case TimeUnit.SECOND:
            return Type.TimestampSecond;
          case TimeUnit.MILLISECOND:
            return Type.TimestampMillisecond;
          case TimeUnit.MICROSECOND:
            return Type.TimestampMicrosecond;
          case TimeUnit.NANOSECOND:
            return Type.TimestampNanosecond;
        }
        return Type.Timestamp;
      case Type.Date:
        switch (type.unit) {
          case DateUnit.DAY:
            return Type.DateDay;
          case DateUnit.MILLISECOND:
            return Type.DateMillisecond;
        }
        return Type.Date;
      case Type.Interval:
        switch (type.unit) {
          case IntervalUnit.DAY_TIME:
            return Type.IntervalDayTime;
          case IntervalUnit.YEAR_MONTH:
            return Type.IntervalYearMonth;
        }
        return Type.Interval;
      case Type.Map:
        return Type.Map;
      case Type.List:
        return Type.List;
      case Type.Struct:
        return Type.Struct;
      case Type.Union:
        switch (type.mode) {
          case UnionMode.Dense:
            return Type.DenseUnion;
          case UnionMode.Sparse:
            return Type.SparseUnion;
        }
        return Type.Union;
      case Type.FixedSizeBinary:
        return Type.FixedSizeBinary;
      case Type.FixedSizeList:
        return Type.FixedSizeList;
      case Type.Dictionary:
        return Type.Dictionary;
    }
    throw new Error(`Unrecognized type '${Type[type.typeId]}'`);
  }
  Visitor.prototype.visitInt8 = null;
  Visitor.prototype.visitInt16 = null;
  Visitor.prototype.visitInt32 = null;
  Visitor.prototype.visitInt64 = null;
  Visitor.prototype.visitUint8 = null;
  Visitor.prototype.visitUint16 = null;
  Visitor.prototype.visitUint32 = null;
  Visitor.prototype.visitUint64 = null;
  Visitor.prototype.visitFloat16 = null;
  Visitor.prototype.visitFloat32 = null;
  Visitor.prototype.visitFloat64 = null;
  Visitor.prototype.visitDateDay = null;
  Visitor.prototype.visitDateMillisecond = null;
  Visitor.prototype.visitTimestampSecond = null;
  Visitor.prototype.visitTimestampMillisecond = null;
  Visitor.prototype.visitTimestampMicrosecond = null;
  Visitor.prototype.visitTimestampNanosecond = null;
  Visitor.prototype.visitTimeSecond = null;
  Visitor.prototype.visitTimeMillisecond = null;
  Visitor.prototype.visitTimeMicrosecond = null;
  Visitor.prototype.visitTimeNanosecond = null;
  Visitor.prototype.visitDenseUnion = null;
  Visitor.prototype.visitSparseUnion = null;
  Visitor.prototype.visitIntervalDayTime = null;
  Visitor.prototype.visitIntervalYearMonth = null;

  // ../../node_modules/apache-arrow/util/math.mjs
  var math_exports = {};
  __export(math_exports, {
    float64ToUint16: () => float64ToUint16,
    uint16ToFloat64: () => uint16ToFloat64
  });
  var f64 = new Float64Array(1);
  var u32 = new Uint32Array(f64.buffer);
  function uint16ToFloat64(h) {
    const expo = (h & 31744) >> 10;
    const sigf = (h & 1023) / 1024;
    const sign = Math.pow(-1, (h & 32768) >> 15);
    switch (expo) {
      case 31:
        return sign * (sigf ? Number.NaN : 1 / 0);
      case 0:
        return sign * (sigf ? 6103515625e-14 * sigf : 0);
    }
    return sign * Math.pow(2, expo - 15) * (1 + sigf);
  }
  function float64ToUint16(d) {
    if (d !== d) {
      return 32256;
    }
    f64[0] = d;
    const sign = (u32[1] & 2147483648) >> 16 & 65535;
    let expo = u32[1] & 2146435072, sigf = 0;
    if (expo >= 1089470464) {
      if (u32[0] > 0) {
        expo = 31744;
      } else {
        expo = (expo & 2080374784) >> 16;
        sigf = (u32[1] & 1048575) >> 10;
      }
    } else if (expo <= 1056964608) {
      sigf = 1048576 + (u32[1] & 1048575);
      sigf = 1048576 + (sigf << (expo >> 20) - 998) >> 21;
      expo = 0;
    } else {
      expo = expo - 1056964608 >> 10;
      sigf = (u32[1] & 1048575) + 512 >> 10;
    }
    return sign | expo | sigf & 65535;
  }

  // ../../node_modules/apache-arrow/visitor/set.mjs
  var SetVisitor = class extends Visitor {
  };
  function wrapSet(fn) {
    return (data, _1, _2) => {
      if (data.setValid(_1, _2 != null)) {
        return fn(data, _1, _2);
      }
    };
  }
  var setEpochMsToDays = (data, index, epochMs) => {
    data[index] = Math.trunc(epochMs / 864e5);
  };
  var setEpochMsToMillisecondsLong = (data, index, epochMs) => {
    data[index] = Math.trunc(epochMs % 4294967296);
    data[index + 1] = Math.trunc(epochMs / 4294967296);
  };
  var setEpochMsToMicrosecondsLong = (data, index, epochMs) => {
    data[index] = Math.trunc(epochMs * 1e3 % 4294967296);
    data[index + 1] = Math.trunc(epochMs * 1e3 / 4294967296);
  };
  var setEpochMsToNanosecondsLong = (data, index, epochMs) => {
    data[index] = Math.trunc(epochMs * 1e6 % 4294967296);
    data[index + 1] = Math.trunc(epochMs * 1e6 / 4294967296);
  };
  var setVariableWidthBytes = (values, valueOffsets, index, value) => {
    if (index + 1 < valueOffsets.length) {
      const { [index]: x, [index + 1]: y } = valueOffsets;
      values.set(value.subarray(0, y - x), x);
    }
  };
  var setBool = ({ offset, values }, index, val) => {
    const idx = offset + index;
    val ? values[idx >> 3] |= 1 << idx % 8 : values[idx >> 3] &= ~(1 << idx % 8);
  };
  var setInt = ({ values }, index, value) => {
    values[index] = value;
  };
  var setFloat = ({ values }, index, value) => {
    values[index] = value;
  };
  var setFloat16 = ({ values }, index, value) => {
    values[index] = float64ToUint16(value);
  };
  var setAnyFloat = (data, index, value) => {
    switch (data.type.precision) {
      case Precision.HALF:
        return setFloat16(data, index, value);
      case Precision.SINGLE:
      case Precision.DOUBLE:
        return setFloat(data, index, value);
    }
  };
  var setDateDay = ({ values }, index, value) => {
    setEpochMsToDays(values, index, value.valueOf());
  };
  var setDateMillisecond = ({ values }, index, value) => {
    setEpochMsToMillisecondsLong(values, index * 2, value.valueOf());
  };
  var setFixedSizeBinary = ({ stride, values }, index, value) => {
    values.set(value.subarray(0, stride), stride * index);
  };
  var setBinary = ({ values, valueOffsets }, index, value) => setVariableWidthBytes(values, valueOffsets, index, value);
  var setUtf8 = ({ values, valueOffsets }, index, value) => {
    setVariableWidthBytes(values, valueOffsets, index, encodeUtf8(value));
  };
  var setDate = (data, index, value) => {
    data.type.unit === DateUnit.DAY ? setDateDay(data, index, value) : setDateMillisecond(data, index, value);
  };
  var setTimestampSecond = ({ values }, index, value) => setEpochMsToMillisecondsLong(values, index * 2, value / 1e3);
  var setTimestampMillisecond = ({ values }, index, value) => setEpochMsToMillisecondsLong(values, index * 2, value);
  var setTimestampMicrosecond = ({ values }, index, value) => setEpochMsToMicrosecondsLong(values, index * 2, value);
  var setTimestampNanosecond = ({ values }, index, value) => setEpochMsToNanosecondsLong(values, index * 2, value);
  var setTimestamp = (data, index, value) => {
    switch (data.type.unit) {
      case TimeUnit.SECOND:
        return setTimestampSecond(data, index, value);
      case TimeUnit.MILLISECOND:
        return setTimestampMillisecond(data, index, value);
      case TimeUnit.MICROSECOND:
        return setTimestampMicrosecond(data, index, value);
      case TimeUnit.NANOSECOND:
        return setTimestampNanosecond(data, index, value);
    }
  };
  var setTimeSecond = ({ values }, index, value) => {
    values[index] = value;
  };
  var setTimeMillisecond = ({ values }, index, value) => {
    values[index] = value;
  };
  var setTimeMicrosecond = ({ values }, index, value) => {
    values[index] = value;
  };
  var setTimeNanosecond = ({ values }, index, value) => {
    values[index] = value;
  };
  var setTime = (data, index, value) => {
    switch (data.type.unit) {
      case TimeUnit.SECOND:
        return setTimeSecond(data, index, value);
      case TimeUnit.MILLISECOND:
        return setTimeMillisecond(data, index, value);
      case TimeUnit.MICROSECOND:
        return setTimeMicrosecond(data, index, value);
      case TimeUnit.NANOSECOND:
        return setTimeNanosecond(data, index, value);
    }
  };
  var setDecimal = ({ values, stride }, index, value) => {
    values.set(value.subarray(0, stride), stride * index);
  };
  var setList = (data, index, value) => {
    const values = data.children[0];
    const valueOffsets = data.valueOffsets;
    const set = instance.getVisitFn(values);
    if (Array.isArray(value)) {
      for (let idx = -1, itr = valueOffsets[index], end = valueOffsets[index + 1]; itr < end; ) {
        set(values, itr++, value[++idx]);
      }
    } else {
      for (let idx = -1, itr = valueOffsets[index], end = valueOffsets[index + 1]; itr < end; ) {
        set(values, itr++, value.get(++idx));
      }
    }
  };
  var setMap = (data, index, value) => {
    const values = data.children[0];
    const { valueOffsets } = data;
    const set = instance.getVisitFn(values);
    let { [index]: idx, [index + 1]: end } = valueOffsets;
    const entries = value instanceof Map ? value.entries() : Object.entries(value);
    for (const val of entries) {
      set(values, idx, val);
      if (++idx >= end)
        break;
    }
  };
  var _setStructArrayValue = (o, v) => (set, c, _, i) => c && set(c, o, v[i]);
  var _setStructVectorValue = (o, v) => (set, c, _, i) => c && set(c, o, v.get(i));
  var _setStructMapValue = (o, v) => (set, c, f, _) => c && set(c, o, v.get(f.name));
  var _setStructObjectValue = (o, v) => (set, c, f, _) => c && set(c, o, v[f.name]);
  var setStruct = (data, index, value) => {
    const childSetters = data.type.children.map((f) => instance.getVisitFn(f.type));
    const set = value instanceof Map ? _setStructMapValue(index, value) : value instanceof Vector ? _setStructVectorValue(index, value) : Array.isArray(value) ? _setStructArrayValue(index, value) : _setStructObjectValue(index, value);
    data.type.children.forEach((f, i) => set(childSetters[i], data.children[i], f, i));
  };
  var setUnion = (data, index, value) => {
    data.type.mode === UnionMode.Dense ? setDenseUnion(data, index, value) : setSparseUnion(data, index, value);
  };
  var setDenseUnion = (data, index, value) => {
    const childIndex = data.type.typeIdToChildIndex[data.typeIds[index]];
    const child = data.children[childIndex];
    instance.visit(child, data.valueOffsets[index], value);
  };
  var setSparseUnion = (data, index, value) => {
    const childIndex = data.type.typeIdToChildIndex[data.typeIds[index]];
    const child = data.children[childIndex];
    instance.visit(child, index, value);
  };
  var setDictionary = (data, index, value) => {
    var _a5;
    (_a5 = data.dictionary) === null || _a5 === void 0 ? void 0 : _a5.set(data.values[index], value);
  };
  var setIntervalValue = (data, index, value) => {
    data.type.unit === IntervalUnit.DAY_TIME ? setIntervalDayTime(data, index, value) : setIntervalYearMonth(data, index, value);
  };
  var setIntervalDayTime = ({ values }, index, value) => {
    values.set(value.subarray(0, 2), 2 * index);
  };
  var setIntervalYearMonth = ({ values }, index, value) => {
    values[index] = value[0] * 12 + value[1] % 12;
  };
  var setFixedSizeList = (data, index, value) => {
    const { stride } = data;
    const child = data.children[0];
    const set = instance.getVisitFn(child);
    if (Array.isArray(value)) {
      for (let idx = -1, offset = index * stride; ++idx < stride; ) {
        set(child, offset + idx, value[idx]);
      }
    } else {
      for (let idx = -1, offset = index * stride; ++idx < stride; ) {
        set(child, offset + idx, value.get(idx));
      }
    }
  };
  SetVisitor.prototype.visitBool = wrapSet(setBool);
  SetVisitor.prototype.visitInt = wrapSet(setInt);
  SetVisitor.prototype.visitInt8 = wrapSet(setInt);
  SetVisitor.prototype.visitInt16 = wrapSet(setInt);
  SetVisitor.prototype.visitInt32 = wrapSet(setInt);
  SetVisitor.prototype.visitInt64 = wrapSet(setInt);
  SetVisitor.prototype.visitUint8 = wrapSet(setInt);
  SetVisitor.prototype.visitUint16 = wrapSet(setInt);
  SetVisitor.prototype.visitUint32 = wrapSet(setInt);
  SetVisitor.prototype.visitUint64 = wrapSet(setInt);
  SetVisitor.prototype.visitFloat = wrapSet(setAnyFloat);
  SetVisitor.prototype.visitFloat16 = wrapSet(setFloat16);
  SetVisitor.prototype.visitFloat32 = wrapSet(setFloat);
  SetVisitor.prototype.visitFloat64 = wrapSet(setFloat);
  SetVisitor.prototype.visitUtf8 = wrapSet(setUtf8);
  SetVisitor.prototype.visitBinary = wrapSet(setBinary);
  SetVisitor.prototype.visitFixedSizeBinary = wrapSet(setFixedSizeBinary);
  SetVisitor.prototype.visitDate = wrapSet(setDate);
  SetVisitor.prototype.visitDateDay = wrapSet(setDateDay);
  SetVisitor.prototype.visitDateMillisecond = wrapSet(setDateMillisecond);
  SetVisitor.prototype.visitTimestamp = wrapSet(setTimestamp);
  SetVisitor.prototype.visitTimestampSecond = wrapSet(setTimestampSecond);
  SetVisitor.prototype.visitTimestampMillisecond = wrapSet(setTimestampMillisecond);
  SetVisitor.prototype.visitTimestampMicrosecond = wrapSet(setTimestampMicrosecond);
  SetVisitor.prototype.visitTimestampNanosecond = wrapSet(setTimestampNanosecond);
  SetVisitor.prototype.visitTime = wrapSet(setTime);
  SetVisitor.prototype.visitTimeSecond = wrapSet(setTimeSecond);
  SetVisitor.prototype.visitTimeMillisecond = wrapSet(setTimeMillisecond);
  SetVisitor.prototype.visitTimeMicrosecond = wrapSet(setTimeMicrosecond);
  SetVisitor.prototype.visitTimeNanosecond = wrapSet(setTimeNanosecond);
  SetVisitor.prototype.visitDecimal = wrapSet(setDecimal);
  SetVisitor.prototype.visitList = wrapSet(setList);
  SetVisitor.prototype.visitStruct = wrapSet(setStruct);
  SetVisitor.prototype.visitUnion = wrapSet(setUnion);
  SetVisitor.prototype.visitDenseUnion = wrapSet(setDenseUnion);
  SetVisitor.prototype.visitSparseUnion = wrapSet(setSparseUnion);
  SetVisitor.prototype.visitDictionary = wrapSet(setDictionary);
  SetVisitor.prototype.visitInterval = wrapSet(setIntervalValue);
  SetVisitor.prototype.visitIntervalDayTime = wrapSet(setIntervalDayTime);
  SetVisitor.prototype.visitIntervalYearMonth = wrapSet(setIntervalYearMonth);
  SetVisitor.prototype.visitFixedSizeList = wrapSet(setFixedSizeList);
  SetVisitor.prototype.visitMap = wrapSet(setMap);
  var instance = new SetVisitor();

  // ../../node_modules/apache-arrow/row/struct.mjs
  var kParent = Symbol.for("parent");
  var kRowIndex = Symbol.for("rowIndex");
  var StructRow = class {
    constructor(parent, rowIndex) {
      this[kParent] = parent;
      this[kRowIndex] = rowIndex;
      return new Proxy(this, new StructRowProxyHandler());
    }
    toArray() {
      return Object.values(this.toJSON());
    }
    toJSON() {
      const i = this[kRowIndex];
      const parent = this[kParent];
      const keys = parent.type.children;
      const json = {};
      for (let j = -1, n = keys.length; ++j < n; ) {
        json[keys[j].name] = instance2.visit(parent.children[j], i);
      }
      return json;
    }
    toString() {
      return `{${[...this].map(([key, val]) => `${valueToString(key)}: ${valueToString(val)}`).join(", ")}}`;
    }
    [Symbol.for("nodejs.util.inspect.custom")]() {
      return this.toString();
    }
    [Symbol.iterator]() {
      return new StructRowIterator(this[kParent], this[kRowIndex]);
    }
  };
  var StructRowIterator = class {
    constructor(data, rowIndex) {
      this.childIndex = 0;
      this.children = data.children;
      this.rowIndex = rowIndex;
      this.childFields = data.type.children;
      this.numChildren = this.childFields.length;
    }
    [Symbol.iterator]() {
      return this;
    }
    next() {
      const i = this.childIndex;
      if (i < this.numChildren) {
        this.childIndex = i + 1;
        return {
          done: false,
          value: [
            this.childFields[i].name,
            instance2.visit(this.children[i], this.rowIndex)
          ]
        };
      }
      return { done: true, value: null };
    }
  };
  Object.defineProperties(StructRow.prototype, {
    [Symbol.toStringTag]: { enumerable: false, configurable: false, value: "Row" },
    [kParent]: { writable: true, enumerable: false, configurable: false, value: null },
    [kRowIndex]: { writable: true, enumerable: false, configurable: false, value: -1 }
  });
  var StructRowProxyHandler = class {
    isExtensible() {
      return false;
    }
    deleteProperty() {
      return false;
    }
    preventExtensions() {
      return true;
    }
    ownKeys(row) {
      return row[kParent].type.children.map((f) => f.name);
    }
    has(row, key) {
      return row[kParent].type.children.findIndex((f) => f.name === key) !== -1;
    }
    getOwnPropertyDescriptor(row, key) {
      if (row[kParent].type.children.findIndex((f) => f.name === key) !== -1) {
        return { writable: true, enumerable: true, configurable: true };
      }
      return;
    }
    get(row, key) {
      if (Reflect.has(row, key)) {
        return row[key];
      }
      const idx = row[kParent].type.children.findIndex((f) => f.name === key);
      if (idx !== -1) {
        const val = instance2.visit(row[kParent].children[idx], row[kRowIndex]);
        Reflect.set(row, key, val);
        return val;
      }
    }
    set(row, key, val) {
      const idx = row[kParent].type.children.findIndex((f) => f.name === key);
      if (idx !== -1) {
        instance.visit(row[kParent].children[idx], row[kRowIndex], val);
        return Reflect.set(row, key, val);
      } else if (Reflect.has(row, key) || typeof key === "symbol") {
        return Reflect.set(row, key, val);
      }
      return false;
    }
  };

  // ../../node_modules/apache-arrow/visitor/get.mjs
  var GetVisitor = class extends Visitor {
  };
  function wrapGet(fn) {
    return (data, _1) => data.getValid(_1) ? fn(data, _1) : null;
  }
  var epochDaysToMs = (data, index) => 864e5 * data[index];
  var epochMillisecondsLongToMs = (data, index) => 4294967296 * data[index + 1] + (data[index] >>> 0);
  var epochMicrosecondsLongToMs = (data, index) => 4294967296 * (data[index + 1] / 1e3) + (data[index] >>> 0) / 1e3;
  var epochNanosecondsLongToMs = (data, index) => 4294967296 * (data[index + 1] / 1e6) + (data[index] >>> 0) / 1e6;
  var epochMillisecondsToDate = (epochMs) => new Date(epochMs);
  var epochDaysToDate = (data, index) => epochMillisecondsToDate(epochDaysToMs(data, index));
  var epochMillisecondsLongToDate = (data, index) => epochMillisecondsToDate(epochMillisecondsLongToMs(data, index));
  var getNull = (_data, _index) => null;
  var getVariableWidthBytes = (values, valueOffsets, index) => {
    if (index + 1 >= valueOffsets.length) {
      return null;
    }
    const x = valueOffsets[index];
    const y = valueOffsets[index + 1];
    return values.subarray(x, y);
  };
  var getBool = ({ offset, values }, index) => {
    const idx = offset + index;
    const byte = values[idx >> 3];
    return (byte & 1 << idx % 8) !== 0;
  };
  var getDateDay = ({ values }, index) => epochDaysToDate(values, index);
  var getDateMillisecond = ({ values }, index) => epochMillisecondsLongToDate(values, index * 2);
  var getNumeric = ({ stride, values }, index) => values[stride * index];
  var getFloat16 = ({ stride, values }, index) => uint16ToFloat64(values[stride * index]);
  var getBigInts = ({ values }, index) => values[index];
  var getFixedSizeBinary = ({ stride, values }, index) => values.subarray(stride * index, stride * (index + 1));
  var getBinary = ({ values, valueOffsets }, index) => getVariableWidthBytes(values, valueOffsets, index);
  var getUtf8 = ({ values, valueOffsets }, index) => {
    const bytes = getVariableWidthBytes(values, valueOffsets, index);
    return bytes !== null ? decodeUtf8(bytes) : null;
  };
  var getInt = ({ values }, index) => values[index];
  var getFloat = ({ type, values }, index) => type.precision !== Precision.HALF ? values[index] : uint16ToFloat64(values[index]);
  var getDate = (data, index) => data.type.unit === DateUnit.DAY ? getDateDay(data, index) : getDateMillisecond(data, index);
  var getTimestampSecond = ({ values }, index) => 1e3 * epochMillisecondsLongToMs(values, index * 2);
  var getTimestampMillisecond = ({ values }, index) => epochMillisecondsLongToMs(values, index * 2);
  var getTimestampMicrosecond = ({ values }, index) => epochMicrosecondsLongToMs(values, index * 2);
  var getTimestampNanosecond = ({ values }, index) => epochNanosecondsLongToMs(values, index * 2);
  var getTimestamp = (data, index) => {
    switch (data.type.unit) {
      case TimeUnit.SECOND:
        return getTimestampSecond(data, index);
      case TimeUnit.MILLISECOND:
        return getTimestampMillisecond(data, index);
      case TimeUnit.MICROSECOND:
        return getTimestampMicrosecond(data, index);
      case TimeUnit.NANOSECOND:
        return getTimestampNanosecond(data, index);
    }
  };
  var getTimeSecond = ({ values }, index) => values[index];
  var getTimeMillisecond = ({ values }, index) => values[index];
  var getTimeMicrosecond = ({ values }, index) => values[index];
  var getTimeNanosecond = ({ values }, index) => values[index];
  var getTime = (data, index) => {
    switch (data.type.unit) {
      case TimeUnit.SECOND:
        return getTimeSecond(data, index);
      case TimeUnit.MILLISECOND:
        return getTimeMillisecond(data, index);
      case TimeUnit.MICROSECOND:
        return getTimeMicrosecond(data, index);
      case TimeUnit.NANOSECOND:
        return getTimeNanosecond(data, index);
    }
  };
  var getDecimal = ({ values, stride }, index) => BN.decimal(values.subarray(stride * index, stride * (index + 1)));
  var getList = (data, index) => {
    const { valueOffsets, stride, children } = data;
    const { [index * stride]: begin, [index * stride + 1]: end } = valueOffsets;
    const child = children[0];
    const slice = child.slice(begin, end - begin);
    return new Vector([slice]);
  };
  var getMap = (data, index) => {
    const { valueOffsets, children } = data;
    const { [index]: begin, [index + 1]: end } = valueOffsets;
    const child = children[0];
    return new MapRow(child.slice(begin, end - begin));
  };
  var getStruct = (data, index) => {
    return new StructRow(data, index);
  };
  var getUnion = (data, index) => {
    return data.type.mode === UnionMode.Dense ? getDenseUnion(data, index) : getSparseUnion(data, index);
  };
  var getDenseUnion = (data, index) => {
    const childIndex = data.type.typeIdToChildIndex[data.typeIds[index]];
    const child = data.children[childIndex];
    return instance2.visit(child, data.valueOffsets[index]);
  };
  var getSparseUnion = (data, index) => {
    const childIndex = data.type.typeIdToChildIndex[data.typeIds[index]];
    const child = data.children[childIndex];
    return instance2.visit(child, index);
  };
  var getDictionary = (data, index) => {
    var _a5;
    return (_a5 = data.dictionary) === null || _a5 === void 0 ? void 0 : _a5.get(data.values[index]);
  };
  var getInterval = (data, index) => data.type.unit === IntervalUnit.DAY_TIME ? getIntervalDayTime(data, index) : getIntervalYearMonth(data, index);
  var getIntervalDayTime = ({ values }, index) => values.subarray(2 * index, 2 * (index + 1));
  var getIntervalYearMonth = ({ values }, index) => {
    const interval = values[index];
    const int32s = new Int32Array(2);
    int32s[0] = Math.trunc(interval / 12);
    int32s[1] = Math.trunc(interval % 12);
    return int32s;
  };
  var getFixedSizeList = (data, index) => {
    const { stride, children } = data;
    const child = children[0];
    const slice = child.slice(index * stride, stride);
    return new Vector([slice]);
  };
  GetVisitor.prototype.visitNull = wrapGet(getNull);
  GetVisitor.prototype.visitBool = wrapGet(getBool);
  GetVisitor.prototype.visitInt = wrapGet(getInt);
  GetVisitor.prototype.visitInt8 = wrapGet(getNumeric);
  GetVisitor.prototype.visitInt16 = wrapGet(getNumeric);
  GetVisitor.prototype.visitInt32 = wrapGet(getNumeric);
  GetVisitor.prototype.visitInt64 = wrapGet(getBigInts);
  GetVisitor.prototype.visitUint8 = wrapGet(getNumeric);
  GetVisitor.prototype.visitUint16 = wrapGet(getNumeric);
  GetVisitor.prototype.visitUint32 = wrapGet(getNumeric);
  GetVisitor.prototype.visitUint64 = wrapGet(getBigInts);
  GetVisitor.prototype.visitFloat = wrapGet(getFloat);
  GetVisitor.prototype.visitFloat16 = wrapGet(getFloat16);
  GetVisitor.prototype.visitFloat32 = wrapGet(getNumeric);
  GetVisitor.prototype.visitFloat64 = wrapGet(getNumeric);
  GetVisitor.prototype.visitUtf8 = wrapGet(getUtf8);
  GetVisitor.prototype.visitBinary = wrapGet(getBinary);
  GetVisitor.prototype.visitFixedSizeBinary = wrapGet(getFixedSizeBinary);
  GetVisitor.prototype.visitDate = wrapGet(getDate);
  GetVisitor.prototype.visitDateDay = wrapGet(getDateDay);
  GetVisitor.prototype.visitDateMillisecond = wrapGet(getDateMillisecond);
  GetVisitor.prototype.visitTimestamp = wrapGet(getTimestamp);
  GetVisitor.prototype.visitTimestampSecond = wrapGet(getTimestampSecond);
  GetVisitor.prototype.visitTimestampMillisecond = wrapGet(getTimestampMillisecond);
  GetVisitor.prototype.visitTimestampMicrosecond = wrapGet(getTimestampMicrosecond);
  GetVisitor.prototype.visitTimestampNanosecond = wrapGet(getTimestampNanosecond);
  GetVisitor.prototype.visitTime = wrapGet(getTime);
  GetVisitor.prototype.visitTimeSecond = wrapGet(getTimeSecond);
  GetVisitor.prototype.visitTimeMillisecond = wrapGet(getTimeMillisecond);
  GetVisitor.prototype.visitTimeMicrosecond = wrapGet(getTimeMicrosecond);
  GetVisitor.prototype.visitTimeNanosecond = wrapGet(getTimeNanosecond);
  GetVisitor.prototype.visitDecimal = wrapGet(getDecimal);
  GetVisitor.prototype.visitList = wrapGet(getList);
  GetVisitor.prototype.visitStruct = wrapGet(getStruct);
  GetVisitor.prototype.visitUnion = wrapGet(getUnion);
  GetVisitor.prototype.visitDenseUnion = wrapGet(getDenseUnion);
  GetVisitor.prototype.visitSparseUnion = wrapGet(getSparseUnion);
  GetVisitor.prototype.visitDictionary = wrapGet(getDictionary);
  GetVisitor.prototype.visitInterval = wrapGet(getInterval);
  GetVisitor.prototype.visitIntervalDayTime = wrapGet(getIntervalDayTime);
  GetVisitor.prototype.visitIntervalYearMonth = wrapGet(getIntervalYearMonth);
  GetVisitor.prototype.visitFixedSizeList = wrapGet(getFixedSizeList);
  GetVisitor.prototype.visitMap = wrapGet(getMap);
  var instance2 = new GetVisitor();

  // ../../node_modules/apache-arrow/row/map.mjs
  var kKeys = Symbol.for("keys");
  var kVals = Symbol.for("vals");
  var MapRow = class {
    constructor(slice) {
      this[kKeys] = new Vector([slice.children[0]]).memoize();
      this[kVals] = slice.children[1];
      return new Proxy(this, new MapRowProxyHandler());
    }
    [Symbol.iterator]() {
      return new MapRowIterator(this[kKeys], this[kVals]);
    }
    get size() {
      return this[kKeys].length;
    }
    toArray() {
      return Object.values(this.toJSON());
    }
    toJSON() {
      const keys = this[kKeys];
      const vals = this[kVals];
      const json = {};
      for (let i = -1, n = keys.length; ++i < n; ) {
        json[keys.get(i)] = instance2.visit(vals, i);
      }
      return json;
    }
    toString() {
      return `{${[...this].map(([key, val]) => `${valueToString(key)}: ${valueToString(val)}`).join(", ")}}`;
    }
    [Symbol.for("nodejs.util.inspect.custom")]() {
      return this.toString();
    }
  };
  var MapRowIterator = class {
    constructor(keys, vals) {
      this.keys = keys;
      this.vals = vals;
      this.keyIndex = 0;
      this.numKeys = keys.length;
    }
    [Symbol.iterator]() {
      return this;
    }
    next() {
      const i = this.keyIndex;
      if (i === this.numKeys) {
        return { done: true, value: null };
      }
      this.keyIndex++;
      return {
        done: false,
        value: [
          this.keys.get(i),
          instance2.visit(this.vals, i)
        ]
      };
    }
  };
  var MapRowProxyHandler = class {
    isExtensible() {
      return false;
    }
    deleteProperty() {
      return false;
    }
    preventExtensions() {
      return true;
    }
    ownKeys(row) {
      return row[kKeys].toArray().map(String);
    }
    has(row, key) {
      return row[kKeys].includes(key);
    }
    getOwnPropertyDescriptor(row, key) {
      const idx = row[kKeys].indexOf(key);
      if (idx !== -1) {
        return { writable: true, enumerable: true, configurable: true };
      }
      return;
    }
    get(row, key) {
      if (Reflect.has(row, key)) {
        return row[key];
      }
      const idx = row[kKeys].indexOf(key);
      if (idx !== -1) {
        const val = instance2.visit(Reflect.get(row, kVals), idx);
        Reflect.set(row, key, val);
        return val;
      }
    }
    set(row, key, val) {
      const idx = row[kKeys].indexOf(key);
      if (idx !== -1) {
        instance.visit(Reflect.get(row, kVals), idx, val);
        return Reflect.set(row, key, val);
      } else if (Reflect.has(row, key)) {
        return Reflect.set(row, key, val);
      }
      return false;
    }
  };
  Object.defineProperties(MapRow.prototype, {
    [Symbol.toStringTag]: { enumerable: false, configurable: false, value: "Row" },
    [kKeys]: { writable: true, enumerable: false, configurable: false, value: null },
    [kVals]: { writable: true, enumerable: false, configurable: false, value: null }
  });

  // ../../node_modules/apache-arrow/util/vector.mjs
  function clampIndex(source, index, then) {
    const length = source.length;
    const adjust = index > -1 ? index : length + index % length;
    return then ? then(source, adjust) : adjust;
  }
  var tmp;
  function clampRange(source, begin, end, then) {
    const { length: len = 0 } = source;
    let lhs = typeof begin !== "number" ? 0 : begin;
    let rhs = typeof end !== "number" ? len : end;
    lhs < 0 && (lhs = (lhs % len + len) % len);
    rhs < 0 && (rhs = (rhs % len + len) % len);
    rhs < lhs && (tmp = lhs, lhs = rhs, rhs = tmp);
    rhs > len && (rhs = len);
    return then ? then(source, lhs, rhs) : [lhs, rhs];
  }
  var isNaNFast = (value) => value !== value;
  function createElementComparator(search) {
    const typeofSearch = typeof search;
    if (typeofSearch !== "object" || search === null) {
      if (isNaNFast(search)) {
        return isNaNFast;
      }
      return (value) => value === search;
    }
    if (search instanceof Date) {
      const valueOfSearch = search.valueOf();
      return (value) => value instanceof Date ? value.valueOf() === valueOfSearch : false;
    }
    if (ArrayBuffer.isView(search)) {
      return (value) => value ? compareArrayLike(search, value) : false;
    }
    if (search instanceof Map) {
      return createMapComparator(search);
    }
    if (Array.isArray(search)) {
      return createArrayLikeComparator(search);
    }
    if (search instanceof Vector) {
      return createVectorComparator(search);
    }
    return createObjectComparator(search, true);
  }
  function createArrayLikeComparator(lhs) {
    const comparators = [];
    for (let i = -1, n = lhs.length; ++i < n; ) {
      comparators[i] = createElementComparator(lhs[i]);
    }
    return createSubElementsComparator(comparators);
  }
  function createMapComparator(lhs) {
    let i = -1;
    const comparators = [];
    for (const v of lhs.values())
      comparators[++i] = createElementComparator(v);
    return createSubElementsComparator(comparators);
  }
  function createVectorComparator(lhs) {
    const comparators = [];
    for (let i = -1, n = lhs.length; ++i < n; ) {
      comparators[i] = createElementComparator(lhs.get(i));
    }
    return createSubElementsComparator(comparators);
  }
  function createObjectComparator(lhs, allowEmpty = false) {
    const keys = Object.keys(lhs);
    if (!allowEmpty && keys.length === 0) {
      return () => false;
    }
    const comparators = [];
    for (let i = -1, n = keys.length; ++i < n; ) {
      comparators[i] = createElementComparator(lhs[keys[i]]);
    }
    return createSubElementsComparator(comparators, keys);
  }
  function createSubElementsComparator(comparators, keys) {
    return (rhs) => {
      if (!rhs || typeof rhs !== "object") {
        return false;
      }
      switch (rhs.constructor) {
        case Array:
          return compareArray(comparators, rhs);
        case Map:
          return compareObject(comparators, rhs, rhs.keys());
        case MapRow:
        case StructRow:
        case Object:
        case void 0:
          return compareObject(comparators, rhs, keys || Object.keys(rhs));
      }
      return rhs instanceof Vector ? compareVector(comparators, rhs) : false;
    };
  }
  function compareArray(comparators, arr) {
    const n = comparators.length;
    if (arr.length !== n) {
      return false;
    }
    for (let i = -1; ++i < n; ) {
      if (!comparators[i](arr[i])) {
        return false;
      }
    }
    return true;
  }
  function compareVector(comparators, vec) {
    const n = comparators.length;
    if (vec.length !== n) {
      return false;
    }
    for (let i = -1; ++i < n; ) {
      if (!comparators[i](vec.get(i))) {
        return false;
      }
    }
    return true;
  }
  function compareObject(comparators, obj, keys) {
    const lKeyItr = keys[Symbol.iterator]();
    const rKeyItr = obj instanceof Map ? obj.keys() : Object.keys(obj)[Symbol.iterator]();
    const rValItr = obj instanceof Map ? obj.values() : Object.values(obj)[Symbol.iterator]();
    let i = 0;
    const n = comparators.length;
    let rVal = rValItr.next();
    let lKey = lKeyItr.next();
    let rKey = rKeyItr.next();
    for (; i < n && !lKey.done && !rKey.done && !rVal.done; ++i, lKey = lKeyItr.next(), rKey = rKeyItr.next(), rVal = rValItr.next()) {
      if (lKey.value !== rKey.value || !comparators[i](rVal.value)) {
        break;
      }
    }
    if (i === n && lKey.done && rKey.done && rVal.done) {
      return true;
    }
    lKeyItr.return && lKeyItr.return();
    rKeyItr.return && rKeyItr.return();
    rValItr.return && rValItr.return();
    return false;
  }

  // ../../node_modules/apache-arrow/util/bit.mjs
  var bit_exports = {};
  __export(bit_exports, {
    BitIterator: () => BitIterator,
    getBit: () => getBit,
    getBool: () => getBool2,
    packBools: () => packBools,
    popcnt_array: () => popcnt_array,
    popcnt_bit_range: () => popcnt_bit_range,
    popcnt_uint32: () => popcnt_uint32,
    setBool: () => setBool2,
    truncateBitmap: () => truncateBitmap
  });
  function getBool2(_data, _index, byte, bit) {
    return (byte & 1 << bit) !== 0;
  }
  function getBit(_data, _index, byte, bit) {
    return (byte & 1 << bit) >> bit;
  }
  function setBool2(bytes, index, value) {
    return value ? !!(bytes[index >> 3] |= 1 << index % 8) || true : !(bytes[index >> 3] &= ~(1 << index % 8)) && false;
  }
  function truncateBitmap(offset, length, bitmap) {
    const alignedSize = bitmap.byteLength + 7 & ~7;
    if (offset > 0 || bitmap.byteLength < alignedSize) {
      const bytes = new Uint8Array(alignedSize);
      bytes.set(offset % 8 === 0 ? bitmap.subarray(offset >> 3) : (
        // Otherwise iterate each bit from the offset and return a new one
        packBools(new BitIterator(bitmap, offset, length, null, getBool2)).subarray(0, alignedSize)
      ));
      return bytes;
    }
    return bitmap;
  }
  function packBools(values) {
    const xs = [];
    let i = 0, bit = 0, byte = 0;
    for (const value of values) {
      value && (byte |= 1 << bit);
      if (++bit === 8) {
        xs[i++] = byte;
        byte = bit = 0;
      }
    }
    if (i === 0 || bit > 0) {
      xs[i++] = byte;
    }
    const b = new Uint8Array(xs.length + 7 & ~7);
    b.set(xs);
    return b;
  }
  var BitIterator = class {
    constructor(bytes, begin, length, context, get) {
      this.bytes = bytes;
      this.length = length;
      this.context = context;
      this.get = get;
      this.bit = begin % 8;
      this.byteIndex = begin >> 3;
      this.byte = bytes[this.byteIndex++];
      this.index = 0;
    }
    next() {
      if (this.index < this.length) {
        if (this.bit === 8) {
          this.bit = 0;
          this.byte = this.bytes[this.byteIndex++];
        }
        return {
          value: this.get(this.context, this.index++, this.byte, this.bit++)
        };
      }
      return { done: true, value: null };
    }
    [Symbol.iterator]() {
      return this;
    }
  };
  function popcnt_bit_range(data, lhs, rhs) {
    if (rhs - lhs <= 0) {
      return 0;
    }
    if (rhs - lhs < 8) {
      let sum2 = 0;
      for (const bit of new BitIterator(data, lhs, rhs - lhs, data, getBit)) {
        sum2 += bit;
      }
      return sum2;
    }
    const rhsInside = rhs >> 3 << 3;
    const lhsInside = lhs + (lhs % 8 === 0 ? 0 : 8 - lhs % 8);
    return (
      // Get the popcnt of bits between the left hand side, and the next highest multiple of 8
      popcnt_bit_range(data, lhs, lhsInside) + // Get the popcnt of bits between the right hand side, and the next lowest multiple of 8
      popcnt_bit_range(data, rhsInside, rhs) + // Get the popcnt of all bits between the left and right hand sides' multiples of 8
      popcnt_array(data, lhsInside >> 3, rhsInside - lhsInside >> 3)
    );
  }
  function popcnt_array(arr, byteOffset, byteLength) {
    let cnt = 0, pos = Math.trunc(byteOffset);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    const len = byteLength === void 0 ? arr.byteLength : pos + byteLength;
    while (len - pos >= 4) {
      cnt += popcnt_uint32(view.getUint32(pos));
      pos += 4;
    }
    while (len - pos >= 2) {
      cnt += popcnt_uint32(view.getUint16(pos));
      pos += 2;
    }
    while (len - pos >= 1) {
      cnt += popcnt_uint32(view.getUint8(pos));
      pos += 1;
    }
    return cnt;
  }
  function popcnt_uint32(uint32) {
    let i = Math.trunc(uint32);
    i = i - (i >>> 1 & 1431655765);
    i = (i & 858993459) + (i >>> 2 & 858993459);
    return (i + (i >>> 4) & 252645135) * 16843009 >>> 24;
  }

  // ../../node_modules/apache-arrow/data.mjs
  var kUnknownNullCount = -1;
  var Data = class _Data {
    get typeId() {
      return this.type.typeId;
    }
    get ArrayType() {
      return this.type.ArrayType;
    }
    get buffers() {
      return [this.valueOffsets, this.values, this.nullBitmap, this.typeIds];
    }
    get byteLength() {
      let byteLength = 0;
      const { valueOffsets, values, nullBitmap, typeIds } = this;
      valueOffsets && (byteLength += valueOffsets.byteLength);
      values && (byteLength += values.byteLength);
      nullBitmap && (byteLength += nullBitmap.byteLength);
      typeIds && (byteLength += typeIds.byteLength);
      return this.children.reduce((byteLength2, child) => byteLength2 + child.byteLength, byteLength);
    }
    get nullCount() {
      let nullCount = this._nullCount;
      let nullBitmap;
      if (nullCount <= kUnknownNullCount && (nullBitmap = this.nullBitmap)) {
        this._nullCount = nullCount = this.length - popcnt_bit_range(nullBitmap, this.offset, this.offset + this.length);
      }
      return nullCount;
    }
    constructor(type, offset, length, nullCount, buffers, children = [], dictionary) {
      this.type = type;
      this.children = children;
      this.dictionary = dictionary;
      this.offset = Math.floor(Math.max(offset || 0, 0));
      this.length = Math.floor(Math.max(length || 0, 0));
      this._nullCount = Math.floor(Math.max(nullCount || 0, -1));
      let buffer;
      if (buffers instanceof _Data) {
        this.stride = buffers.stride;
        this.values = buffers.values;
        this.typeIds = buffers.typeIds;
        this.nullBitmap = buffers.nullBitmap;
        this.valueOffsets = buffers.valueOffsets;
      } else {
        this.stride = strideForType(type);
        if (buffers) {
          (buffer = buffers[0]) && (this.valueOffsets = buffer);
          (buffer = buffers[1]) && (this.values = buffer);
          (buffer = buffers[2]) && (this.nullBitmap = buffer);
          (buffer = buffers[3]) && (this.typeIds = buffer);
        }
      }
      this.nullable = this._nullCount !== 0 && this.nullBitmap && this.nullBitmap.byteLength > 0;
    }
    getValid(index) {
      if (this.nullable && this.nullCount > 0) {
        const pos = this.offset + index;
        const val = this.nullBitmap[pos >> 3];
        return (val & 1 << pos % 8) !== 0;
      }
      return true;
    }
    setValid(index, value) {
      if (!this.nullable) {
        return value;
      }
      if (!this.nullBitmap || this.nullBitmap.byteLength <= index >> 3) {
        const { nullBitmap: nullBitmap2 } = this._changeLengthAndBackfillNullBitmap(this.length);
        Object.assign(this, { nullBitmap: nullBitmap2, _nullCount: 0 });
      }
      const { nullBitmap, offset } = this;
      const pos = offset + index >> 3;
      const bit = (offset + index) % 8;
      const val = nullBitmap[pos] >> bit & 1;
      value ? val === 0 && (nullBitmap[pos] |= 1 << bit, this._nullCount = this.nullCount + 1) : val === 1 && (nullBitmap[pos] &= ~(1 << bit), this._nullCount = this.nullCount - 1);
      return value;
    }
    clone(type = this.type, offset = this.offset, length = this.length, nullCount = this._nullCount, buffers = this, children = this.children) {
      return new _Data(type, offset, length, nullCount, buffers, children, this.dictionary);
    }
    slice(offset, length) {
      const { stride, typeId, children } = this;
      const nullCount = +(this._nullCount === 0) - 1;
      const childStride = typeId === 16 ? stride : 1;
      const buffers = this._sliceBuffers(offset, length, stride, typeId);
      return this.clone(
        this.type,
        this.offset + offset,
        length,
        nullCount,
        buffers,
        // Don't slice children if we have value offsets (the variable-width types)
        children.length === 0 || this.valueOffsets ? children : this._sliceChildren(children, childStride * offset, childStride * length)
      );
    }
    _changeLengthAndBackfillNullBitmap(newLength) {
      if (this.typeId === Type.Null) {
        return this.clone(this.type, 0, newLength, 0);
      }
      const { length, nullCount } = this;
      const bitmap = new Uint8Array((newLength + 63 & ~63) >> 3).fill(255, 0, length >> 3);
      bitmap[length >> 3] = (1 << length - (length & ~7)) - 1;
      if (nullCount > 0) {
        bitmap.set(truncateBitmap(this.offset, length, this.nullBitmap), 0);
      }
      const buffers = this.buffers;
      buffers[BufferType.VALIDITY] = bitmap;
      return this.clone(this.type, 0, newLength, nullCount + (newLength - length), buffers);
    }
    _sliceBuffers(offset, length, stride, typeId) {
      let arr;
      const { buffers } = this;
      (arr = buffers[BufferType.TYPE]) && (buffers[BufferType.TYPE] = arr.subarray(offset, offset + length));
      (arr = buffers[BufferType.OFFSET]) && (buffers[BufferType.OFFSET] = arr.subarray(offset, offset + length + 1)) || // Otherwise if no offsets, slice the data buffer. Don't slice the data vector for Booleans, since the offset goes by bits not bytes
      (arr = buffers[BufferType.DATA]) && (buffers[BufferType.DATA] = typeId === 6 ? arr : arr.subarray(stride * offset, stride * (offset + length)));
      return buffers;
    }
    _sliceChildren(children, offset, length) {
      return children.map((child) => child.slice(offset, length));
    }
  };
  Data.prototype.children = Object.freeze([]);
  var MakeDataVisitor = class _MakeDataVisitor extends Visitor {
    visit(props) {
      return this.getVisitFn(props["type"]).call(this, props);
    }
    visitNull(props) {
      const { ["type"]: type, ["offset"]: offset = 0, ["length"]: length = 0 } = props;
      return new Data(type, offset, length, 0);
    }
    visitBool(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length >> 3, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [void 0, data, nullBitmap]);
    }
    visitInt(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [void 0, data, nullBitmap]);
    }
    visitFloat(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [void 0, data, nullBitmap]);
    }
    visitUtf8(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const data = toUint8Array(props["data"]);
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const valueOffsets = toInt32Array(props["valueOffsets"]);
      const { ["length"]: length = valueOffsets.length - 1, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [valueOffsets, data, nullBitmap]);
    }
    visitBinary(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const data = toUint8Array(props["data"]);
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const valueOffsets = toInt32Array(props["valueOffsets"]);
      const { ["length"]: length = valueOffsets.length - 1, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [valueOffsets, data, nullBitmap]);
    }
    visitFixedSizeBinary(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [void 0, data, nullBitmap]);
    }
    visitDate(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [void 0, data, nullBitmap]);
    }
    visitTimestamp(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [void 0, data, nullBitmap]);
    }
    visitTime(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [void 0, data, nullBitmap]);
    }
    visitDecimal(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [void 0, data, nullBitmap]);
    }
    visitList(props) {
      const { ["type"]: type, ["offset"]: offset = 0, ["child"]: child } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const valueOffsets = toInt32Array(props["valueOffsets"]);
      const { ["length"]: length = valueOffsets.length - 1, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [valueOffsets, void 0, nullBitmap], [child]);
    }
    visitStruct(props) {
      const { ["type"]: type, ["offset"]: offset = 0, ["children"]: children = [] } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const { length = children.reduce((len, { length: length2 }) => Math.max(len, length2), 0), nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [void 0, void 0, nullBitmap], children);
    }
    visitUnion(props) {
      const { ["type"]: type, ["offset"]: offset = 0, ["children"]: children = [] } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const typeIds = toArrayBufferView(type.ArrayType, props["typeIds"]);
      const { ["length"]: length = typeIds.length, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      if (DataType.isSparseUnion(type)) {
        return new Data(type, offset, length, nullCount, [void 0, void 0, nullBitmap, typeIds], children);
      }
      const valueOffsets = toInt32Array(props["valueOffsets"]);
      return new Data(type, offset, length, nullCount, [valueOffsets, void 0, nullBitmap, typeIds], children);
    }
    visitDictionary(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.indices.ArrayType, props["data"]);
      const { ["dictionary"]: dictionary = new Vector([new _MakeDataVisitor().visit({ type: type.dictionary })]) } = props;
      const { ["length"]: length = data.length, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [void 0, data, nullBitmap], [], dictionary);
    }
    visitInterval(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [void 0, data, nullBitmap]);
    }
    visitFixedSizeList(props) {
      const { ["type"]: type, ["offset"]: offset = 0, ["child"]: child = new _MakeDataVisitor().visit({ type: type.valueType }) } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const { ["length"]: length = child.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [void 0, void 0, nullBitmap], [child]);
    }
    visitMap(props) {
      const { ["type"]: type, ["offset"]: offset = 0, ["child"]: child = new _MakeDataVisitor().visit({ type: type.childType }) } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const valueOffsets = toInt32Array(props["valueOffsets"]);
      const { ["length"]: length = valueOffsets.length - 1, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [valueOffsets, void 0, nullBitmap], [child]);
    }
  };
  function makeData(props) {
    return new MakeDataVisitor().visit(props);
  }

  // ../../node_modules/apache-arrow/util/chunk.mjs
  var ChunkedIterator = class {
    constructor(numChunks = 0, getChunkIterator) {
      this.numChunks = numChunks;
      this.getChunkIterator = getChunkIterator;
      this.chunkIndex = 0;
      this.chunkIterator = this.getChunkIterator(0);
    }
    next() {
      while (this.chunkIndex < this.numChunks) {
        const next = this.chunkIterator.next();
        if (!next.done) {
          return next;
        }
        if (++this.chunkIndex < this.numChunks) {
          this.chunkIterator = this.getChunkIterator(this.chunkIndex);
        }
      }
      return { done: true, value: null };
    }
    [Symbol.iterator]() {
      return this;
    }
  };
  function computeChunkNullCounts(chunks) {
    return chunks.reduce((nullCount, chunk) => nullCount + chunk.nullCount, 0);
  }
  function computeChunkOffsets(chunks) {
    return chunks.reduce((offsets, chunk, index) => {
      offsets[index + 1] = offsets[index] + chunk.length;
      return offsets;
    }, new Uint32Array(chunks.length + 1));
  }
  function sliceChunks(chunks, offsets, begin, end) {
    const slices = [];
    for (let i = -1, n = chunks.length; ++i < n; ) {
      const chunk = chunks[i];
      const offset = offsets[i];
      const { length } = chunk;
      if (offset >= end) {
        break;
      }
      if (begin >= offset + length) {
        continue;
      }
      if (offset >= begin && offset + length <= end) {
        slices.push(chunk);
        continue;
      }
      const from = Math.max(0, begin - offset);
      const to = Math.min(end - offset, length);
      slices.push(chunk.slice(from, to - from));
    }
    if (slices.length === 0) {
      slices.push(chunks[0].slice(0, 0));
    }
    return slices;
  }
  function binarySearch(chunks, offsets, idx, fn) {
    let lhs = 0, mid = 0, rhs = offsets.length - 1;
    do {
      if (lhs >= rhs - 1) {
        return idx < offsets[rhs] ? fn(chunks, lhs, idx - offsets[lhs]) : null;
      }
      mid = lhs + Math.trunc((rhs - lhs) * 0.5);
      idx < offsets[mid] ? rhs = mid : lhs = mid;
    } while (lhs < rhs);
  }
  function isChunkedValid(data, index) {
    return data.getValid(index);
  }
  function wrapChunkedCall1(fn) {
    function chunkedFn(chunks, i, j) {
      return fn(chunks[i], j);
    }
    return function(index) {
      const data = this.data;
      return binarySearch(data, this._offsets, index, chunkedFn);
    };
  }
  function wrapChunkedCall2(fn) {
    let _2;
    function chunkedFn(chunks, i, j) {
      return fn(chunks[i], j, _2);
    }
    return function(index, value) {
      const data = this.data;
      _2 = value;
      const result = binarySearch(data, this._offsets, index, chunkedFn);
      _2 = void 0;
      return result;
    };
  }
  function wrapChunkedIndexOf(indexOf) {
    let _1;
    function chunkedIndexOf(data, chunkIndex, fromIndex) {
      let begin = fromIndex, index = 0, total = 0;
      for (let i = chunkIndex - 1, n = data.length; ++i < n; ) {
        const chunk = data[i];
        if (~(index = indexOf(chunk, _1, begin))) {
          return total + index;
        }
        begin = 0;
        total += chunk.length;
      }
      return -1;
    }
    return function(element, offset) {
      _1 = element;
      const data = this.data;
      const result = typeof offset !== "number" ? chunkedIndexOf(data, 0, 0) : binarySearch(data, this._offsets, offset, chunkedIndexOf);
      _1 = void 0;
      return result;
    };
  }

  // ../../node_modules/apache-arrow/visitor/indexof.mjs
  var IndexOfVisitor = class extends Visitor {
  };
  function nullIndexOf(data, searchElement) {
    return searchElement === null && data.length > 0 ? 0 : -1;
  }
  function indexOfNull(data, fromIndex) {
    const { nullBitmap } = data;
    if (!nullBitmap || data.nullCount <= 0) {
      return -1;
    }
    let i = 0;
    for (const isValid of new BitIterator(nullBitmap, data.offset + (fromIndex || 0), data.length, nullBitmap, getBool2)) {
      if (!isValid) {
        return i;
      }
      ++i;
    }
    return -1;
  }
  function indexOfValue(data, searchElement, fromIndex) {
    if (searchElement === void 0) {
      return -1;
    }
    if (searchElement === null) {
      return indexOfNull(data, fromIndex);
    }
    const get = instance2.getVisitFn(data);
    const compare = createElementComparator(searchElement);
    for (let i = (fromIndex || 0) - 1, n = data.length; ++i < n; ) {
      if (compare(get(data, i))) {
        return i;
      }
    }
    return -1;
  }
  function indexOfUnion(data, searchElement, fromIndex) {
    const get = instance2.getVisitFn(data);
    const compare = createElementComparator(searchElement);
    for (let i = (fromIndex || 0) - 1, n = data.length; ++i < n; ) {
      if (compare(get(data, i))) {
        return i;
      }
    }
    return -1;
  }
  IndexOfVisitor.prototype.visitNull = nullIndexOf;
  IndexOfVisitor.prototype.visitBool = indexOfValue;
  IndexOfVisitor.prototype.visitInt = indexOfValue;
  IndexOfVisitor.prototype.visitInt8 = indexOfValue;
  IndexOfVisitor.prototype.visitInt16 = indexOfValue;
  IndexOfVisitor.prototype.visitInt32 = indexOfValue;
  IndexOfVisitor.prototype.visitInt64 = indexOfValue;
  IndexOfVisitor.prototype.visitUint8 = indexOfValue;
  IndexOfVisitor.prototype.visitUint16 = indexOfValue;
  IndexOfVisitor.prototype.visitUint32 = indexOfValue;
  IndexOfVisitor.prototype.visitUint64 = indexOfValue;
  IndexOfVisitor.prototype.visitFloat = indexOfValue;
  IndexOfVisitor.prototype.visitFloat16 = indexOfValue;
  IndexOfVisitor.prototype.visitFloat32 = indexOfValue;
  IndexOfVisitor.prototype.visitFloat64 = indexOfValue;
  IndexOfVisitor.prototype.visitUtf8 = indexOfValue;
  IndexOfVisitor.prototype.visitBinary = indexOfValue;
  IndexOfVisitor.prototype.visitFixedSizeBinary = indexOfValue;
  IndexOfVisitor.prototype.visitDate = indexOfValue;
  IndexOfVisitor.prototype.visitDateDay = indexOfValue;
  IndexOfVisitor.prototype.visitDateMillisecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimestamp = indexOfValue;
  IndexOfVisitor.prototype.visitTimestampSecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimestampMillisecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimestampMicrosecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimestampNanosecond = indexOfValue;
  IndexOfVisitor.prototype.visitTime = indexOfValue;
  IndexOfVisitor.prototype.visitTimeSecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimeMillisecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimeMicrosecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimeNanosecond = indexOfValue;
  IndexOfVisitor.prototype.visitDecimal = indexOfValue;
  IndexOfVisitor.prototype.visitList = indexOfValue;
  IndexOfVisitor.prototype.visitStruct = indexOfValue;
  IndexOfVisitor.prototype.visitUnion = indexOfValue;
  IndexOfVisitor.prototype.visitDenseUnion = indexOfUnion;
  IndexOfVisitor.prototype.visitSparseUnion = indexOfUnion;
  IndexOfVisitor.prototype.visitDictionary = indexOfValue;
  IndexOfVisitor.prototype.visitInterval = indexOfValue;
  IndexOfVisitor.prototype.visitIntervalDayTime = indexOfValue;
  IndexOfVisitor.prototype.visitIntervalYearMonth = indexOfValue;
  IndexOfVisitor.prototype.visitFixedSizeList = indexOfValue;
  IndexOfVisitor.prototype.visitMap = indexOfValue;
  var instance3 = new IndexOfVisitor();

  // ../../node_modules/apache-arrow/visitor/iterator.mjs
  var IteratorVisitor = class extends Visitor {
  };
  function vectorIterator(vector) {
    const { type } = vector;
    if (vector.nullCount === 0 && vector.stride === 1 && (type.typeId === Type.Timestamp || type instanceof Int_ && type.bitWidth !== 64 || type instanceof Time_ && type.bitWidth !== 64 || type instanceof Float && type.precision !== Precision.HALF)) {
      return new ChunkedIterator(vector.data.length, (chunkIndex) => {
        const data = vector.data[chunkIndex];
        return data.values.subarray(0, data.length)[Symbol.iterator]();
      });
    }
    let offset = 0;
    return new ChunkedIterator(vector.data.length, (chunkIndex) => {
      const data = vector.data[chunkIndex];
      const length = data.length;
      const inner = vector.slice(offset, offset + length);
      offset += length;
      return new VectorIterator(inner);
    });
  }
  var VectorIterator = class {
    constructor(vector) {
      this.vector = vector;
      this.index = 0;
    }
    next() {
      if (this.index < this.vector.length) {
        return {
          value: this.vector.get(this.index++)
        };
      }
      return { done: true, value: null };
    }
    [Symbol.iterator]() {
      return this;
    }
  };
  IteratorVisitor.prototype.visitNull = vectorIterator;
  IteratorVisitor.prototype.visitBool = vectorIterator;
  IteratorVisitor.prototype.visitInt = vectorIterator;
  IteratorVisitor.prototype.visitInt8 = vectorIterator;
  IteratorVisitor.prototype.visitInt16 = vectorIterator;
  IteratorVisitor.prototype.visitInt32 = vectorIterator;
  IteratorVisitor.prototype.visitInt64 = vectorIterator;
  IteratorVisitor.prototype.visitUint8 = vectorIterator;
  IteratorVisitor.prototype.visitUint16 = vectorIterator;
  IteratorVisitor.prototype.visitUint32 = vectorIterator;
  IteratorVisitor.prototype.visitUint64 = vectorIterator;
  IteratorVisitor.prototype.visitFloat = vectorIterator;
  IteratorVisitor.prototype.visitFloat16 = vectorIterator;
  IteratorVisitor.prototype.visitFloat32 = vectorIterator;
  IteratorVisitor.prototype.visitFloat64 = vectorIterator;
  IteratorVisitor.prototype.visitUtf8 = vectorIterator;
  IteratorVisitor.prototype.visitBinary = vectorIterator;
  IteratorVisitor.prototype.visitFixedSizeBinary = vectorIterator;
  IteratorVisitor.prototype.visitDate = vectorIterator;
  IteratorVisitor.prototype.visitDateDay = vectorIterator;
  IteratorVisitor.prototype.visitDateMillisecond = vectorIterator;
  IteratorVisitor.prototype.visitTimestamp = vectorIterator;
  IteratorVisitor.prototype.visitTimestampSecond = vectorIterator;
  IteratorVisitor.prototype.visitTimestampMillisecond = vectorIterator;
  IteratorVisitor.prototype.visitTimestampMicrosecond = vectorIterator;
  IteratorVisitor.prototype.visitTimestampNanosecond = vectorIterator;
  IteratorVisitor.prototype.visitTime = vectorIterator;
  IteratorVisitor.prototype.visitTimeSecond = vectorIterator;
  IteratorVisitor.prototype.visitTimeMillisecond = vectorIterator;
  IteratorVisitor.prototype.visitTimeMicrosecond = vectorIterator;
  IteratorVisitor.prototype.visitTimeNanosecond = vectorIterator;
  IteratorVisitor.prototype.visitDecimal = vectorIterator;
  IteratorVisitor.prototype.visitList = vectorIterator;
  IteratorVisitor.prototype.visitStruct = vectorIterator;
  IteratorVisitor.prototype.visitUnion = vectorIterator;
  IteratorVisitor.prototype.visitDenseUnion = vectorIterator;
  IteratorVisitor.prototype.visitSparseUnion = vectorIterator;
  IteratorVisitor.prototype.visitDictionary = vectorIterator;
  IteratorVisitor.prototype.visitInterval = vectorIterator;
  IteratorVisitor.prototype.visitIntervalDayTime = vectorIterator;
  IteratorVisitor.prototype.visitIntervalYearMonth = vectorIterator;
  IteratorVisitor.prototype.visitFixedSizeList = vectorIterator;
  IteratorVisitor.prototype.visitMap = vectorIterator;
  var instance4 = new IteratorVisitor();

  // ../../node_modules/apache-arrow/visitor/bytelength.mjs
  var sum = (x, y) => x + y;
  var GetByteLengthVisitor = class extends Visitor {
    visitNull(____, _) {
      return 0;
    }
    visitInt(data, _) {
      return data.type.bitWidth / 8;
    }
    visitFloat(data, _) {
      return data.type.ArrayType.BYTES_PER_ELEMENT;
    }
    visitBool(____, _) {
      return 1 / 8;
    }
    visitDecimal(data, _) {
      return data.type.bitWidth / 8;
    }
    visitDate(data, _) {
      return (data.type.unit + 1) * 4;
    }
    visitTime(data, _) {
      return data.type.bitWidth / 8;
    }
    visitTimestamp(data, _) {
      return data.type.unit === TimeUnit.SECOND ? 4 : 8;
    }
    visitInterval(data, _) {
      return (data.type.unit + 1) * 4;
    }
    visitStruct(data, i) {
      return data.children.reduce((total, child) => total + instance5.visit(child, i), 0);
    }
    visitFixedSizeBinary(data, _) {
      return data.type.byteWidth;
    }
    visitMap(data, i) {
      return 8 + data.children.reduce((total, child) => total + instance5.visit(child, i), 0);
    }
    visitDictionary(data, i) {
      var _a5;
      return data.type.indices.bitWidth / 8 + (((_a5 = data.dictionary) === null || _a5 === void 0 ? void 0 : _a5.getByteLength(data.values[i])) || 0);
    }
  };
  var getUtf8ByteLength = ({ valueOffsets }, index) => {
    return 8 + (valueOffsets[index + 1] - valueOffsets[index]);
  };
  var getBinaryByteLength = ({ valueOffsets }, index) => {
    return 8 + (valueOffsets[index + 1] - valueOffsets[index]);
  };
  var getListByteLength = ({ valueOffsets, stride, children }, index) => {
    const child = children[0];
    const { [index * stride]: start } = valueOffsets;
    const { [index * stride + 1]: end } = valueOffsets;
    const visit = instance5.getVisitFn(child.type);
    const slice = child.slice(start, end - start);
    let size = 8;
    for (let idx = -1, len = end - start; ++idx < len; ) {
      size += visit(slice, idx);
    }
    return size;
  };
  var getFixedSizeListByteLength = ({ stride, children }, index) => {
    const child = children[0];
    const slice = child.slice(index * stride, stride);
    const visit = instance5.getVisitFn(child.type);
    let size = 0;
    for (let idx = -1, len = slice.length; ++idx < len; ) {
      size += visit(slice, idx);
    }
    return size;
  };
  var getUnionByteLength = (data, index) => {
    return data.type.mode === UnionMode.Dense ? getDenseUnionByteLength(data, index) : getSparseUnionByteLength(data, index);
  };
  var getDenseUnionByteLength = ({ type, children, typeIds, valueOffsets }, index) => {
    const childIndex = type.typeIdToChildIndex[typeIds[index]];
    return 8 + instance5.visit(children[childIndex], valueOffsets[index]);
  };
  var getSparseUnionByteLength = ({ children }, index) => {
    return 4 + instance5.visitMany(children, children.map(() => index)).reduce(sum, 0);
  };
  GetByteLengthVisitor.prototype.visitUtf8 = getUtf8ByteLength;
  GetByteLengthVisitor.prototype.visitBinary = getBinaryByteLength;
  GetByteLengthVisitor.prototype.visitList = getListByteLength;
  GetByteLengthVisitor.prototype.visitFixedSizeList = getFixedSizeListByteLength;
  GetByteLengthVisitor.prototype.visitUnion = getUnionByteLength;
  GetByteLengthVisitor.prototype.visitDenseUnion = getDenseUnionByteLength;
  GetByteLengthVisitor.prototype.visitSparseUnion = getSparseUnionByteLength;
  var instance5 = new GetByteLengthVisitor();

  // ../../node_modules/apache-arrow/vector.mjs
  var _a2;
  var visitorsByTypeId = {};
  var vectorPrototypesByTypeId = {};
  var Vector = class _Vector {
    constructor(input) {
      var _b2, _c2, _d2;
      const data = input[0] instanceof _Vector ? input.flatMap((x) => x.data) : input;
      if (data.length === 0 || data.some((x) => !(x instanceof Data))) {
        throw new TypeError("Vector constructor expects an Array of Data instances.");
      }
      const type = (_b2 = data[0]) === null || _b2 === void 0 ? void 0 : _b2.type;
      switch (data.length) {
        case 0:
          this._offsets = [0];
          break;
        case 1: {
          const { get, set, indexOf, byteLength } = visitorsByTypeId[type.typeId];
          const unchunkedData = data[0];
          this.isValid = (index) => isChunkedValid(unchunkedData, index);
          this.get = (index) => get(unchunkedData, index);
          this.set = (index, value) => set(unchunkedData, index, value);
          this.indexOf = (index) => indexOf(unchunkedData, index);
          this.getByteLength = (index) => byteLength(unchunkedData, index);
          this._offsets = [0, unchunkedData.length];
          break;
        }
        default:
          Object.setPrototypeOf(this, vectorPrototypesByTypeId[type.typeId]);
          this._offsets = computeChunkOffsets(data);
          break;
      }
      this.data = data;
      this.type = type;
      this.stride = strideForType(type);
      this.numChildren = (_d2 = (_c2 = type.children) === null || _c2 === void 0 ? void 0 : _c2.length) !== null && _d2 !== void 0 ? _d2 : 0;
      this.length = this._offsets.at(-1);
    }
    /**
     * The aggregate size (in bytes) of this Vector's buffers and/or child Vectors.
     */
    get byteLength() {
      if (this._byteLength === -1) {
        this._byteLength = this.data.reduce((byteLength, data) => byteLength + data.byteLength, 0);
      }
      return this._byteLength;
    }
    /**
     * The number of null elements in this Vector.
     */
    get nullCount() {
      if (this._nullCount === -1) {
        this._nullCount = computeChunkNullCounts(this.data);
      }
      return this._nullCount;
    }
    /**
     * The Array or TypedArray constructor used for the JS representation
     *  of the element's values in {@link Vector.prototype.toArray `toArray()`}.
     */
    get ArrayType() {
      return this.type.ArrayType;
    }
    /**
     * The name that should be printed when the Vector is logged in a message.
     */
    get [Symbol.toStringTag]() {
      return `${this.VectorName}<${this.type[Symbol.toStringTag]}>`;
    }
    /**
     * The name of this Vector.
     */
    get VectorName() {
      return `${Type[this.type.typeId]}Vector`;
    }
    /**
     * Check whether an element is null.
     * @param index The index at which to read the validity bitmap.
     */
    // @ts-ignore
    isValid(index) {
      return false;
    }
    /**
     * Get an element value by position.
     * @param index The index of the element to read.
     */
    // @ts-ignore
    get(index) {
      return null;
    }
    /**
     * Set an element value by position.
     * @param index The index of the element to write.
     * @param value The value to set.
     */
    // @ts-ignore
    set(index, value) {
      return;
    }
    /**
     * Retrieve the index of the first occurrence of a value in an Vector.
     * @param element The value to locate in the Vector.
     * @param offset The index at which to begin the search. If offset is omitted, the search starts at index 0.
     */
    // @ts-ignore
    indexOf(element, offset) {
      return -1;
    }
    includes(element, offset) {
      return this.indexOf(element, offset) > 0;
    }
    /**
     * Get the size in bytes of an element by index.
     * @param index The index at which to get the byteLength.
     */
    // @ts-ignore
    getByteLength(index) {
      return 0;
    }
    /**
     * Iterator for the Vector's elements.
     */
    [Symbol.iterator]() {
      return instance4.visit(this);
    }
    /**
     * Combines two or more Vectors of the same type.
     * @param others Additional Vectors to add to the end of this Vector.
     */
    concat(...others) {
      return new _Vector(this.data.concat(others.flatMap((x) => x.data).flat(Number.POSITIVE_INFINITY)));
    }
    /**
     * Return a zero-copy sub-section of this Vector.
     * @param start The beginning of the specified portion of the Vector.
     * @param end The end of the specified portion of the Vector. This is exclusive of the element at the index 'end'.
     */
    slice(begin, end) {
      return new _Vector(clampRange(this, begin, end, ({ data, _offsets }, begin2, end2) => sliceChunks(data, _offsets, begin2, end2)));
    }
    toJSON() {
      return [...this];
    }
    /**
     * Return a JavaScript Array or TypedArray of the Vector's elements.
     *
     * @note If this Vector contains a single Data chunk and the Vector's type is a
     *  primitive numeric type corresponding to one of the JavaScript TypedArrays, this
     *  method returns a zero-copy slice of the underlying TypedArray values. If there's
     *  more than one chunk, the resulting TypedArray will be a copy of the data from each
     *  chunk's underlying TypedArray values.
     *
     * @returns An Array or TypedArray of the Vector's elements, based on the Vector's DataType.
     */
    toArray() {
      const { type, data, length, stride, ArrayType } = this;
      switch (type.typeId) {
        case Type.Int:
        case Type.Float:
        case Type.Decimal:
        case Type.Time:
        case Type.Timestamp:
          switch (data.length) {
            case 0:
              return new ArrayType();
            case 1:
              return data[0].values.subarray(0, length * stride);
            default:
              return data.reduce((memo, { values, length: chunk_length }) => {
                memo.array.set(values.subarray(0, chunk_length * stride), memo.offset);
                memo.offset += chunk_length * stride;
                return memo;
              }, { array: new ArrayType(length * stride), offset: 0 }).array;
          }
      }
      return [...this];
    }
    /**
     * Returns a string representation of the Vector.
     *
     * @returns A string representation of the Vector.
     */
    toString() {
      return `[${[...this].join(",")}]`;
    }
    /**
     * Returns a child Vector by name, or null if this Vector has no child with the given name.
     * @param name The name of the child to retrieve.
     */
    getChild(name) {
      var _b2;
      return this.getChildAt((_b2 = this.type.children) === null || _b2 === void 0 ? void 0 : _b2.findIndex((f) => f.name === name));
    }
    /**
     * Returns a child Vector by index, or null if this Vector has no child at the supplied index.
     * @param index The index of the child to retrieve.
     */
    getChildAt(index) {
      if (index > -1 && index < this.numChildren) {
        return new _Vector(this.data.map(({ children }) => children[index]));
      }
      return null;
    }
    get isMemoized() {
      if (DataType.isDictionary(this.type)) {
        return this.data[0].dictionary.isMemoized;
      }
      return false;
    }
    /**
     * Adds memoization to the Vector's {@link get} method. For dictionary
     * vectors, this method return a vector that memoizes only the dictionary
     * values.
     *
     * Memoization is very useful when decoding a value is expensive such as
     * Uft8. The memoization creates a cache of the size of the Vector and
     * therfore increases memory usage.
     *
     * @returns A new vector that memoizes calls to {@link get}.
     */
    memoize() {
      if (DataType.isDictionary(this.type)) {
        const dictionary = new MemoizedVector(this.data[0].dictionary);
        const newData = this.data.map((data) => {
          const cloned = data.clone();
          cloned.dictionary = dictionary;
          return cloned;
        });
        return new _Vector(newData);
      }
      return new MemoizedVector(this);
    }
    /**
     * Returns a vector without memoization of the {@link get} method. If this
     * vector is not memoized, this method returns this vector.
     *
     * @returns A a vector without memoization.
     */
    unmemoize() {
      if (DataType.isDictionary(this.type) && this.isMemoized) {
        const dictionary = this.data[0].dictionary.unmemoize();
        const newData = this.data.map((data) => {
          const newData2 = data.clone();
          newData2.dictionary = dictionary;
          return newData2;
        });
        return new _Vector(newData);
      }
      return this;
    }
  };
  _a2 = Symbol.toStringTag;
  Vector[_a2] = ((proto) => {
    proto.type = DataType.prototype;
    proto.data = [];
    proto.length = 0;
    proto.stride = 1;
    proto.numChildren = 0;
    proto._nullCount = -1;
    proto._byteLength = -1;
    proto._offsets = new Uint32Array([0]);
    proto[Symbol.isConcatSpreadable] = true;
    const typeIds = Object.keys(Type).map((T) => Type[T]).filter((T) => typeof T === "number" && T !== Type.NONE);
    for (const typeId of typeIds) {
      const get = instance2.getVisitFnByTypeId(typeId);
      const set = instance.getVisitFnByTypeId(typeId);
      const indexOf = instance3.getVisitFnByTypeId(typeId);
      const byteLength = instance5.getVisitFnByTypeId(typeId);
      visitorsByTypeId[typeId] = { get, set, indexOf, byteLength };
      vectorPrototypesByTypeId[typeId] = Object.create(proto, {
        ["isValid"]: { value: wrapChunkedCall1(isChunkedValid) },
        ["get"]: { value: wrapChunkedCall1(instance2.getVisitFnByTypeId(typeId)) },
        ["set"]: { value: wrapChunkedCall2(instance.getVisitFnByTypeId(typeId)) },
        ["indexOf"]: { value: wrapChunkedIndexOf(instance3.getVisitFnByTypeId(typeId)) },
        ["getByteLength"]: { value: wrapChunkedCall1(instance5.getVisitFnByTypeId(typeId)) }
      });
    }
    return "Vector";
  })(Vector.prototype);
  var MemoizedVector = class _MemoizedVector extends Vector {
    constructor(vector) {
      super(vector.data);
      const get = this.get;
      const set = this.set;
      const slice = this.slice;
      const cache = new Array(this.length);
      Object.defineProperty(this, "get", {
        value(index) {
          const cachedValue = cache[index];
          if (cachedValue !== void 0) {
            return cachedValue;
          }
          const value = get.call(this, index);
          cache[index] = value;
          return value;
        }
      });
      Object.defineProperty(this, "set", {
        value(index, value) {
          set.call(this, index, value);
          cache[index] = value;
        }
      });
      Object.defineProperty(this, "slice", {
        value: (begin, end) => new _MemoizedVector(slice.call(this, begin, end))
      });
      Object.defineProperty(this, "isMemoized", { value: true });
      Object.defineProperty(this, "unmemoize", {
        value: () => new Vector(this.data)
      });
      Object.defineProperty(this, "memoize", {
        value: () => this
      });
    }
  };
  function makeVector(init) {
    if (init) {
      if (init instanceof Data) {
        return new Vector([init]);
      }
      if (init instanceof Vector) {
        return new Vector(init.data);
      }
      if (init.type instanceof DataType) {
        return new Vector([makeData(init)]);
      }
      if (Array.isArray(init)) {
        return new Vector(init.flatMap((v) => unwrapInputs(v)));
      }
      if (ArrayBuffer.isView(init)) {
        if (init instanceof DataView) {
          init = new Uint8Array(init.buffer);
        }
        const props = { offset: 0, length: init.length, nullCount: 0, data: init };
        if (init instanceof Int8Array) {
          return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Int8() }))]);
        }
        if (init instanceof Int16Array) {
          return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Int16() }))]);
        }
        if (init instanceof Int32Array) {
          return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Int32() }))]);
        }
        if (init instanceof BigInt64Array) {
          return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Int64() }))]);
        }
        if (init instanceof Uint8Array || init instanceof Uint8ClampedArray) {
          return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Uint8() }))]);
        }
        if (init instanceof Uint16Array) {
          return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Uint16() }))]);
        }
        if (init instanceof Uint32Array) {
          return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Uint32() }))]);
        }
        if (init instanceof BigUint64Array) {
          return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Uint64() }))]);
        }
        if (init instanceof Float32Array) {
          return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Float32() }))]);
        }
        if (init instanceof Float64Array) {
          return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Float64() }))]);
        }
        throw new Error("Unrecognized input");
      }
    }
    throw new Error("Unrecognized input");
  }
  function unwrapInputs(x) {
    return x instanceof Data ? [x] : x instanceof Vector ? x.data : makeVector(x).data;
  }

  // ../../node_modules/apache-arrow/builder/valid.mjs
  function createIsValidFunction(nullValues) {
    if (!nullValues || nullValues.length <= 0) {
      return function isValid(value) {
        return true;
      };
    }
    let fnBody = "";
    const noNaNs = nullValues.filter((x) => x === x);
    if (noNaNs.length > 0) {
      fnBody = `
    switch (x) {${noNaNs.map((x) => `
        case ${valueToCase(x)}:`).join("")}
            return false;
    }`;
    }
    if (nullValues.length !== noNaNs.length) {
      fnBody = `if (x !== x) return false;
${fnBody}`;
    }
    return new Function(`x`, `${fnBody}
return true;`);
  }
  function valueToCase(x) {
    if (typeof x !== "bigint") {
      return valueToString(x);
    }
    return `${valueToString(x)}n`;
  }

  // ../../node_modules/apache-arrow/builder/buffer.mjs
  var roundLengthUpToNearest64Bytes = (len, BPE) => (Math.ceil(len) * BPE + 63 & ~63 || 64) / BPE;
  var sliceOrExtendArray = (arr, len = 0) => arr.length >= len ? arr.subarray(0, len) : memcpy(new arr.constructor(len), arr, 0);
  var BufferBuilder = class {
    constructor(buffer, stride = 1) {
      this.buffer = buffer;
      this.stride = stride;
      this.BYTES_PER_ELEMENT = buffer.BYTES_PER_ELEMENT;
      this.ArrayType = buffer.constructor;
      this._resize(this.length = Math.ceil(buffer.length / stride));
    }
    get byteLength() {
      return Math.ceil(this.length * this.stride) * this.BYTES_PER_ELEMENT;
    }
    get reservedLength() {
      return this.buffer.length / this.stride;
    }
    get reservedByteLength() {
      return this.buffer.byteLength;
    }
    // @ts-ignore
    set(index, value) {
      return this;
    }
    append(value) {
      return this.set(this.length, value);
    }
    reserve(extra) {
      if (extra > 0) {
        this.length += extra;
        const stride = this.stride;
        const length = this.length * stride;
        const reserved = this.buffer.length;
        if (length >= reserved) {
          this._resize(reserved === 0 ? roundLengthUpToNearest64Bytes(length * 1, this.BYTES_PER_ELEMENT) : roundLengthUpToNearest64Bytes(length * 2, this.BYTES_PER_ELEMENT));
        }
      }
      return this;
    }
    flush(length = this.length) {
      length = roundLengthUpToNearest64Bytes(length * this.stride, this.BYTES_PER_ELEMENT);
      const array = sliceOrExtendArray(this.buffer, length);
      this.clear();
      return array;
    }
    clear() {
      this.length = 0;
      this._resize(0);
      return this;
    }
    _resize(newLength) {
      return this.buffer = memcpy(new this.ArrayType(newLength), this.buffer);
    }
  };
  BufferBuilder.prototype.offset = 0;
  var DataBufferBuilder = class extends BufferBuilder {
    last() {
      return this.get(this.length - 1);
    }
    get(index) {
      return this.buffer[index];
    }
    set(index, value) {
      this.reserve(index - this.length + 1);
      this.buffer[index * this.stride] = value;
      return this;
    }
  };
  var BitmapBufferBuilder = class extends DataBufferBuilder {
    constructor(data = new Uint8Array(0)) {
      super(data, 1 / 8);
      this.numValid = 0;
    }
    get numInvalid() {
      return this.length - this.numValid;
    }
    get(idx) {
      return this.buffer[idx >> 3] >> idx % 8 & 1;
    }
    set(idx, val) {
      const { buffer } = this.reserve(idx - this.length + 1);
      const byte = idx >> 3, bit = idx % 8, cur = buffer[byte] >> bit & 1;
      val ? cur === 0 && (buffer[byte] |= 1 << bit, ++this.numValid) : cur === 1 && (buffer[byte] &= ~(1 << bit), --this.numValid);
      return this;
    }
    clear() {
      this.numValid = 0;
      return super.clear();
    }
  };
  var OffsetsBufferBuilder = class extends DataBufferBuilder {
    constructor(data = new Int32Array(1)) {
      super(data, 1);
    }
    append(value) {
      return this.set(this.length - 1, value);
    }
    set(index, value) {
      const offset = this.length - 1;
      const buffer = this.reserve(index - offset + 1).buffer;
      if (offset < index++) {
        buffer.fill(buffer[offset], offset, index);
      }
      buffer[index] = buffer[index - 1] + value;
      return this;
    }
    flush(length = this.length - 1) {
      if (length > this.length) {
        this.set(length - 1, 0);
      }
      return super.flush(length + 1);
    }
  };

  // ../../node_modules/apache-arrow/builder.mjs
  var Builder = class {
    /** @nocollapse */
    // @ts-ignore
    static throughNode(options) {
      throw new Error(`"throughNode" not available in this environment`);
    }
    /** @nocollapse */
    // @ts-ignore
    static throughDOM(options) {
      throw new Error(`"throughDOM" not available in this environment`);
    }
    /**
     * Construct a builder with the given Arrow DataType with optional null values,
     * which will be interpreted as "null" when set or appended to the `Builder`.
     * @param {{ type: T, nullValues?: any[] }} options A `BuilderOptions` object used to create this `Builder`.
     */
    constructor({ "type": type, "nullValues": nulls }) {
      this.length = 0;
      this.finished = false;
      this.type = type;
      this.children = [];
      this.nullValues = nulls;
      this.stride = strideForType(type);
      this._nulls = new BitmapBufferBuilder();
      if (nulls && nulls.length > 0) {
        this._isValid = createIsValidFunction(nulls);
      }
    }
    /**
     * Flush the `Builder` and return a `Vector<T>`.
     * @returns {Vector<T>} A `Vector<T>` of the flushed values.
     */
    toVector() {
      return new Vector([this.flush()]);
    }
    get ArrayType() {
      return this.type.ArrayType;
    }
    get nullCount() {
      return this._nulls.numInvalid;
    }
    get numChildren() {
      return this.children.length;
    }
    /**
     * @returns The aggregate length (in bytes) of the values that have been written.
     */
    get byteLength() {
      let size = 0;
      const { _offsets, _values, _nulls, _typeIds, children } = this;
      _offsets && (size += _offsets.byteLength);
      _values && (size += _values.byteLength);
      _nulls && (size += _nulls.byteLength);
      _typeIds && (size += _typeIds.byteLength);
      return children.reduce((size2, child) => size2 + child.byteLength, size);
    }
    /**
     * @returns The aggregate number of rows that have been reserved to write new values.
     */
    get reservedLength() {
      return this._nulls.reservedLength;
    }
    /**
     * @returns The aggregate length (in bytes) that has been reserved to write new values.
     */
    get reservedByteLength() {
      let size = 0;
      this._offsets && (size += this._offsets.reservedByteLength);
      this._values && (size += this._values.reservedByteLength);
      this._nulls && (size += this._nulls.reservedByteLength);
      this._typeIds && (size += this._typeIds.reservedByteLength);
      return this.children.reduce((size2, child) => size2 + child.reservedByteLength, size);
    }
    get valueOffsets() {
      return this._offsets ? this._offsets.buffer : null;
    }
    get values() {
      return this._values ? this._values.buffer : null;
    }
    get nullBitmap() {
      return this._nulls ? this._nulls.buffer : null;
    }
    get typeIds() {
      return this._typeIds ? this._typeIds.buffer : null;
    }
    /**
     * Appends a value (or null) to this `Builder`.
     * This is equivalent to `builder.set(builder.length, value)`.
     * @param {T['TValue'] | TNull } value The value to append.
     */
    append(value) {
      return this.set(this.length, value);
    }
    /**
     * Validates whether a value is valid (true), or null (false)
     * @param {T['TValue'] | TNull } value The value to compare against null the value representations
     */
    isValid(value) {
      return this._isValid(value);
    }
    /**
     * Write a value (or null-value sentinel) at the supplied index.
     * If the value matches one of the null-value representations, a 1-bit is
     * written to the null `BitmapBufferBuilder`. Otherwise, a 0 is written to
     * the null `BitmapBufferBuilder`, and the value is passed to
     * `Builder.prototype.setValue()`.
     * @param {number} index The index of the value to write.
     * @param {T['TValue'] | TNull } value The value to write at the supplied index.
     * @returns {this} The updated `Builder` instance.
     */
    set(index, value) {
      if (this.setValid(index, this.isValid(value))) {
        this.setValue(index, value);
      }
      return this;
    }
    /**
     * Write a value to the underlying buffers at the supplied index, bypassing
     * the null-value check. This is a low-level method that
     * @param {number} index
     * @param {T['TValue'] | TNull } value
     */
    setValue(index, value) {
      this._setValue(this, index, value);
    }
    setValid(index, valid) {
      this.length = this._nulls.set(index, +valid).length;
      return valid;
    }
    // @ts-ignore
    addChild(child, name = `${this.numChildren}`) {
      throw new Error(`Cannot append children to non-nested type "${this.type}"`);
    }
    /**
     * Retrieve the child `Builder` at the supplied `index`, or null if no child
     * exists at that index.
     * @param {number} index The index of the child `Builder` to retrieve.
     * @returns {Builder | null} The child Builder at the supplied index or null.
     */
    getChildAt(index) {
      return this.children[index] || null;
    }
    /**
     * Commit all the values that have been written to their underlying
     * ArrayBuffers, including any child Builders if applicable, and reset
     * the internal `Builder` state.
     * @returns A `Data<T>` of the buffers and children representing the values written.
     */
    flush() {
      let data;
      let typeIds;
      let nullBitmap;
      let valueOffsets;
      const { type, length, nullCount, _typeIds, _offsets, _values, _nulls } = this;
      if (typeIds = _typeIds === null || _typeIds === void 0 ? void 0 : _typeIds.flush(length)) {
        valueOffsets = _offsets === null || _offsets === void 0 ? void 0 : _offsets.flush(length);
      } else if (valueOffsets = _offsets === null || _offsets === void 0 ? void 0 : _offsets.flush(length)) {
        data = _values === null || _values === void 0 ? void 0 : _values.flush(_offsets.last());
      } else {
        data = _values === null || _values === void 0 ? void 0 : _values.flush(length);
      }
      if (nullCount > 0) {
        nullBitmap = _nulls === null || _nulls === void 0 ? void 0 : _nulls.flush(length);
      }
      const children = this.children.map((child) => child.flush());
      this.clear();
      return makeData({
        type,
        length,
        nullCount,
        children,
        "child": children[0],
        data,
        typeIds,
        nullBitmap,
        valueOffsets
      });
    }
    /**
     * Finalize this `Builder`, and child builders if applicable.
     * @returns {this} The finalized `Builder` instance.
     */
    finish() {
      this.finished = true;
      for (const child of this.children)
        child.finish();
      return this;
    }
    /**
     * Clear this Builder's internal state, including child Builders if applicable, and reset the length to 0.
     * @returns {this} The cleared `Builder` instance.
     */
    clear() {
      var _a5, _b2, _c2, _d2;
      this.length = 0;
      (_a5 = this._nulls) === null || _a5 === void 0 ? void 0 : _a5.clear();
      (_b2 = this._values) === null || _b2 === void 0 ? void 0 : _b2.clear();
      (_c2 = this._offsets) === null || _c2 === void 0 ? void 0 : _c2.clear();
      (_d2 = this._typeIds) === null || _d2 === void 0 ? void 0 : _d2.clear();
      for (const child of this.children)
        child.clear();
      return this;
    }
  };
  Builder.prototype.length = 1;
  Builder.prototype.stride = 1;
  Builder.prototype.children = null;
  Builder.prototype.finished = false;
  Builder.prototype.nullValues = null;
  Builder.prototype._isValid = () => true;
  var FixedWidthBuilder = class extends Builder {
    constructor(opts) {
      super(opts);
      this._values = new DataBufferBuilder(new this.ArrayType(0), this.stride);
    }
    setValue(index, value) {
      const values = this._values;
      values.reserve(index - values.length + 1);
      return super.setValue(index, value);
    }
  };
  var VariableWidthBuilder = class extends Builder {
    constructor(opts) {
      super(opts);
      this._pendingLength = 0;
      this._offsets = new OffsetsBufferBuilder();
    }
    setValue(index, value) {
      const pending = this._pending || (this._pending = /* @__PURE__ */ new Map());
      const current = pending.get(index);
      current && (this._pendingLength -= current.length);
      this._pendingLength += value instanceof MapRow ? value[kKeys].length : value.length;
      pending.set(index, value);
    }
    setValid(index, isValid) {
      if (!super.setValid(index, isValid)) {
        (this._pending || (this._pending = /* @__PURE__ */ new Map())).set(index, void 0);
        return false;
      }
      return true;
    }
    clear() {
      this._pendingLength = 0;
      this._pending = void 0;
      return super.clear();
    }
    flush() {
      this._flush();
      return super.flush();
    }
    finish() {
      this._flush();
      return super.finish();
    }
    _flush() {
      const pending = this._pending;
      const pendingLength = this._pendingLength;
      this._pendingLength = 0;
      this._pending = void 0;
      if (pending && pending.size > 0) {
        this._flushPending(pending, pendingLength);
      }
      return this;
    }
  };

  // ../../node_modules/apache-arrow/fb/block.mjs
  var Block = class {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    /**
     * Index to the start of the RecordBlock (note this is past the Message header)
     */
    offset() {
      return this.bb.readInt64(this.bb_pos);
    }
    /**
     * Length of the metadata
     */
    metaDataLength() {
      return this.bb.readInt32(this.bb_pos + 8);
    }
    /**
     * Length of the data (this is aligned so there can be a gap between this and
     * the metadata).
     */
    bodyLength() {
      return this.bb.readInt64(this.bb_pos + 16);
    }
    static sizeOf() {
      return 24;
    }
    static createBlock(builder, offset, metaDataLength, bodyLength) {
      builder.prep(8, 24);
      builder.writeInt64(BigInt(bodyLength !== null && bodyLength !== void 0 ? bodyLength : 0));
      builder.pad(4);
      builder.writeInt32(metaDataLength);
      builder.writeInt64(BigInt(offset !== null && offset !== void 0 ? offset : 0));
      return builder.offset();
    }
  };

  // ../../node_modules/flatbuffers/mjs/constants.js
  var SIZEOF_SHORT = 2;
  var SIZEOF_INT = 4;
  var FILE_IDENTIFIER_LENGTH = 4;
  var SIZE_PREFIX_LENGTH = 4;

  // ../../node_modules/flatbuffers/mjs/utils.js
  var int32 = new Int32Array(2);
  var float32 = new Float32Array(int32.buffer);
  var float64 = new Float64Array(int32.buffer);
  var isLittleEndian = new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;

  // ../../node_modules/flatbuffers/mjs/encoding.js
  var Encoding;
  (function(Encoding2) {
    Encoding2[Encoding2["UTF8_BYTES"] = 1] = "UTF8_BYTES";
    Encoding2[Encoding2["UTF16_STRING"] = 2] = "UTF16_STRING";
  })(Encoding || (Encoding = {}));

  // ../../node_modules/flatbuffers/mjs/byte-buffer.js
  var ByteBuffer = class _ByteBuffer {
    /**
     * Create a new ByteBuffer with a given array of bytes (`Uint8Array`)
     */
    constructor(bytes_) {
      this.bytes_ = bytes_;
      this.position_ = 0;
      this.text_decoder_ = new TextDecoder();
    }
    /**
     * Create and allocate a new ByteBuffer with a given size.
     */
    static allocate(byte_size) {
      return new _ByteBuffer(new Uint8Array(byte_size));
    }
    clear() {
      this.position_ = 0;
    }
    /**
     * Get the underlying `Uint8Array`.
     */
    bytes() {
      return this.bytes_;
    }
    /**
     * Get the buffer's position.
     */
    position() {
      return this.position_;
    }
    /**
     * Set the buffer's position.
     */
    setPosition(position) {
      this.position_ = position;
    }
    /**
     * Get the buffer's capacity.
     */
    capacity() {
      return this.bytes_.length;
    }
    readInt8(offset) {
      return this.readUint8(offset) << 24 >> 24;
    }
    readUint8(offset) {
      return this.bytes_[offset];
    }
    readInt16(offset) {
      return this.readUint16(offset) << 16 >> 16;
    }
    readUint16(offset) {
      return this.bytes_[offset] | this.bytes_[offset + 1] << 8;
    }
    readInt32(offset) {
      return this.bytes_[offset] | this.bytes_[offset + 1] << 8 | this.bytes_[offset + 2] << 16 | this.bytes_[offset + 3] << 24;
    }
    readUint32(offset) {
      return this.readInt32(offset) >>> 0;
    }
    readInt64(offset) {
      return BigInt.asIntN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
    }
    readUint64(offset) {
      return BigInt.asUintN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
    }
    readFloat32(offset) {
      int32[0] = this.readInt32(offset);
      return float32[0];
    }
    readFloat64(offset) {
      int32[isLittleEndian ? 0 : 1] = this.readInt32(offset);
      int32[isLittleEndian ? 1 : 0] = this.readInt32(offset + 4);
      return float64[0];
    }
    writeInt8(offset, value) {
      this.bytes_[offset] = value;
    }
    writeUint8(offset, value) {
      this.bytes_[offset] = value;
    }
    writeInt16(offset, value) {
      this.bytes_[offset] = value;
      this.bytes_[offset + 1] = value >> 8;
    }
    writeUint16(offset, value) {
      this.bytes_[offset] = value;
      this.bytes_[offset + 1] = value >> 8;
    }
    writeInt32(offset, value) {
      this.bytes_[offset] = value;
      this.bytes_[offset + 1] = value >> 8;
      this.bytes_[offset + 2] = value >> 16;
      this.bytes_[offset + 3] = value >> 24;
    }
    writeUint32(offset, value) {
      this.bytes_[offset] = value;
      this.bytes_[offset + 1] = value >> 8;
      this.bytes_[offset + 2] = value >> 16;
      this.bytes_[offset + 3] = value >> 24;
    }
    writeInt64(offset, value) {
      this.writeInt32(offset, Number(BigInt.asIntN(32, value)));
      this.writeInt32(offset + 4, Number(BigInt.asIntN(32, value >> BigInt(32))));
    }
    writeUint64(offset, value) {
      this.writeUint32(offset, Number(BigInt.asUintN(32, value)));
      this.writeUint32(offset + 4, Number(BigInt.asUintN(32, value >> BigInt(32))));
    }
    writeFloat32(offset, value) {
      float32[0] = value;
      this.writeInt32(offset, int32[0]);
    }
    writeFloat64(offset, value) {
      float64[0] = value;
      this.writeInt32(offset, int32[isLittleEndian ? 0 : 1]);
      this.writeInt32(offset + 4, int32[isLittleEndian ? 1 : 0]);
    }
    /**
     * Return the file identifier.   Behavior is undefined for FlatBuffers whose
     * schema does not include a file_identifier (likely points at padding or the
     * start of a the root vtable).
     */
    getBufferIdentifier() {
      if (this.bytes_.length < this.position_ + SIZEOF_INT + FILE_IDENTIFIER_LENGTH) {
        throw new Error("FlatBuffers: ByteBuffer is too short to contain an identifier.");
      }
      let result = "";
      for (let i = 0; i < FILE_IDENTIFIER_LENGTH; i++) {
        result += String.fromCharCode(this.readInt8(this.position_ + SIZEOF_INT + i));
      }
      return result;
    }
    /**
     * Look up a field in the vtable, return an offset into the object, or 0 if the
     * field is not present.
     */
    __offset(bb_pos, vtable_offset) {
      const vtable = bb_pos - this.readInt32(bb_pos);
      return vtable_offset < this.readInt16(vtable) ? this.readInt16(vtable + vtable_offset) : 0;
    }
    /**
     * Initialize any Table-derived type to point to the union at the given offset.
     */
    __union(t, offset) {
      t.bb_pos = offset + this.readInt32(offset);
      t.bb = this;
      return t;
    }
    /**
     * Create a JavaScript string from UTF-8 data stored inside the FlatBuffer.
     * This allocates a new string and converts to wide chars upon each access.
     *
     * To avoid the conversion to string, pass Encoding.UTF8_BYTES as the
     * "optionalEncoding" argument. This is useful for avoiding conversion when
     * the data will just be packaged back up in another FlatBuffer later on.
     *
     * @param offset
     * @param opt_encoding Defaults to UTF16_STRING
     */
    __string(offset, opt_encoding) {
      offset += this.readInt32(offset);
      const length = this.readInt32(offset);
      offset += SIZEOF_INT;
      const utf8bytes = this.bytes_.subarray(offset, offset + length);
      if (opt_encoding === Encoding.UTF8_BYTES)
        return utf8bytes;
      else
        return this.text_decoder_.decode(utf8bytes);
    }
    /**
     * Handle unions that can contain string as its member, if a Table-derived type then initialize it,
     * if a string then return a new one
     *
     * WARNING: strings are immutable in JS so we can't change the string that the user gave us, this
     * makes the behaviour of __union_with_string different compared to __union
     */
    __union_with_string(o, offset) {
      if (typeof o === "string") {
        return this.__string(offset);
      }
      return this.__union(o, offset);
    }
    /**
     * Retrieve the relative offset stored at "offset"
     */
    __indirect(offset) {
      return offset + this.readInt32(offset);
    }
    /**
     * Get the start of data of a vector whose offset is stored at "offset" in this object.
     */
    __vector(offset) {
      return offset + this.readInt32(offset) + SIZEOF_INT;
    }
    /**
     * Get the length of a vector whose offset is stored at "offset" in this object.
     */
    __vector_len(offset) {
      return this.readInt32(offset + this.readInt32(offset));
    }
    __has_identifier(ident) {
      if (ident.length != FILE_IDENTIFIER_LENGTH) {
        throw new Error("FlatBuffers: file identifier must be length " + FILE_IDENTIFIER_LENGTH);
      }
      for (let i = 0; i < FILE_IDENTIFIER_LENGTH; i++) {
        if (ident.charCodeAt(i) != this.readInt8(this.position() + SIZEOF_INT + i)) {
          return false;
        }
      }
      return true;
    }
    /**
     * A helper function for generating list for obj api
     */
    createScalarList(listAccessor, listLength) {
      const ret = [];
      for (let i = 0; i < listLength; ++i) {
        const val = listAccessor(i);
        if (val !== null) {
          ret.push(val);
        }
      }
      return ret;
    }
    /**
     * A helper function for generating list for obj api
     * @param listAccessor function that accepts an index and return data at that index
     * @param listLength listLength
     * @param res result list
     */
    createObjList(listAccessor, listLength) {
      const ret = [];
      for (let i = 0; i < listLength; ++i) {
        const val = listAccessor(i);
        if (val !== null) {
          ret.push(val.unpack());
        }
      }
      return ret;
    }
  };

  // ../../node_modules/flatbuffers/mjs/builder.js
  var Builder2 = class _Builder {
    /**
     * Create a FlatBufferBuilder.
     */
    constructor(opt_initial_size) {
      this.minalign = 1;
      this.vtable = null;
      this.vtable_in_use = 0;
      this.isNested = false;
      this.object_start = 0;
      this.vtables = [];
      this.vector_num_elems = 0;
      this.force_defaults = false;
      this.string_maps = null;
      this.text_encoder = new TextEncoder();
      let initial_size;
      if (!opt_initial_size) {
        initial_size = 1024;
      } else {
        initial_size = opt_initial_size;
      }
      this.bb = ByteBuffer.allocate(initial_size);
      this.space = initial_size;
    }
    clear() {
      this.bb.clear();
      this.space = this.bb.capacity();
      this.minalign = 1;
      this.vtable = null;
      this.vtable_in_use = 0;
      this.isNested = false;
      this.object_start = 0;
      this.vtables = [];
      this.vector_num_elems = 0;
      this.force_defaults = false;
      this.string_maps = null;
    }
    /**
     * In order to save space, fields that are set to their default value
     * don't get serialized into the buffer. Forcing defaults provides a
     * way to manually disable this optimization.
     *
     * @param forceDefaults true always serializes default values
     */
    forceDefaults(forceDefaults) {
      this.force_defaults = forceDefaults;
    }
    /**
     * Get the ByteBuffer representing the FlatBuffer. Only call this after you've
     * called finish(). The actual data starts at the ByteBuffer's current position,
     * not necessarily at 0.
     */
    dataBuffer() {
      return this.bb;
    }
    /**
     * Get the bytes representing the FlatBuffer. Only call this after you've
     * called finish().
     */
    asUint8Array() {
      return this.bb.bytes().subarray(this.bb.position(), this.bb.position() + this.offset());
    }
    /**
     * Prepare to write an element of `size` after `additional_bytes` have been
     * written, e.g. if you write a string, you need to align such the int length
     * field is aligned to 4 bytes, and the string data follows it directly. If all
     * you need to do is alignment, `additional_bytes` will be 0.
     *
     * @param size This is the of the new element to write
     * @param additional_bytes The padding size
     */
    prep(size, additional_bytes) {
      if (size > this.minalign) {
        this.minalign = size;
      }
      const align_size = ~(this.bb.capacity() - this.space + additional_bytes) + 1 & size - 1;
      while (this.space < align_size + size + additional_bytes) {
        const old_buf_size = this.bb.capacity();
        this.bb = _Builder.growByteBuffer(this.bb);
        this.space += this.bb.capacity() - old_buf_size;
      }
      this.pad(align_size);
    }
    pad(byte_size) {
      for (let i = 0; i < byte_size; i++) {
        this.bb.writeInt8(--this.space, 0);
      }
    }
    writeInt8(value) {
      this.bb.writeInt8(this.space -= 1, value);
    }
    writeInt16(value) {
      this.bb.writeInt16(this.space -= 2, value);
    }
    writeInt32(value) {
      this.bb.writeInt32(this.space -= 4, value);
    }
    writeInt64(value) {
      this.bb.writeInt64(this.space -= 8, value);
    }
    writeFloat32(value) {
      this.bb.writeFloat32(this.space -= 4, value);
    }
    writeFloat64(value) {
      this.bb.writeFloat64(this.space -= 8, value);
    }
    /**
     * Add an `int8` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int8` to add the buffer.
     */
    addInt8(value) {
      this.prep(1, 0);
      this.writeInt8(value);
    }
    /**
     * Add an `int16` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int16` to add the buffer.
     */
    addInt16(value) {
      this.prep(2, 0);
      this.writeInt16(value);
    }
    /**
     * Add an `int32` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int32` to add the buffer.
     */
    addInt32(value) {
      this.prep(4, 0);
      this.writeInt32(value);
    }
    /**
     * Add an `int64` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `int64` to add the buffer.
     */
    addInt64(value) {
      this.prep(8, 0);
      this.writeInt64(value);
    }
    /**
     * Add a `float32` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `float32` to add the buffer.
     */
    addFloat32(value) {
      this.prep(4, 0);
      this.writeFloat32(value);
    }
    /**
     * Add a `float64` to the buffer, properly aligned, and grows the buffer (if necessary).
     * @param value The `float64` to add the buffer.
     */
    addFloat64(value) {
      this.prep(8, 0);
      this.writeFloat64(value);
    }
    addFieldInt8(voffset, value, defaultValue) {
      if (this.force_defaults || value != defaultValue) {
        this.addInt8(value);
        this.slot(voffset);
      }
    }
    addFieldInt16(voffset, value, defaultValue) {
      if (this.force_defaults || value != defaultValue) {
        this.addInt16(value);
        this.slot(voffset);
      }
    }
    addFieldInt32(voffset, value, defaultValue) {
      if (this.force_defaults || value != defaultValue) {
        this.addInt32(value);
        this.slot(voffset);
      }
    }
    addFieldInt64(voffset, value, defaultValue) {
      if (this.force_defaults || value !== defaultValue) {
        this.addInt64(value);
        this.slot(voffset);
      }
    }
    addFieldFloat32(voffset, value, defaultValue) {
      if (this.force_defaults || value != defaultValue) {
        this.addFloat32(value);
        this.slot(voffset);
      }
    }
    addFieldFloat64(voffset, value, defaultValue) {
      if (this.force_defaults || value != defaultValue) {
        this.addFloat64(value);
        this.slot(voffset);
      }
    }
    addFieldOffset(voffset, value, defaultValue) {
      if (this.force_defaults || value != defaultValue) {
        this.addOffset(value);
        this.slot(voffset);
      }
    }
    /**
     * Structs are stored inline, so nothing additional is being added. `d` is always 0.
     */
    addFieldStruct(voffset, value, defaultValue) {
      if (value != defaultValue) {
        this.nested(value);
        this.slot(voffset);
      }
    }
    /**
     * Structures are always stored inline, they need to be created right
     * where they're used.  You'll get this assertion failure if you
     * created it elsewhere.
     */
    nested(obj) {
      if (obj != this.offset()) {
        throw new TypeError("FlatBuffers: struct must be serialized inline.");
      }
    }
    /**
     * Should not be creating any other object, string or vector
     * while an object is being constructed
     */
    notNested() {
      if (this.isNested) {
        throw new TypeError("FlatBuffers: object serialization must not be nested.");
      }
    }
    /**
     * Set the current vtable at `voffset` to the current location in the buffer.
     */
    slot(voffset) {
      if (this.vtable !== null)
        this.vtable[voffset] = this.offset();
    }
    /**
     * @returns Offset relative to the end of the buffer.
     */
    offset() {
      return this.bb.capacity() - this.space;
    }
    /**
     * Doubles the size of the backing ByteBuffer and copies the old data towards
     * the end of the new buffer (since we build the buffer backwards).
     *
     * @param bb The current buffer with the existing data
     * @returns A new byte buffer with the old data copied
     * to it. The data is located at the end of the buffer.
     *
     * uint8Array.set() formally takes {Array<number>|ArrayBufferView}, so to pass
     * it a uint8Array we need to suppress the type check:
     * @suppress {checkTypes}
     */
    static growByteBuffer(bb) {
      const old_buf_size = bb.capacity();
      if (old_buf_size & 3221225472) {
        throw new Error("FlatBuffers: cannot grow buffer beyond 2 gigabytes.");
      }
      const new_buf_size = old_buf_size << 1;
      const nbb = ByteBuffer.allocate(new_buf_size);
      nbb.setPosition(new_buf_size - old_buf_size);
      nbb.bytes().set(bb.bytes(), new_buf_size - old_buf_size);
      return nbb;
    }
    /**
     * Adds on offset, relative to where it will be written.
     *
     * @param offset The offset to add.
     */
    addOffset(offset) {
      this.prep(SIZEOF_INT, 0);
      this.writeInt32(this.offset() - offset + SIZEOF_INT);
    }
    /**
     * Start encoding a new object in the buffer.  Users will not usually need to
     * call this directly. The FlatBuffers compiler will generate helper methods
     * that call this method internally.
     */
    startObject(numfields) {
      this.notNested();
      if (this.vtable == null) {
        this.vtable = [];
      }
      this.vtable_in_use = numfields;
      for (let i = 0; i < numfields; i++) {
        this.vtable[i] = 0;
      }
      this.isNested = true;
      this.object_start = this.offset();
    }
    /**
     * Finish off writing the object that is under construction.
     *
     * @returns The offset to the object inside `dataBuffer`
     */
    endObject() {
      if (this.vtable == null || !this.isNested) {
        throw new Error("FlatBuffers: endObject called without startObject");
      }
      this.addInt32(0);
      const vtableloc = this.offset();
      let i = this.vtable_in_use - 1;
      for (; i >= 0 && this.vtable[i] == 0; i--) {
      }
      const trimmed_size = i + 1;
      for (; i >= 0; i--) {
        this.addInt16(this.vtable[i] != 0 ? vtableloc - this.vtable[i] : 0);
      }
      const standard_fields = 2;
      this.addInt16(vtableloc - this.object_start);
      const len = (trimmed_size + standard_fields) * SIZEOF_SHORT;
      this.addInt16(len);
      let existing_vtable = 0;
      const vt1 = this.space;
      outer_loop:
        for (i = 0; i < this.vtables.length; i++) {
          const vt2 = this.bb.capacity() - this.vtables[i];
          if (len == this.bb.readInt16(vt2)) {
            for (let j = SIZEOF_SHORT; j < len; j += SIZEOF_SHORT) {
              if (this.bb.readInt16(vt1 + j) != this.bb.readInt16(vt2 + j)) {
                continue outer_loop;
              }
            }
            existing_vtable = this.vtables[i];
            break;
          }
        }
      if (existing_vtable) {
        this.space = this.bb.capacity() - vtableloc;
        this.bb.writeInt32(this.space, existing_vtable - vtableloc);
      } else {
        this.vtables.push(this.offset());
        this.bb.writeInt32(this.bb.capacity() - vtableloc, this.offset() - vtableloc);
      }
      this.isNested = false;
      return vtableloc;
    }
    /**
     * Finalize a buffer, poiting to the given `root_table`.
     */
    finish(root_table, opt_file_identifier, opt_size_prefix) {
      const size_prefix = opt_size_prefix ? SIZE_PREFIX_LENGTH : 0;
      if (opt_file_identifier) {
        const file_identifier = opt_file_identifier;
        this.prep(this.minalign, SIZEOF_INT + FILE_IDENTIFIER_LENGTH + size_prefix);
        if (file_identifier.length != FILE_IDENTIFIER_LENGTH) {
          throw new TypeError("FlatBuffers: file identifier must be length " + FILE_IDENTIFIER_LENGTH);
        }
        for (let i = FILE_IDENTIFIER_LENGTH - 1; i >= 0; i--) {
          this.writeInt8(file_identifier.charCodeAt(i));
        }
      }
      this.prep(this.minalign, SIZEOF_INT + size_prefix);
      this.addOffset(root_table);
      if (size_prefix) {
        this.addInt32(this.bb.capacity() - this.space);
      }
      this.bb.setPosition(this.space);
    }
    /**
     * Finalize a size prefixed buffer, pointing to the given `root_table`.
     */
    finishSizePrefixed(root_table, opt_file_identifier) {
      this.finish(root_table, opt_file_identifier, true);
    }
    /**
     * This checks a required field has been set in a given table that has
     * just been constructed.
     */
    requiredField(table, field) {
      const table_start = this.bb.capacity() - table;
      const vtable_start = table_start - this.bb.readInt32(table_start);
      const ok = field < this.bb.readInt16(vtable_start) && this.bb.readInt16(vtable_start + field) != 0;
      if (!ok) {
        throw new TypeError("FlatBuffers: field " + field + " must be set");
      }
    }
    /**
     * Start a new array/vector of objects.  Users usually will not call
     * this directly. The FlatBuffers compiler will create a start/end
     * method for vector types in generated code.
     *
     * @param elem_size The size of each element in the array
     * @param num_elems The number of elements in the array
     * @param alignment The alignment of the array
     */
    startVector(elem_size, num_elems, alignment) {
      this.notNested();
      this.vector_num_elems = num_elems;
      this.prep(SIZEOF_INT, elem_size * num_elems);
      this.prep(alignment, elem_size * num_elems);
    }
    /**
     * Finish off the creation of an array and all its elements. The array must be
     * created with `startVector`.
     *
     * @returns The offset at which the newly created array
     * starts.
     */
    endVector() {
      this.writeInt32(this.vector_num_elems);
      return this.offset();
    }
    /**
     * Encode the string `s` in the buffer using UTF-8. If the string passed has
     * already been seen, we return the offset of the already written string
     *
     * @param s The string to encode
     * @return The offset in the buffer where the encoded string starts
     */
    createSharedString(s) {
      if (!s) {
        return 0;
      }
      if (!this.string_maps) {
        this.string_maps = /* @__PURE__ */ new Map();
      }
      if (this.string_maps.has(s)) {
        return this.string_maps.get(s);
      }
      const offset = this.createString(s);
      this.string_maps.set(s, offset);
      return offset;
    }
    /**
     * Encode the string `s` in the buffer using UTF-8. If a Uint8Array is passed
     * instead of a string, it is assumed to contain valid UTF-8 encoded data.
     *
     * @param s The string to encode
     * @return The offset in the buffer where the encoded string starts
     */
    createString(s) {
      if (s === null || s === void 0) {
        return 0;
      }
      let utf8;
      if (s instanceof Uint8Array) {
        utf8 = s;
      } else {
        utf8 = this.text_encoder.encode(s);
      }
      this.addInt8(0);
      this.startVector(1, utf8.length, 1);
      this.bb.setPosition(this.space -= utf8.length);
      for (let i = 0, offset = this.space, bytes = this.bb.bytes(); i < utf8.length; i++) {
        bytes[offset++] = utf8[i];
      }
      return this.endVector();
    }
    /**
     * A helper function to pack an object
     *
     * @returns offset of obj
     */
    createObjectOffset(obj) {
      if (obj === null) {
        return 0;
      }
      if (typeof obj === "string") {
        return this.createString(obj);
      } else {
        return obj.pack(this);
      }
    }
    /**
     * A helper function to pack a list of object
     *
     * @returns list of offsets of each non null object
     */
    createObjectOffsetList(list) {
      const ret = [];
      for (let i = 0; i < list.length; ++i) {
        const val = list[i];
        if (val !== null) {
          ret.push(this.createObjectOffset(val));
        } else {
          throw new TypeError("FlatBuffers: Argument for createObjectOffsetList cannot contain null.");
        }
      }
      return ret;
    }
    createStructOffsetList(list, startFunc) {
      startFunc(this, list.length);
      this.createObjectOffsetList(list.slice().reverse());
      return this.endVector();
    }
  };

  // ../../node_modules/apache-arrow/fb/key-value.mjs
  var KeyValue = class _KeyValue {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsKeyValue(bb, obj) {
      return (obj || new _KeyValue()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsKeyValue(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _KeyValue()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    key(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    value(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startKeyValue(builder) {
      builder.startObject(2);
    }
    static addKey(builder, keyOffset) {
      builder.addFieldOffset(0, keyOffset, 0);
    }
    static addValue(builder, valueOffset) {
      builder.addFieldOffset(1, valueOffset, 0);
    }
    static endKeyValue(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createKeyValue(builder, keyOffset, valueOffset) {
      _KeyValue.startKeyValue(builder);
      _KeyValue.addKey(builder, keyOffset);
      _KeyValue.addValue(builder, valueOffset);
      return _KeyValue.endKeyValue(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/metadata-version.mjs
  var MetadataVersion2;
  (function(MetadataVersion3) {
    MetadataVersion3[MetadataVersion3["V1"] = 0] = "V1";
    MetadataVersion3[MetadataVersion3["V2"] = 1] = "V2";
    MetadataVersion3[MetadataVersion3["V3"] = 2] = "V3";
    MetadataVersion3[MetadataVersion3["V4"] = 3] = "V4";
    MetadataVersion3[MetadataVersion3["V5"] = 4] = "V5";
  })(MetadataVersion2 || (MetadataVersion2 = {}));

  // ../../node_modules/apache-arrow/fb/endianness.mjs
  var Endianness;
  (function(Endianness2) {
    Endianness2[Endianness2["Little"] = 0] = "Little";
    Endianness2[Endianness2["Big"] = 1] = "Big";
  })(Endianness || (Endianness = {}));

  // ../../node_modules/apache-arrow/fb/dictionary-kind.mjs
  var DictionaryKind;
  (function(DictionaryKind2) {
    DictionaryKind2[DictionaryKind2["DenseArray"] = 0] = "DenseArray";
  })(DictionaryKind || (DictionaryKind = {}));

  // ../../node_modules/apache-arrow/fb/int.mjs
  var Int = class _Int {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsInt(bb, obj) {
      return (obj || new _Int()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsInt(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Int()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    bitWidth() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
    }
    isSigned() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
    }
    static startInt(builder) {
      builder.startObject(2);
    }
    static addBitWidth(builder, bitWidth) {
      builder.addFieldInt32(0, bitWidth, 0);
    }
    static addIsSigned(builder, isSigned) {
      builder.addFieldInt8(1, +isSigned, 0);
    }
    static endInt(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createInt(builder, bitWidth, isSigned) {
      _Int.startInt(builder);
      _Int.addBitWidth(builder, bitWidth);
      _Int.addIsSigned(builder, isSigned);
      return _Int.endInt(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/dictionary-encoding.mjs
  var DictionaryEncoding = class _DictionaryEncoding {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsDictionaryEncoding(bb, obj) {
      return (obj || new _DictionaryEncoding()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsDictionaryEncoding(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _DictionaryEncoding()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    /**
     * The known dictionary id in the application where this data is used. In
     * the file or streaming formats, the dictionary ids are found in the
     * DictionaryBatch messages
     */
    id() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
    }
    /**
     * The dictionary indices are constrained to be non-negative integers. If
     * this field is null, the indices must be signed int32. To maximize
     * cross-language compatibility and performance, implementations are
     * recommended to prefer signed integer types over unsigned integer types
     * and to avoid uint64 indices unless they are required by an application.
     */
    indexType(obj) {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? (obj || new Int()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }
    /**
     * By default, dictionaries are not ordered, or the order does not have
     * semantic meaning. In some statistical, applications, dictionary-encoding
     * is used to represent ordered categorical data, and we provide a way to
     * preserve that metadata here
     */
    isOrdered() {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
    }
    dictionaryKind() {
      const offset = this.bb.__offset(this.bb_pos, 10);
      return offset ? this.bb.readInt16(this.bb_pos + offset) : DictionaryKind.DenseArray;
    }
    static startDictionaryEncoding(builder) {
      builder.startObject(4);
    }
    static addId(builder, id) {
      builder.addFieldInt64(0, id, BigInt("0"));
    }
    static addIndexType(builder, indexTypeOffset) {
      builder.addFieldOffset(1, indexTypeOffset, 0);
    }
    static addIsOrdered(builder, isOrdered) {
      builder.addFieldInt8(2, +isOrdered, 0);
    }
    static addDictionaryKind(builder, dictionaryKind) {
      builder.addFieldInt16(3, dictionaryKind, DictionaryKind.DenseArray);
    }
    static endDictionaryEncoding(builder) {
      const offset = builder.endObject();
      return offset;
    }
  };

  // ../../node_modules/apache-arrow/fb/binary.mjs
  var Binary2 = class _Binary {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsBinary(bb, obj) {
      return (obj || new _Binary()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsBinary(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Binary()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startBinary(builder) {
      builder.startObject(0);
    }
    static endBinary(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createBinary(builder) {
      _Binary.startBinary(builder);
      return _Binary.endBinary(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/bool.mjs
  var Bool2 = class _Bool {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsBool(bb, obj) {
      return (obj || new _Bool()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsBool(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Bool()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startBool(builder) {
      builder.startObject(0);
    }
    static endBool(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createBool(builder) {
      _Bool.startBool(builder);
      return _Bool.endBool(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/date-unit.mjs
  var DateUnit2;
  (function(DateUnit3) {
    DateUnit3[DateUnit3["DAY"] = 0] = "DAY";
    DateUnit3[DateUnit3["MILLISECOND"] = 1] = "MILLISECOND";
  })(DateUnit2 || (DateUnit2 = {}));

  // ../../node_modules/apache-arrow/fb/date.mjs
  var Date2 = class _Date {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsDate(bb, obj) {
      return (obj || new _Date()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsDate(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Date()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    unit() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt16(this.bb_pos + offset) : DateUnit2.MILLISECOND;
    }
    static startDate(builder) {
      builder.startObject(1);
    }
    static addUnit(builder, unit) {
      builder.addFieldInt16(0, unit, DateUnit2.MILLISECOND);
    }
    static endDate(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createDate(builder, unit) {
      _Date.startDate(builder);
      _Date.addUnit(builder, unit);
      return _Date.endDate(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/decimal.mjs
  var Decimal2 = class _Decimal {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsDecimal(bb, obj) {
      return (obj || new _Decimal()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsDecimal(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Decimal()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    /**
     * Total number of decimal digits
     */
    precision() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
    }
    /**
     * Number of digits after the decimal point "."
     */
    scale() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
    }
    /**
     * Number of bits per value. The only accepted widths are 128 and 256.
     * We use bitWidth for consistency with Int::bitWidth.
     */
    bitWidth() {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? this.bb.readInt32(this.bb_pos + offset) : 128;
    }
    static startDecimal(builder) {
      builder.startObject(3);
    }
    static addPrecision(builder, precision) {
      builder.addFieldInt32(0, precision, 0);
    }
    static addScale(builder, scale) {
      builder.addFieldInt32(1, scale, 0);
    }
    static addBitWidth(builder, bitWidth) {
      builder.addFieldInt32(2, bitWidth, 128);
    }
    static endDecimal(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createDecimal(builder, precision, scale, bitWidth) {
      _Decimal.startDecimal(builder);
      _Decimal.addPrecision(builder, precision);
      _Decimal.addScale(builder, scale);
      _Decimal.addBitWidth(builder, bitWidth);
      return _Decimal.endDecimal(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/time-unit.mjs
  var TimeUnit2;
  (function(TimeUnit3) {
    TimeUnit3[TimeUnit3["SECOND"] = 0] = "SECOND";
    TimeUnit3[TimeUnit3["MILLISECOND"] = 1] = "MILLISECOND";
    TimeUnit3[TimeUnit3["MICROSECOND"] = 2] = "MICROSECOND";
    TimeUnit3[TimeUnit3["NANOSECOND"] = 3] = "NANOSECOND";
  })(TimeUnit2 || (TimeUnit2 = {}));

  // ../../node_modules/apache-arrow/fb/fixed-size-binary.mjs
  var FixedSizeBinary2 = class _FixedSizeBinary {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsFixedSizeBinary(bb, obj) {
      return (obj || new _FixedSizeBinary()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsFixedSizeBinary(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _FixedSizeBinary()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    /**
     * Number of bytes per value
     */
    byteWidth() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
    }
    static startFixedSizeBinary(builder) {
      builder.startObject(1);
    }
    static addByteWidth(builder, byteWidth) {
      builder.addFieldInt32(0, byteWidth, 0);
    }
    static endFixedSizeBinary(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createFixedSizeBinary(builder, byteWidth) {
      _FixedSizeBinary.startFixedSizeBinary(builder);
      _FixedSizeBinary.addByteWidth(builder, byteWidth);
      return _FixedSizeBinary.endFixedSizeBinary(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/fixed-size-list.mjs
  var FixedSizeList2 = class _FixedSizeList {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsFixedSizeList(bb, obj) {
      return (obj || new _FixedSizeList()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsFixedSizeList(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _FixedSizeList()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    /**
     * Number of list items per value
     */
    listSize() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
    }
    static startFixedSizeList(builder) {
      builder.startObject(1);
    }
    static addListSize(builder, listSize) {
      builder.addFieldInt32(0, listSize, 0);
    }
    static endFixedSizeList(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createFixedSizeList(builder, listSize) {
      _FixedSizeList.startFixedSizeList(builder);
      _FixedSizeList.addListSize(builder, listSize);
      return _FixedSizeList.endFixedSizeList(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/precision.mjs
  var Precision2;
  (function(Precision3) {
    Precision3[Precision3["HALF"] = 0] = "HALF";
    Precision3[Precision3["SINGLE"] = 1] = "SINGLE";
    Precision3[Precision3["DOUBLE"] = 2] = "DOUBLE";
  })(Precision2 || (Precision2 = {}));

  // ../../node_modules/apache-arrow/fb/floating-point.mjs
  var FloatingPoint = class _FloatingPoint {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsFloatingPoint(bb, obj) {
      return (obj || new _FloatingPoint()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsFloatingPoint(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _FloatingPoint()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    precision() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt16(this.bb_pos + offset) : Precision2.HALF;
    }
    static startFloatingPoint(builder) {
      builder.startObject(1);
    }
    static addPrecision(builder, precision) {
      builder.addFieldInt16(0, precision, Precision2.HALF);
    }
    static endFloatingPoint(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createFloatingPoint(builder, precision) {
      _FloatingPoint.startFloatingPoint(builder);
      _FloatingPoint.addPrecision(builder, precision);
      return _FloatingPoint.endFloatingPoint(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/interval-unit.mjs
  var IntervalUnit2;
  (function(IntervalUnit3) {
    IntervalUnit3[IntervalUnit3["YEAR_MONTH"] = 0] = "YEAR_MONTH";
    IntervalUnit3[IntervalUnit3["DAY_TIME"] = 1] = "DAY_TIME";
    IntervalUnit3[IntervalUnit3["MONTH_DAY_NANO"] = 2] = "MONTH_DAY_NANO";
  })(IntervalUnit2 || (IntervalUnit2 = {}));

  // ../../node_modules/apache-arrow/fb/interval.mjs
  var Interval = class _Interval {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsInterval(bb, obj) {
      return (obj || new _Interval()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsInterval(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Interval()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    unit() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt16(this.bb_pos + offset) : IntervalUnit2.YEAR_MONTH;
    }
    static startInterval(builder) {
      builder.startObject(1);
    }
    static addUnit(builder, unit) {
      builder.addFieldInt16(0, unit, IntervalUnit2.YEAR_MONTH);
    }
    static endInterval(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createInterval(builder, unit) {
      _Interval.startInterval(builder);
      _Interval.addUnit(builder, unit);
      return _Interval.endInterval(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/list.mjs
  var List2 = class _List {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsList(bb, obj) {
      return (obj || new _List()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsList(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _List()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startList(builder) {
      builder.startObject(0);
    }
    static endList(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createList(builder) {
      _List.startList(builder);
      return _List.endList(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/map.mjs
  var Map2 = class _Map {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsMap(bb, obj) {
      return (obj || new _Map()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsMap(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Map()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    /**
     * Set to true if the keys within each value are sorted
     */
    keysSorted() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
    }
    static startMap(builder) {
      builder.startObject(1);
    }
    static addKeysSorted(builder, keysSorted) {
      builder.addFieldInt8(0, +keysSorted, 0);
    }
    static endMap(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createMap(builder, keysSorted) {
      _Map.startMap(builder);
      _Map.addKeysSorted(builder, keysSorted);
      return _Map.endMap(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/null.mjs
  var Null2 = class _Null {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsNull(bb, obj) {
      return (obj || new _Null()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsNull(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Null()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startNull(builder) {
      builder.startObject(0);
    }
    static endNull(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createNull(builder) {
      _Null.startNull(builder);
      return _Null.endNull(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/struct-.mjs
  var Struct_ = class _Struct_ {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsStruct_(bb, obj) {
      return (obj || new _Struct_()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsStruct_(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Struct_()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startStruct_(builder) {
      builder.startObject(0);
    }
    static endStruct_(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createStruct_(builder) {
      _Struct_.startStruct_(builder);
      return _Struct_.endStruct_(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/time.mjs
  var Time = class _Time {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsTime(bb, obj) {
      return (obj || new _Time()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsTime(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Time()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    unit() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt16(this.bb_pos + offset) : TimeUnit2.MILLISECOND;
    }
    bitWidth() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readInt32(this.bb_pos + offset) : 32;
    }
    static startTime(builder) {
      builder.startObject(2);
    }
    static addUnit(builder, unit) {
      builder.addFieldInt16(0, unit, TimeUnit2.MILLISECOND);
    }
    static addBitWidth(builder, bitWidth) {
      builder.addFieldInt32(1, bitWidth, 32);
    }
    static endTime(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createTime(builder, unit, bitWidth) {
      _Time.startTime(builder);
      _Time.addUnit(builder, unit);
      _Time.addBitWidth(builder, bitWidth);
      return _Time.endTime(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/timestamp.mjs
  var Timestamp = class _Timestamp {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsTimestamp(bb, obj) {
      return (obj || new _Timestamp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsTimestamp(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Timestamp()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    unit() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt16(this.bb_pos + offset) : TimeUnit2.SECOND;
    }
    timezone(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    static startTimestamp(builder) {
      builder.startObject(2);
    }
    static addUnit(builder, unit) {
      builder.addFieldInt16(0, unit, TimeUnit2.SECOND);
    }
    static addTimezone(builder, timezoneOffset) {
      builder.addFieldOffset(1, timezoneOffset, 0);
    }
    static endTimestamp(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createTimestamp(builder, unit, timezoneOffset) {
      _Timestamp.startTimestamp(builder);
      _Timestamp.addUnit(builder, unit);
      _Timestamp.addTimezone(builder, timezoneOffset);
      return _Timestamp.endTimestamp(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/union-mode.mjs
  var UnionMode2;
  (function(UnionMode3) {
    UnionMode3[UnionMode3["Sparse"] = 0] = "Sparse";
    UnionMode3[UnionMode3["Dense"] = 1] = "Dense";
  })(UnionMode2 || (UnionMode2 = {}));

  // ../../node_modules/apache-arrow/fb/union.mjs
  var Union = class _Union {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsUnion(bb, obj) {
      return (obj || new _Union()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsUnion(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Union()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    mode() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt16(this.bb_pos + offset) : UnionMode2.Sparse;
    }
    typeIds(index) {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readInt32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
    }
    typeIdsLength() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    typeIdsArray() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? new Int32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
    }
    static startUnion(builder) {
      builder.startObject(2);
    }
    static addMode(builder, mode) {
      builder.addFieldInt16(0, mode, UnionMode2.Sparse);
    }
    static addTypeIds(builder, typeIdsOffset) {
      builder.addFieldOffset(1, typeIdsOffset, 0);
    }
    static createTypeIdsVector(builder, data) {
      builder.startVector(4, data.length, 4);
      for (let i = data.length - 1; i >= 0; i--) {
        builder.addInt32(data[i]);
      }
      return builder.endVector();
    }
    static startTypeIdsVector(builder, numElems) {
      builder.startVector(4, numElems, 4);
    }
    static endUnion(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createUnion(builder, mode, typeIdsOffset) {
      _Union.startUnion(builder);
      _Union.addMode(builder, mode);
      _Union.addTypeIds(builder, typeIdsOffset);
      return _Union.endUnion(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/utf8.mjs
  var Utf82 = class _Utf8 {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsUtf8(bb, obj) {
      return (obj || new _Utf8()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsUtf8(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Utf8()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static startUtf8(builder) {
      builder.startObject(0);
    }
    static endUtf8(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createUtf8(builder) {
      _Utf8.startUtf8(builder);
      return _Utf8.endUtf8(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/type.mjs
  var Type2;
  (function(Type3) {
    Type3[Type3["NONE"] = 0] = "NONE";
    Type3[Type3["Null"] = 1] = "Null";
    Type3[Type3["Int"] = 2] = "Int";
    Type3[Type3["FloatingPoint"] = 3] = "FloatingPoint";
    Type3[Type3["Binary"] = 4] = "Binary";
    Type3[Type3["Utf8"] = 5] = "Utf8";
    Type3[Type3["Bool"] = 6] = "Bool";
    Type3[Type3["Decimal"] = 7] = "Decimal";
    Type3[Type3["Date"] = 8] = "Date";
    Type3[Type3["Time"] = 9] = "Time";
    Type3[Type3["Timestamp"] = 10] = "Timestamp";
    Type3[Type3["Interval"] = 11] = "Interval";
    Type3[Type3["List"] = 12] = "List";
    Type3[Type3["Struct_"] = 13] = "Struct_";
    Type3[Type3["Union"] = 14] = "Union";
    Type3[Type3["FixedSizeBinary"] = 15] = "FixedSizeBinary";
    Type3[Type3["FixedSizeList"] = 16] = "FixedSizeList";
    Type3[Type3["Map"] = 17] = "Map";
    Type3[Type3["Duration"] = 18] = "Duration";
    Type3[Type3["LargeBinary"] = 19] = "LargeBinary";
    Type3[Type3["LargeUtf8"] = 20] = "LargeUtf8";
    Type3[Type3["LargeList"] = 21] = "LargeList";
    Type3[Type3["RunEndEncoded"] = 22] = "RunEndEncoded";
  })(Type2 || (Type2 = {}));

  // ../../node_modules/apache-arrow/fb/field.mjs
  var Field = class _Field {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsField(bb, obj) {
      return (obj || new _Field()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsField(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Field()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    name(optionalEncoding) {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
    }
    /**
     * Whether or not this field can contain nulls. Should be true in general.
     */
    nullable() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
    }
    typeType() {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? this.bb.readUint8(this.bb_pos + offset) : Type2.NONE;
    }
    /**
     * This is the type of the decoded value if the field is dictionary encoded.
     */
    type(obj) {
      const offset = this.bb.__offset(this.bb_pos, 10);
      return offset ? this.bb.__union(obj, this.bb_pos + offset) : null;
    }
    /**
     * Present only if the field is dictionary encoded.
     */
    dictionary(obj) {
      const offset = this.bb.__offset(this.bb_pos, 12);
      return offset ? (obj || new DictionaryEncoding()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }
    /**
     * children apply only to nested data types like Struct, List and Union. For
     * primitive types children will have length 0.
     */
    children(index, obj) {
      const offset = this.bb.__offset(this.bb_pos, 14);
      return offset ? (obj || new _Field()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    childrenLength() {
      const offset = this.bb.__offset(this.bb_pos, 14);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    /**
     * User-defined metadata
     */
    customMetadata(index, obj) {
      const offset = this.bb.__offset(this.bb_pos, 16);
      return offset ? (obj || new KeyValue()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    customMetadataLength() {
      const offset = this.bb.__offset(this.bb_pos, 16);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    static startField(builder) {
      builder.startObject(7);
    }
    static addName(builder, nameOffset) {
      builder.addFieldOffset(0, nameOffset, 0);
    }
    static addNullable(builder, nullable) {
      builder.addFieldInt8(1, +nullable, 0);
    }
    static addTypeType(builder, typeType) {
      builder.addFieldInt8(2, typeType, Type2.NONE);
    }
    static addType(builder, typeOffset) {
      builder.addFieldOffset(3, typeOffset, 0);
    }
    static addDictionary(builder, dictionaryOffset) {
      builder.addFieldOffset(4, dictionaryOffset, 0);
    }
    static addChildren(builder, childrenOffset) {
      builder.addFieldOffset(5, childrenOffset, 0);
    }
    static createChildrenVector(builder, data) {
      builder.startVector(4, data.length, 4);
      for (let i = data.length - 1; i >= 0; i--) {
        builder.addOffset(data[i]);
      }
      return builder.endVector();
    }
    static startChildrenVector(builder, numElems) {
      builder.startVector(4, numElems, 4);
    }
    static addCustomMetadata(builder, customMetadataOffset) {
      builder.addFieldOffset(6, customMetadataOffset, 0);
    }
    static createCustomMetadataVector(builder, data) {
      builder.startVector(4, data.length, 4);
      for (let i = data.length - 1; i >= 0; i--) {
        builder.addOffset(data[i]);
      }
      return builder.endVector();
    }
    static startCustomMetadataVector(builder, numElems) {
      builder.startVector(4, numElems, 4);
    }
    static endField(builder) {
      const offset = builder.endObject();
      return offset;
    }
  };

  // ../../node_modules/apache-arrow/fb/schema.mjs
  var Schema = class _Schema {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsSchema(bb, obj) {
      return (obj || new _Schema()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsSchema(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Schema()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    /**
     * endianness of the buffer
     * it is Little Endian by default
     * if endianness doesn't match the underlying system then the vectors need to be converted
     */
    endianness() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt16(this.bb_pos + offset) : Endianness.Little;
    }
    fields(index, obj) {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? (obj || new Field()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    fieldsLength() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    customMetadata(index, obj) {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? (obj || new KeyValue()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    customMetadataLength() {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    /**
     * Features used in the stream/file.
     */
    features(index) {
      const offset = this.bb.__offset(this.bb_pos, 10);
      return offset ? this.bb.readInt64(this.bb.__vector(this.bb_pos + offset) + index * 8) : BigInt(0);
    }
    featuresLength() {
      const offset = this.bb.__offset(this.bb_pos, 10);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    static startSchema(builder) {
      builder.startObject(4);
    }
    static addEndianness(builder, endianness) {
      builder.addFieldInt16(0, endianness, Endianness.Little);
    }
    static addFields(builder, fieldsOffset) {
      builder.addFieldOffset(1, fieldsOffset, 0);
    }
    static createFieldsVector(builder, data) {
      builder.startVector(4, data.length, 4);
      for (let i = data.length - 1; i >= 0; i--) {
        builder.addOffset(data[i]);
      }
      return builder.endVector();
    }
    static startFieldsVector(builder, numElems) {
      builder.startVector(4, numElems, 4);
    }
    static addCustomMetadata(builder, customMetadataOffset) {
      builder.addFieldOffset(2, customMetadataOffset, 0);
    }
    static createCustomMetadataVector(builder, data) {
      builder.startVector(4, data.length, 4);
      for (let i = data.length - 1; i >= 0; i--) {
        builder.addOffset(data[i]);
      }
      return builder.endVector();
    }
    static startCustomMetadataVector(builder, numElems) {
      builder.startVector(4, numElems, 4);
    }
    static addFeatures(builder, featuresOffset) {
      builder.addFieldOffset(3, featuresOffset, 0);
    }
    static createFeaturesVector(builder, data) {
      builder.startVector(8, data.length, 8);
      for (let i = data.length - 1; i >= 0; i--) {
        builder.addInt64(data[i]);
      }
      return builder.endVector();
    }
    static startFeaturesVector(builder, numElems) {
      builder.startVector(8, numElems, 8);
    }
    static endSchema(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static finishSchemaBuffer(builder, offset) {
      builder.finish(offset);
    }
    static finishSizePrefixedSchemaBuffer(builder, offset) {
      builder.finish(offset, void 0, true);
    }
    static createSchema(builder, endianness, fieldsOffset, customMetadataOffset, featuresOffset) {
      _Schema.startSchema(builder);
      _Schema.addEndianness(builder, endianness);
      _Schema.addFields(builder, fieldsOffset);
      _Schema.addCustomMetadata(builder, customMetadataOffset);
      _Schema.addFeatures(builder, featuresOffset);
      return _Schema.endSchema(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/footer.mjs
  var Footer = class _Footer {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsFooter(bb, obj) {
      return (obj || new _Footer()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsFooter(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Footer()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    version() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt16(this.bb_pos + offset) : MetadataVersion2.V1;
    }
    schema(obj) {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? (obj || new Schema()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }
    dictionaries(index, obj) {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? (obj || new Block()).__init(this.bb.__vector(this.bb_pos + offset) + index * 24, this.bb) : null;
    }
    dictionariesLength() {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    recordBatches(index, obj) {
      const offset = this.bb.__offset(this.bb_pos, 10);
      return offset ? (obj || new Block()).__init(this.bb.__vector(this.bb_pos + offset) + index * 24, this.bb) : null;
    }
    recordBatchesLength() {
      const offset = this.bb.__offset(this.bb_pos, 10);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    /**
     * User-defined metadata
     */
    customMetadata(index, obj) {
      const offset = this.bb.__offset(this.bb_pos, 12);
      return offset ? (obj || new KeyValue()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    customMetadataLength() {
      const offset = this.bb.__offset(this.bb_pos, 12);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    static startFooter(builder) {
      builder.startObject(5);
    }
    static addVersion(builder, version) {
      builder.addFieldInt16(0, version, MetadataVersion2.V1);
    }
    static addSchema(builder, schemaOffset) {
      builder.addFieldOffset(1, schemaOffset, 0);
    }
    static addDictionaries(builder, dictionariesOffset) {
      builder.addFieldOffset(2, dictionariesOffset, 0);
    }
    static startDictionariesVector(builder, numElems) {
      builder.startVector(24, numElems, 8);
    }
    static addRecordBatches(builder, recordBatchesOffset) {
      builder.addFieldOffset(3, recordBatchesOffset, 0);
    }
    static startRecordBatchesVector(builder, numElems) {
      builder.startVector(24, numElems, 8);
    }
    static addCustomMetadata(builder, customMetadataOffset) {
      builder.addFieldOffset(4, customMetadataOffset, 0);
    }
    static createCustomMetadataVector(builder, data) {
      builder.startVector(4, data.length, 4);
      for (let i = data.length - 1; i >= 0; i--) {
        builder.addOffset(data[i]);
      }
      return builder.endVector();
    }
    static startCustomMetadataVector(builder, numElems) {
      builder.startVector(4, numElems, 4);
    }
    static endFooter(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static finishFooterBuffer(builder, offset) {
      builder.finish(offset);
    }
    static finishSizePrefixedFooterBuffer(builder, offset) {
      builder.finish(offset, void 0, true);
    }
  };

  // ../../node_modules/apache-arrow/schema.mjs
  var Schema2 = class _Schema {
    constructor(fields = [], metadata, dictionaries) {
      this.fields = fields || [];
      this.metadata = metadata || /* @__PURE__ */ new Map();
      if (!dictionaries) {
        dictionaries = generateDictionaryMap(fields);
      }
      this.dictionaries = dictionaries;
    }
    get [Symbol.toStringTag]() {
      return "Schema";
    }
    get names() {
      return this.fields.map((f) => f.name);
    }
    toString() {
      return `Schema<{ ${this.fields.map((f, i) => `${i}: ${f}`).join(", ")} }>`;
    }
    /**
     * Construct a new Schema containing only specified fields.
     *
     * @param fieldNames Names of fields to keep.
     * @returns A new Schema of fields matching the specified names.
     */
    select(fieldNames) {
      const names = new Set(fieldNames);
      const fields = this.fields.filter((f) => names.has(f.name));
      return new _Schema(fields, this.metadata);
    }
    /**
     * Construct a new Schema containing only fields at the specified indices.
     *
     * @param fieldIndices Indices of fields to keep.
     * @returns A new Schema of fields at the specified indices.
     */
    selectAt(fieldIndices) {
      const fields = fieldIndices.map((i) => this.fields[i]).filter(Boolean);
      return new _Schema(fields, this.metadata);
    }
    assign(...args) {
      const other = args[0] instanceof _Schema ? args[0] : Array.isArray(args[0]) ? new _Schema(args[0]) : new _Schema(args);
      const curFields = [...this.fields];
      const metadata = mergeMaps(mergeMaps(/* @__PURE__ */ new Map(), this.metadata), other.metadata);
      const newFields = other.fields.filter((f2) => {
        const i = curFields.findIndex((f) => f.name === f2.name);
        return ~i ? (curFields[i] = f2.clone({
          metadata: mergeMaps(mergeMaps(/* @__PURE__ */ new Map(), curFields[i].metadata), f2.metadata)
        })) && false : true;
      });
      const newDictionaries = generateDictionaryMap(newFields, /* @__PURE__ */ new Map());
      return new _Schema([...curFields, ...newFields], metadata, new Map([...this.dictionaries, ...newDictionaries]));
    }
  };
  Schema2.prototype.fields = null;
  Schema2.prototype.metadata = null;
  Schema2.prototype.dictionaries = null;
  var Field2 = class _Field {
    /** @nocollapse */
    static new(...args) {
      let [name, type, nullable, metadata] = args;
      if (args[0] && typeof args[0] === "object") {
        ({ name } = args[0]);
        type === void 0 && (type = args[0].type);
        nullable === void 0 && (nullable = args[0].nullable);
        metadata === void 0 && (metadata = args[0].metadata);
      }
      return new _Field(`${name}`, type, nullable, metadata);
    }
    constructor(name, type, nullable = false, metadata) {
      this.name = name;
      this.type = type;
      this.nullable = nullable;
      this.metadata = metadata || /* @__PURE__ */ new Map();
    }
    get typeId() {
      return this.type.typeId;
    }
    get [Symbol.toStringTag]() {
      return "Field";
    }
    toString() {
      return `${this.name}: ${this.type}`;
    }
    clone(...args) {
      let [name, type, nullable, metadata] = args;
      !args[0] || typeof args[0] !== "object" ? [name = this.name, type = this.type, nullable = this.nullable, metadata = this.metadata] = args : { name = this.name, type = this.type, nullable = this.nullable, metadata = this.metadata } = args[0];
      return _Field.new(name, type, nullable, metadata);
    }
  };
  Field2.prototype.type = null;
  Field2.prototype.name = null;
  Field2.prototype.nullable = null;
  Field2.prototype.metadata = null;
  function mergeMaps(m1, m2) {
    return new Map([...m1 || /* @__PURE__ */ new Map(), ...m2 || /* @__PURE__ */ new Map()]);
  }
  function generateDictionaryMap(fields, dictionaries = /* @__PURE__ */ new Map()) {
    for (let i = -1, n = fields.length; ++i < n; ) {
      const field = fields[i];
      const type = field.type;
      if (DataType.isDictionary(type)) {
        if (!dictionaries.has(type.id)) {
          dictionaries.set(type.id, type.dictionary);
        } else if (dictionaries.get(type.id) !== type.dictionary) {
          throw new Error(`Cannot create Schema containing two different dictionaries with the same Id`);
        }
      }
      if (type.children && type.children.length > 0) {
        generateDictionaryMap(type.children, dictionaries);
      }
    }
    return dictionaries;
  }

  // ../../node_modules/apache-arrow/ipc/metadata/file.mjs
  var Builder3 = Builder2;
  var ByteBuffer2 = ByteBuffer;
  var Footer_ = class {
    /** @nocollapse */
    static decode(buf) {
      buf = new ByteBuffer2(toUint8Array(buf));
      const footer = Footer.getRootAsFooter(buf);
      const schema = Schema2.decode(footer.schema());
      return new OffHeapFooter(schema, footer);
    }
    /** @nocollapse */
    static encode(footer) {
      const b = new Builder3();
      const schemaOffset = Schema2.encode(b, footer.schema);
      Footer.startRecordBatchesVector(b, footer.numRecordBatches);
      for (const rb of [...footer.recordBatches()].slice().reverse()) {
        FileBlock.encode(b, rb);
      }
      const recordBatchesOffset = b.endVector();
      Footer.startDictionariesVector(b, footer.numDictionaries);
      for (const db2 of [...footer.dictionaryBatches()].slice().reverse()) {
        FileBlock.encode(b, db2);
      }
      const dictionaryBatchesOffset = b.endVector();
      Footer.startFooter(b);
      Footer.addSchema(b, schemaOffset);
      Footer.addVersion(b, MetadataVersion.V4);
      Footer.addRecordBatches(b, recordBatchesOffset);
      Footer.addDictionaries(b, dictionaryBatchesOffset);
      Footer.finishFooterBuffer(b, Footer.endFooter(b));
      return b.asUint8Array();
    }
    get numRecordBatches() {
      return this._recordBatches.length;
    }
    get numDictionaries() {
      return this._dictionaryBatches.length;
    }
    constructor(schema, version = MetadataVersion.V4, recordBatches, dictionaryBatches) {
      this.schema = schema;
      this.version = version;
      recordBatches && (this._recordBatches = recordBatches);
      dictionaryBatches && (this._dictionaryBatches = dictionaryBatches);
    }
    *recordBatches() {
      for (let block, i = -1, n = this.numRecordBatches; ++i < n; ) {
        if (block = this.getRecordBatch(i)) {
          yield block;
        }
      }
    }
    *dictionaryBatches() {
      for (let block, i = -1, n = this.numDictionaries; ++i < n; ) {
        if (block = this.getDictionaryBatch(i)) {
          yield block;
        }
      }
    }
    getRecordBatch(index) {
      return index >= 0 && index < this.numRecordBatches && this._recordBatches[index] || null;
    }
    getDictionaryBatch(index) {
      return index >= 0 && index < this.numDictionaries && this._dictionaryBatches[index] || null;
    }
  };
  var OffHeapFooter = class extends Footer_ {
    get numRecordBatches() {
      return this._footer.recordBatchesLength();
    }
    get numDictionaries() {
      return this._footer.dictionariesLength();
    }
    constructor(schema, _footer) {
      super(schema, _footer.version());
      this._footer = _footer;
    }
    getRecordBatch(index) {
      if (index >= 0 && index < this.numRecordBatches) {
        const fileBlock = this._footer.recordBatches(index);
        if (fileBlock) {
          return FileBlock.decode(fileBlock);
        }
      }
      return null;
    }
    getDictionaryBatch(index) {
      if (index >= 0 && index < this.numDictionaries) {
        const fileBlock = this._footer.dictionaries(index);
        if (fileBlock) {
          return FileBlock.decode(fileBlock);
        }
      }
      return null;
    }
  };
  var FileBlock = class _FileBlock {
    /** @nocollapse */
    static decode(block) {
      return new _FileBlock(block.metaDataLength(), block.bodyLength(), block.offset());
    }
    /** @nocollapse */
    static encode(b, fileBlock) {
      const { metaDataLength } = fileBlock;
      const offset = BigInt(fileBlock.offset);
      const bodyLength = BigInt(fileBlock.bodyLength);
      return Block.createBlock(b, offset, metaDataLength, bodyLength);
    }
    constructor(metaDataLength, bodyLength, offset) {
      this.metaDataLength = metaDataLength;
      this.offset = bigIntToNumber(offset);
      this.bodyLength = bigIntToNumber(bodyLength);
    }
  };

  // ../../node_modules/apache-arrow/io/interfaces.mjs
  var ITERATOR_DONE = Object.freeze({ done: true, value: void 0 });
  var ArrowJSON = class {
    constructor(_json) {
      this._json = _json;
    }
    get schema() {
      return this._json["schema"];
    }
    get batches() {
      return this._json["batches"] || [];
    }
    get dictionaries() {
      return this._json["dictionaries"] || [];
    }
  };
  var ReadableInterop = class {
    tee() {
      return this._getDOMStream().tee();
    }
    pipe(writable, options) {
      return this._getNodeStream().pipe(writable, options);
    }
    pipeTo(writable, options) {
      return this._getDOMStream().pipeTo(writable, options);
    }
    pipeThrough(duplex, options) {
      return this._getDOMStream().pipeThrough(duplex, options);
    }
    _getDOMStream() {
      return this._DOMStream || (this._DOMStream = this.toDOMStream());
    }
    _getNodeStream() {
      return this._nodeStream || (this._nodeStream = this.toNodeStream());
    }
  };
  var AsyncQueue = class extends ReadableInterop {
    constructor() {
      super();
      this._values = [];
      this.resolvers = [];
      this._closedPromise = new Promise((r) => this._closedPromiseResolve = r);
    }
    get closed() {
      return this._closedPromise;
    }
    cancel(reason) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.return(reason);
      });
    }
    write(value) {
      if (this._ensureOpen()) {
        this.resolvers.length <= 0 ? this._values.push(value) : this.resolvers.shift().resolve({ done: false, value });
      }
    }
    abort(value) {
      if (this._closedPromiseResolve) {
        this.resolvers.length <= 0 ? this._error = { error: value } : this.resolvers.shift().reject({ done: true, value });
      }
    }
    close() {
      if (this._closedPromiseResolve) {
        const { resolvers } = this;
        while (resolvers.length > 0) {
          resolvers.shift().resolve(ITERATOR_DONE);
        }
        this._closedPromiseResolve();
        this._closedPromiseResolve = void 0;
      }
    }
    [Symbol.asyncIterator]() {
      return this;
    }
    toDOMStream(options) {
      return adapters_default.toDOMStream(this._closedPromiseResolve || this._error ? this : this._values, options);
    }
    toNodeStream(options) {
      return adapters_default.toNodeStream(this._closedPromiseResolve || this._error ? this : this._values, options);
    }
    throw(_) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.abort(_);
        return ITERATOR_DONE;
      });
    }
    return(_) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.close();
        return ITERATOR_DONE;
      });
    }
    read(size) {
      return __awaiter(this, void 0, void 0, function* () {
        return (yield this.next(size, "read")).value;
      });
    }
    peek(size) {
      return __awaiter(this, void 0, void 0, function* () {
        return (yield this.next(size, "peek")).value;
      });
    }
    next(..._args) {
      if (this._values.length > 0) {
        return Promise.resolve({ done: false, value: this._values.shift() });
      } else if (this._error) {
        return Promise.reject({ done: true, value: this._error.error });
      } else if (!this._closedPromiseResolve) {
        return Promise.resolve(ITERATOR_DONE);
      } else {
        return new Promise((resolve, reject) => {
          this.resolvers.push({ resolve, reject });
        });
      }
    }
    _ensureOpen() {
      if (this._closedPromiseResolve) {
        return true;
      }
      throw new Error(`AsyncQueue is closed`);
    }
  };

  // ../../node_modules/apache-arrow/io/stream.mjs
  var AsyncByteQueue = class extends AsyncQueue {
    write(value) {
      if ((value = toUint8Array(value)).byteLength > 0) {
        return super.write(value);
      }
    }
    toString(sync = false) {
      return sync ? decodeUtf8(this.toUint8Array(true)) : this.toUint8Array(false).then(decodeUtf8);
    }
    toUint8Array(sync = false) {
      return sync ? joinUint8Arrays(this._values)[0] : (() => __awaiter(this, void 0, void 0, function* () {
        var _a5, e_1, _b2, _c2;
        const buffers = [];
        let byteLength = 0;
        try {
          for (var _d2 = true, _e2 = __asyncValues(this), _f2; _f2 = yield _e2.next(), _a5 = _f2.done, !_a5; _d2 = true) {
            _c2 = _f2.value;
            _d2 = false;
            const chunk = _c2;
            buffers.push(chunk);
            byteLength += chunk.byteLength;
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (!_d2 && !_a5 && (_b2 = _e2.return))
              yield _b2.call(_e2);
          } finally {
            if (e_1)
              throw e_1.error;
          }
        }
        return joinUint8Arrays(buffers, byteLength)[0];
      }))();
    }
  };
  var ByteStream = class {
    constructor(source) {
      if (source) {
        this.source = new ByteStreamSource(adapters_default.fromIterable(source));
      }
    }
    [Symbol.iterator]() {
      return this;
    }
    next(value) {
      return this.source.next(value);
    }
    throw(value) {
      return this.source.throw(value);
    }
    return(value) {
      return this.source.return(value);
    }
    peek(size) {
      return this.source.peek(size);
    }
    read(size) {
      return this.source.read(size);
    }
  };
  var AsyncByteStream = class _AsyncByteStream {
    constructor(source) {
      if (source instanceof _AsyncByteStream) {
        this.source = source.source;
      } else if (source instanceof AsyncByteQueue) {
        this.source = new AsyncByteStreamSource(adapters_default.fromAsyncIterable(source));
      } else if (isReadableNodeStream(source)) {
        this.source = new AsyncByteStreamSource(adapters_default.fromNodeStream(source));
      } else if (isReadableDOMStream(source)) {
        this.source = new AsyncByteStreamSource(adapters_default.fromDOMStream(source));
      } else if (isFetchResponse(source)) {
        this.source = new AsyncByteStreamSource(adapters_default.fromDOMStream(source.body));
      } else if (isIterable(source)) {
        this.source = new AsyncByteStreamSource(adapters_default.fromIterable(source));
      } else if (isPromise(source)) {
        this.source = new AsyncByteStreamSource(adapters_default.fromAsyncIterable(source));
      } else if (isAsyncIterable(source)) {
        this.source = new AsyncByteStreamSource(adapters_default.fromAsyncIterable(source));
      }
    }
    [Symbol.asyncIterator]() {
      return this;
    }
    next(value) {
      return this.source.next(value);
    }
    throw(value) {
      return this.source.throw(value);
    }
    return(value) {
      return this.source.return(value);
    }
    get closed() {
      return this.source.closed;
    }
    cancel(reason) {
      return this.source.cancel(reason);
    }
    peek(size) {
      return this.source.peek(size);
    }
    read(size) {
      return this.source.read(size);
    }
  };
  var ByteStreamSource = class {
    constructor(source) {
      this.source = source;
    }
    cancel(reason) {
      this.return(reason);
    }
    peek(size) {
      return this.next(size, "peek").value;
    }
    read(size) {
      return this.next(size, "read").value;
    }
    next(size, cmd = "read") {
      return this.source.next({ cmd, size });
    }
    throw(value) {
      return Object.create(this.source.throw && this.source.throw(value) || ITERATOR_DONE);
    }
    return(value) {
      return Object.create(this.source.return && this.source.return(value) || ITERATOR_DONE);
    }
  };
  var AsyncByteStreamSource = class {
    constructor(source) {
      this.source = source;
      this._closedPromise = new Promise((r) => this._closedPromiseResolve = r);
    }
    cancel(reason) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.return(reason);
      });
    }
    get closed() {
      return this._closedPromise;
    }
    read(size) {
      return __awaiter(this, void 0, void 0, function* () {
        return (yield this.next(size, "read")).value;
      });
    }
    peek(size) {
      return __awaiter(this, void 0, void 0, function* () {
        return (yield this.next(size, "peek")).value;
      });
    }
    next(size, cmd = "read") {
      return __awaiter(this, void 0, void 0, function* () {
        return yield this.source.next({ cmd, size });
      });
    }
    throw(value) {
      return __awaiter(this, void 0, void 0, function* () {
        const result = this.source.throw && (yield this.source.throw(value)) || ITERATOR_DONE;
        this._closedPromiseResolve && this._closedPromiseResolve();
        this._closedPromiseResolve = void 0;
        return Object.create(result);
      });
    }
    return(value) {
      return __awaiter(this, void 0, void 0, function* () {
        const result = this.source.return && (yield this.source.return(value)) || ITERATOR_DONE;
        this._closedPromiseResolve && this._closedPromiseResolve();
        this._closedPromiseResolve = void 0;
        return Object.create(result);
      });
    }
  };

  // ../../node_modules/apache-arrow/io/file.mjs
  var RandomAccessFile = class extends ByteStream {
    constructor(buffer, byteLength) {
      super();
      this.position = 0;
      this.buffer = toUint8Array(buffer);
      this.size = byteLength === void 0 ? this.buffer.byteLength : byteLength;
    }
    readInt32(position) {
      const { buffer, byteOffset } = this.readAt(position, 4);
      return new DataView(buffer, byteOffset).getInt32(0, true);
    }
    seek(position) {
      this.position = Math.min(position, this.size);
      return position < this.size;
    }
    read(nBytes) {
      const { buffer, size, position } = this;
      if (buffer && position < size) {
        if (typeof nBytes !== "number") {
          nBytes = Number.POSITIVE_INFINITY;
        }
        this.position = Math.min(size, position + Math.min(size - position, nBytes));
        return buffer.subarray(position, this.position);
      }
      return null;
    }
    readAt(position, nBytes) {
      const buf = this.buffer;
      const end = Math.min(this.size, position + nBytes);
      return buf ? buf.subarray(position, end) : new Uint8Array(nBytes);
    }
    close() {
      this.buffer && (this.buffer = null);
    }
    throw(value) {
      this.close();
      return { done: true, value };
    }
    return(value) {
      this.close();
      return { done: true, value };
    }
  };
  var AsyncRandomAccessFile = class extends AsyncByteStream {
    constructor(file, byteLength) {
      super();
      this.position = 0;
      this._handle = file;
      if (typeof byteLength === "number") {
        this.size = byteLength;
      } else {
        this._pending = (() => __awaiter(this, void 0, void 0, function* () {
          this.size = (yield file.stat()).size;
          delete this._pending;
        }))();
      }
    }
    readInt32(position) {
      return __awaiter(this, void 0, void 0, function* () {
        const { buffer, byteOffset } = yield this.readAt(position, 4);
        return new DataView(buffer, byteOffset).getInt32(0, true);
      });
    }
    seek(position) {
      return __awaiter(this, void 0, void 0, function* () {
        this._pending && (yield this._pending);
        this.position = Math.min(position, this.size);
        return position < this.size;
      });
    }
    read(nBytes) {
      return __awaiter(this, void 0, void 0, function* () {
        this._pending && (yield this._pending);
        const { _handle: file, size, position } = this;
        if (file && position < size) {
          if (typeof nBytes !== "number") {
            nBytes = Number.POSITIVE_INFINITY;
          }
          let pos = position, offset = 0, bytesRead = 0;
          const end = Math.min(size, pos + Math.min(size - pos, nBytes));
          const buffer = new Uint8Array(Math.max(0, (this.position = end) - pos));
          while ((pos += bytesRead) < end && (offset += bytesRead) < buffer.byteLength) {
            ({ bytesRead } = yield file.read(buffer, offset, buffer.byteLength - offset, pos));
          }
          return buffer;
        }
        return null;
      });
    }
    readAt(position, nBytes) {
      return __awaiter(this, void 0, void 0, function* () {
        this._pending && (yield this._pending);
        const { _handle: file, size } = this;
        if (file && position + nBytes < size) {
          const end = Math.min(size, position + nBytes);
          const buffer = new Uint8Array(end - position);
          return (yield file.read(buffer, 0, nBytes, position)).buffer;
        }
        return new Uint8Array(nBytes);
      });
    }
    close() {
      return __awaiter(this, void 0, void 0, function* () {
        const f = this._handle;
        this._handle = null;
        f && (yield f.close());
      });
    }
    throw(value) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.close();
        return { done: true, value };
      });
    }
    return(value) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.close();
        return { done: true, value };
      });
    }
  };

  // ../../node_modules/apache-arrow/util/int.mjs
  var int_exports = {};
  __export(int_exports, {
    BaseInt64: () => BaseInt64,
    Int128: () => Int128,
    Int64: () => Int642,
    Uint64: () => Uint642
  });
  var carryBit16 = 1 << 16;
  function intAsHex(value) {
    if (value < 0) {
      value = 4294967295 + value + 1;
    }
    return `0x${value.toString(16)}`;
  }
  var kInt32DecimalDigits = 8;
  var kPowersOfTen = [
    1,
    10,
    100,
    1e3,
    1e4,
    1e5,
    1e6,
    1e7,
    1e8
  ];
  var BaseInt64 = class {
    constructor(buffer) {
      this.buffer = buffer;
    }
    high() {
      return this.buffer[1];
    }
    low() {
      return this.buffer[0];
    }
    _times(other) {
      const L = new Uint32Array([
        this.buffer[1] >>> 16,
        this.buffer[1] & 65535,
        this.buffer[0] >>> 16,
        this.buffer[0] & 65535
      ]);
      const R = new Uint32Array([
        other.buffer[1] >>> 16,
        other.buffer[1] & 65535,
        other.buffer[0] >>> 16,
        other.buffer[0] & 65535
      ]);
      let product = L[3] * R[3];
      this.buffer[0] = product & 65535;
      let sum2 = product >>> 16;
      product = L[2] * R[3];
      sum2 += product;
      product = L[3] * R[2] >>> 0;
      sum2 += product;
      this.buffer[0] += sum2 << 16;
      this.buffer[1] = sum2 >>> 0 < product ? carryBit16 : 0;
      this.buffer[1] += sum2 >>> 16;
      this.buffer[1] += L[1] * R[3] + L[2] * R[2] + L[3] * R[1];
      this.buffer[1] += L[0] * R[3] + L[1] * R[2] + L[2] * R[1] + L[3] * R[0] << 16;
      return this;
    }
    _plus(other) {
      const sum2 = this.buffer[0] + other.buffer[0] >>> 0;
      this.buffer[1] += other.buffer[1];
      if (sum2 < this.buffer[0] >>> 0) {
        ++this.buffer[1];
      }
      this.buffer[0] = sum2;
    }
    lessThan(other) {
      return this.buffer[1] < other.buffer[1] || this.buffer[1] === other.buffer[1] && this.buffer[0] < other.buffer[0];
    }
    equals(other) {
      return this.buffer[1] === other.buffer[1] && this.buffer[0] == other.buffer[0];
    }
    greaterThan(other) {
      return other.lessThan(this);
    }
    hex() {
      return `${intAsHex(this.buffer[1])} ${intAsHex(this.buffer[0])}`;
    }
  };
  var Uint642 = class _Uint64 extends BaseInt64 {
    times(other) {
      this._times(other);
      return this;
    }
    plus(other) {
      this._plus(other);
      return this;
    }
    /** @nocollapse */
    static from(val, out_buffer = new Uint32Array(2)) {
      return _Uint64.fromString(typeof val === "string" ? val : val.toString(), out_buffer);
    }
    /** @nocollapse */
    static fromNumber(num, out_buffer = new Uint32Array(2)) {
      return _Uint64.fromString(num.toString(), out_buffer);
    }
    /** @nocollapse */
    static fromString(str, out_buffer = new Uint32Array(2)) {
      const length = str.length;
      const out = new _Uint64(out_buffer);
      for (let posn = 0; posn < length; ) {
        const group = kInt32DecimalDigits < length - posn ? kInt32DecimalDigits : length - posn;
        const chunk = new _Uint64(new Uint32Array([Number.parseInt(str.slice(posn, posn + group), 10), 0]));
        const multiple = new _Uint64(new Uint32Array([kPowersOfTen[group], 0]));
        out.times(multiple);
        out.plus(chunk);
        posn += group;
      }
      return out;
    }
    /** @nocollapse */
    static convertArray(values) {
      const data = new Uint32Array(values.length * 2);
      for (let i = -1, n = values.length; ++i < n; ) {
        _Uint64.from(values[i], new Uint32Array(data.buffer, data.byteOffset + 2 * i * 4, 2));
      }
      return data;
    }
    /** @nocollapse */
    static multiply(left, right) {
      const rtrn = new _Uint64(new Uint32Array(left.buffer));
      return rtrn.times(right);
    }
    /** @nocollapse */
    static add(left, right) {
      const rtrn = new _Uint64(new Uint32Array(left.buffer));
      return rtrn.plus(right);
    }
  };
  var Int642 = class _Int64 extends BaseInt64 {
    negate() {
      this.buffer[0] = ~this.buffer[0] + 1;
      this.buffer[1] = ~this.buffer[1];
      if (this.buffer[0] == 0) {
        ++this.buffer[1];
      }
      return this;
    }
    times(other) {
      this._times(other);
      return this;
    }
    plus(other) {
      this._plus(other);
      return this;
    }
    lessThan(other) {
      const this_high = this.buffer[1] << 0;
      const other_high = other.buffer[1] << 0;
      return this_high < other_high || this_high === other_high && this.buffer[0] < other.buffer[0];
    }
    /** @nocollapse */
    static from(val, out_buffer = new Uint32Array(2)) {
      return _Int64.fromString(typeof val === "string" ? val : val.toString(), out_buffer);
    }
    /** @nocollapse */
    static fromNumber(num, out_buffer = new Uint32Array(2)) {
      return _Int64.fromString(num.toString(), out_buffer);
    }
    /** @nocollapse */
    static fromString(str, out_buffer = new Uint32Array(2)) {
      const negate = str.startsWith("-");
      const length = str.length;
      const out = new _Int64(out_buffer);
      for (let posn = negate ? 1 : 0; posn < length; ) {
        const group = kInt32DecimalDigits < length - posn ? kInt32DecimalDigits : length - posn;
        const chunk = new _Int64(new Uint32Array([Number.parseInt(str.slice(posn, posn + group), 10), 0]));
        const multiple = new _Int64(new Uint32Array([kPowersOfTen[group], 0]));
        out.times(multiple);
        out.plus(chunk);
        posn += group;
      }
      return negate ? out.negate() : out;
    }
    /** @nocollapse */
    static convertArray(values) {
      const data = new Uint32Array(values.length * 2);
      for (let i = -1, n = values.length; ++i < n; ) {
        _Int64.from(values[i], new Uint32Array(data.buffer, data.byteOffset + 2 * i * 4, 2));
      }
      return data;
    }
    /** @nocollapse */
    static multiply(left, right) {
      const rtrn = new _Int64(new Uint32Array(left.buffer));
      return rtrn.times(right);
    }
    /** @nocollapse */
    static add(left, right) {
      const rtrn = new _Int64(new Uint32Array(left.buffer));
      return rtrn.plus(right);
    }
  };
  var Int128 = class _Int128 {
    constructor(buffer) {
      this.buffer = buffer;
    }
    high() {
      return new Int642(new Uint32Array(this.buffer.buffer, this.buffer.byteOffset + 8, 2));
    }
    low() {
      return new Int642(new Uint32Array(this.buffer.buffer, this.buffer.byteOffset, 2));
    }
    negate() {
      this.buffer[0] = ~this.buffer[0] + 1;
      this.buffer[1] = ~this.buffer[1];
      this.buffer[2] = ~this.buffer[2];
      this.buffer[3] = ~this.buffer[3];
      if (this.buffer[0] == 0) {
        ++this.buffer[1];
      }
      if (this.buffer[1] == 0) {
        ++this.buffer[2];
      }
      if (this.buffer[2] == 0) {
        ++this.buffer[3];
      }
      return this;
    }
    times(other) {
      const L0 = new Uint642(new Uint32Array([this.buffer[3], 0]));
      const L1 = new Uint642(new Uint32Array([this.buffer[2], 0]));
      const L2 = new Uint642(new Uint32Array([this.buffer[1], 0]));
      const L3 = new Uint642(new Uint32Array([this.buffer[0], 0]));
      const R0 = new Uint642(new Uint32Array([other.buffer[3], 0]));
      const R1 = new Uint642(new Uint32Array([other.buffer[2], 0]));
      const R2 = new Uint642(new Uint32Array([other.buffer[1], 0]));
      const R3 = new Uint642(new Uint32Array([other.buffer[0], 0]));
      let product = Uint642.multiply(L3, R3);
      this.buffer[0] = product.low();
      const sum2 = new Uint642(new Uint32Array([product.high(), 0]));
      product = Uint642.multiply(L2, R3);
      sum2.plus(product);
      product = Uint642.multiply(L3, R2);
      sum2.plus(product);
      this.buffer[1] = sum2.low();
      this.buffer[3] = sum2.lessThan(product) ? 1 : 0;
      this.buffer[2] = sum2.high();
      const high = new Uint642(new Uint32Array(this.buffer.buffer, this.buffer.byteOffset + 8, 2));
      high.plus(Uint642.multiply(L1, R3)).plus(Uint642.multiply(L2, R2)).plus(Uint642.multiply(L3, R1));
      this.buffer[3] += Uint642.multiply(L0, R3).plus(Uint642.multiply(L1, R2)).plus(Uint642.multiply(L2, R1)).plus(Uint642.multiply(L3, R0)).low();
      return this;
    }
    plus(other) {
      const sums = new Uint32Array(4);
      sums[3] = this.buffer[3] + other.buffer[3] >>> 0;
      sums[2] = this.buffer[2] + other.buffer[2] >>> 0;
      sums[1] = this.buffer[1] + other.buffer[1] >>> 0;
      sums[0] = this.buffer[0] + other.buffer[0] >>> 0;
      if (sums[0] < this.buffer[0] >>> 0) {
        ++sums[1];
      }
      if (sums[1] < this.buffer[1] >>> 0) {
        ++sums[2];
      }
      if (sums[2] < this.buffer[2] >>> 0) {
        ++sums[3];
      }
      this.buffer[3] = sums[3];
      this.buffer[2] = sums[2];
      this.buffer[1] = sums[1];
      this.buffer[0] = sums[0];
      return this;
    }
    hex() {
      return `${intAsHex(this.buffer[3])} ${intAsHex(this.buffer[2])} ${intAsHex(this.buffer[1])} ${intAsHex(this.buffer[0])}`;
    }
    /** @nocollapse */
    static multiply(left, right) {
      const rtrn = new _Int128(new Uint32Array(left.buffer));
      return rtrn.times(right);
    }
    /** @nocollapse */
    static add(left, right) {
      const rtrn = new _Int128(new Uint32Array(left.buffer));
      return rtrn.plus(right);
    }
    /** @nocollapse */
    static from(val, out_buffer = new Uint32Array(4)) {
      return _Int128.fromString(typeof val === "string" ? val : val.toString(), out_buffer);
    }
    /** @nocollapse */
    static fromNumber(num, out_buffer = new Uint32Array(4)) {
      return _Int128.fromString(num.toString(), out_buffer);
    }
    /** @nocollapse */
    static fromString(str, out_buffer = new Uint32Array(4)) {
      const negate = str.startsWith("-");
      const length = str.length;
      const out = new _Int128(out_buffer);
      for (let posn = negate ? 1 : 0; posn < length; ) {
        const group = kInt32DecimalDigits < length - posn ? kInt32DecimalDigits : length - posn;
        const chunk = new _Int128(new Uint32Array([Number.parseInt(str.slice(posn, posn + group), 10), 0, 0, 0]));
        const multiple = new _Int128(new Uint32Array([kPowersOfTen[group], 0, 0, 0]));
        out.times(multiple);
        out.plus(chunk);
        posn += group;
      }
      return negate ? out.negate() : out;
    }
    /** @nocollapse */
    static convertArray(values) {
      const data = new Uint32Array(values.length * 4);
      for (let i = -1, n = values.length; ++i < n; ) {
        _Int128.from(values[i], new Uint32Array(data.buffer, data.byteOffset + 4 * 4 * i, 4));
      }
      return data;
    }
  };

  // ../../node_modules/apache-arrow/visitor/vectorloader.mjs
  var VectorLoader = class extends Visitor {
    constructor(bytes, nodes, buffers, dictionaries) {
      super();
      this.nodesIndex = -1;
      this.buffersIndex = -1;
      this.bytes = bytes;
      this.nodes = nodes;
      this.buffers = buffers;
      this.dictionaries = dictionaries;
    }
    visit(node) {
      return super.visit(node instanceof Field2 ? node.type : node);
    }
    visitNull(type, { length } = this.nextFieldNode()) {
      return makeData({ type, length });
    }
    visitBool(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitInt(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitFloat(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitUtf8(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), valueOffsets: this.readOffsets(type), data: this.readData(type) });
    }
    visitBinary(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), valueOffsets: this.readOffsets(type), data: this.readData(type) });
    }
    visitFixedSizeBinary(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitDate(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitTimestamp(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitTime(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitDecimal(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitList(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), valueOffsets: this.readOffsets(type), "child": this.visit(type.children[0]) });
    }
    visitStruct(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), children: this.visitMany(type.children) });
    }
    visitUnion(type) {
      return type.mode === UnionMode.Sparse ? this.visitSparseUnion(type) : this.visitDenseUnion(type);
    }
    visitDenseUnion(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), typeIds: this.readTypeIds(type), valueOffsets: this.readOffsets(type), children: this.visitMany(type.children) });
    }
    visitSparseUnion(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), typeIds: this.readTypeIds(type), children: this.visitMany(type.children) });
    }
    visitDictionary(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type.indices), dictionary: this.readDictionary(type) });
    }
    visitInterval(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitFixedSizeList(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), "child": this.visit(type.children[0]) });
    }
    visitMap(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), valueOffsets: this.readOffsets(type), "child": this.visit(type.children[0]) });
    }
    nextFieldNode() {
      return this.nodes[++this.nodesIndex];
    }
    nextBufferRange() {
      return this.buffers[++this.buffersIndex];
    }
    readNullBitmap(type, nullCount, buffer = this.nextBufferRange()) {
      return nullCount > 0 && this.readData(type, buffer) || new Uint8Array(0);
    }
    readOffsets(type, buffer) {
      return this.readData(type, buffer);
    }
    readTypeIds(type, buffer) {
      return this.readData(type, buffer);
    }
    readData(_type, { length, offset } = this.nextBufferRange()) {
      return this.bytes.subarray(offset, offset + length);
    }
    readDictionary(type) {
      return this.dictionaries.get(type.id);
    }
  };
  var JSONVectorLoader = class extends VectorLoader {
    constructor(sources, nodes, buffers, dictionaries) {
      super(new Uint8Array(0), nodes, buffers, dictionaries);
      this.sources = sources;
    }
    readNullBitmap(_type, nullCount, { offset } = this.nextBufferRange()) {
      return nullCount <= 0 ? new Uint8Array(0) : packBools(this.sources[offset]);
    }
    readOffsets(_type, { offset } = this.nextBufferRange()) {
      return toArrayBufferView(Uint8Array, toArrayBufferView(Int32Array, this.sources[offset]));
    }
    readTypeIds(type, { offset } = this.nextBufferRange()) {
      return toArrayBufferView(Uint8Array, toArrayBufferView(type.ArrayType, this.sources[offset]));
    }
    readData(type, { offset } = this.nextBufferRange()) {
      const { sources } = this;
      if (DataType.isTimestamp(type)) {
        return toArrayBufferView(Uint8Array, Int642.convertArray(sources[offset]));
      } else if ((DataType.isInt(type) || DataType.isTime(type)) && type.bitWidth === 64) {
        return toArrayBufferView(Uint8Array, Int642.convertArray(sources[offset]));
      } else if (DataType.isDate(type) && type.unit === DateUnit.MILLISECOND) {
        return toArrayBufferView(Uint8Array, Int642.convertArray(sources[offset]));
      } else if (DataType.isDecimal(type)) {
        return toArrayBufferView(Uint8Array, Int128.convertArray(sources[offset]));
      } else if (DataType.isBinary(type) || DataType.isFixedSizeBinary(type)) {
        return binaryDataFromJSON(sources[offset]);
      } else if (DataType.isBool(type)) {
        return packBools(sources[offset]);
      } else if (DataType.isUtf8(type)) {
        return encodeUtf8(sources[offset].join(""));
      }
      return toArrayBufferView(Uint8Array, toArrayBufferView(type.ArrayType, sources[offset].map((x) => +x)));
    }
  };
  function binaryDataFromJSON(values) {
    const joined = values.join("");
    const data = new Uint8Array(joined.length / 2);
    for (let i = 0; i < joined.length; i += 2) {
      data[i >> 1] = Number.parseInt(joined.slice(i, i + 2), 16);
    }
    return data;
  }

  // ../../node_modules/apache-arrow/builder/binary.mjs
  var BinaryBuilder = class extends VariableWidthBuilder {
    constructor(opts) {
      super(opts);
      this._values = new BufferBuilder(new Uint8Array(0));
    }
    get byteLength() {
      let size = this._pendingLength + this.length * 4;
      this._offsets && (size += this._offsets.byteLength);
      this._values && (size += this._values.byteLength);
      this._nulls && (size += this._nulls.byteLength);
      return size;
    }
    setValue(index, value) {
      return super.setValue(index, toUint8Array(value));
    }
    _flushPending(pending, pendingLength) {
      const offsets = this._offsets;
      const data = this._values.reserve(pendingLength).buffer;
      let offset = 0;
      for (const [index, value] of pending) {
        if (value === void 0) {
          offsets.set(index, 0);
        } else {
          const length = value.length;
          data.set(value, offset);
          offsets.set(index, length);
          offset += length;
        }
      }
    }
  };

  // ../../node_modules/apache-arrow/builder/bool.mjs
  var BoolBuilder = class extends Builder {
    constructor(options) {
      super(options);
      this._values = new BitmapBufferBuilder();
    }
    setValue(index, value) {
      this._values.set(index, +value);
    }
  };

  // ../../node_modules/apache-arrow/builder/date.mjs
  var DateBuilder = class extends FixedWidthBuilder {
  };
  DateBuilder.prototype._setValue = setDate;
  var DateDayBuilder = class extends DateBuilder {
  };
  DateDayBuilder.prototype._setValue = setDateDay;
  var DateMillisecondBuilder = class extends DateBuilder {
  };
  DateMillisecondBuilder.prototype._setValue = setDateMillisecond;

  // ../../node_modules/apache-arrow/builder/decimal.mjs
  var DecimalBuilder = class extends FixedWidthBuilder {
  };
  DecimalBuilder.prototype._setValue = setDecimal;

  // ../../node_modules/apache-arrow/builder/dictionary.mjs
  var DictionaryBuilder = class extends Builder {
    constructor({ "type": type, "nullValues": nulls, "dictionaryHashFunction": hashFn }) {
      super({ type: new Dictionary(type.dictionary, type.indices, type.id, type.isOrdered) });
      this._nulls = null;
      this._dictionaryOffset = 0;
      this._keysToIndices = /* @__PURE__ */ Object.create(null);
      this.indices = makeBuilder({ "type": this.type.indices, "nullValues": nulls });
      this.dictionary = makeBuilder({ "type": this.type.dictionary, "nullValues": null });
      if (typeof hashFn === "function") {
        this.valueToKey = hashFn;
      }
    }
    get values() {
      return this.indices.values;
    }
    get nullCount() {
      return this.indices.nullCount;
    }
    get nullBitmap() {
      return this.indices.nullBitmap;
    }
    get byteLength() {
      return this.indices.byteLength + this.dictionary.byteLength;
    }
    get reservedLength() {
      return this.indices.reservedLength + this.dictionary.reservedLength;
    }
    get reservedByteLength() {
      return this.indices.reservedByteLength + this.dictionary.reservedByteLength;
    }
    isValid(value) {
      return this.indices.isValid(value);
    }
    setValid(index, valid) {
      const indices = this.indices;
      valid = indices.setValid(index, valid);
      this.length = indices.length;
      return valid;
    }
    setValue(index, value) {
      const keysToIndices = this._keysToIndices;
      const key = this.valueToKey(value);
      let idx = keysToIndices[key];
      if (idx === void 0) {
        keysToIndices[key] = idx = this._dictionaryOffset + this.dictionary.append(value).length - 1;
      }
      return this.indices.setValue(index, idx);
    }
    flush() {
      const type = this.type;
      const prev = this._dictionary;
      const curr = this.dictionary.toVector();
      const data = this.indices.flush().clone(type);
      data.dictionary = prev ? prev.concat(curr) : curr;
      this.finished || (this._dictionaryOffset += curr.length);
      this._dictionary = data.dictionary;
      this.clear();
      return data;
    }
    finish() {
      this.indices.finish();
      this.dictionary.finish();
      this._dictionaryOffset = 0;
      this._keysToIndices = /* @__PURE__ */ Object.create(null);
      return super.finish();
    }
    clear() {
      this.indices.clear();
      this.dictionary.clear();
      return super.clear();
    }
    valueToKey(val) {
      return typeof val === "string" ? val : `${val}`;
    }
  };

  // ../../node_modules/apache-arrow/builder/fixedsizebinary.mjs
  var FixedSizeBinaryBuilder = class extends FixedWidthBuilder {
  };
  FixedSizeBinaryBuilder.prototype._setValue = setFixedSizeBinary;

  // ../../node_modules/apache-arrow/builder/fixedsizelist.mjs
  var FixedSizeListBuilder = class extends Builder {
    setValue(index, value) {
      const [child] = this.children;
      const start = index * this.stride;
      for (let i = -1, n = value.length; ++i < n; ) {
        child.set(start + i, value[i]);
      }
    }
    addChild(child, name = "0") {
      if (this.numChildren > 0) {
        throw new Error("FixedSizeListBuilder can only have one child.");
      }
      const childIndex = this.children.push(child);
      this.type = new FixedSizeList(this.type.listSize, new Field2(name, child.type, true));
      return childIndex;
    }
  };

  // ../../node_modules/apache-arrow/builder/float.mjs
  var FloatBuilder = class extends FixedWidthBuilder {
    setValue(index, value) {
      this._values.set(index, value);
    }
  };
  var Float16Builder = class extends FloatBuilder {
    setValue(index, value) {
      super.setValue(index, float64ToUint16(value));
    }
  };
  var Float32Builder = class extends FloatBuilder {
  };
  var Float64Builder = class extends FloatBuilder {
  };

  // ../../node_modules/apache-arrow/builder/interval.mjs
  var IntervalBuilder = class extends FixedWidthBuilder {
  };
  IntervalBuilder.prototype._setValue = setIntervalValue;
  var IntervalDayTimeBuilder = class extends IntervalBuilder {
  };
  IntervalDayTimeBuilder.prototype._setValue = setIntervalDayTime;
  var IntervalYearMonthBuilder = class extends IntervalBuilder {
  };
  IntervalYearMonthBuilder.prototype._setValue = setIntervalYearMonth;

  // ../../node_modules/apache-arrow/builder/int.mjs
  var IntBuilder = class extends FixedWidthBuilder {
    setValue(index, value) {
      this._values.set(index, value);
    }
  };
  var Int8Builder = class extends IntBuilder {
  };
  var Int16Builder = class extends IntBuilder {
  };
  var Int32Builder = class extends IntBuilder {
  };
  var Int64Builder = class extends IntBuilder {
  };
  var Uint8Builder = class extends IntBuilder {
  };
  var Uint16Builder = class extends IntBuilder {
  };
  var Uint32Builder = class extends IntBuilder {
  };
  var Uint64Builder = class extends IntBuilder {
  };

  // ../../node_modules/apache-arrow/builder/list.mjs
  var ListBuilder = class extends VariableWidthBuilder {
    constructor(opts) {
      super(opts);
      this._offsets = new OffsetsBufferBuilder();
    }
    addChild(child, name = "0") {
      if (this.numChildren > 0) {
        throw new Error("ListBuilder can only have one child.");
      }
      this.children[this.numChildren] = child;
      this.type = new List(new Field2(name, child.type, true));
      return this.numChildren - 1;
    }
    _flushPending(pending) {
      const offsets = this._offsets;
      const [child] = this.children;
      for (const [index, value] of pending) {
        if (typeof value === "undefined") {
          offsets.set(index, 0);
        } else {
          const v = value;
          const n = v.length;
          const start = offsets.set(index, n).buffer[index];
          for (let i = -1; ++i < n; ) {
            child.set(start + i, v[i]);
          }
        }
      }
    }
  };

  // ../../node_modules/apache-arrow/builder/map.mjs
  var MapBuilder = class extends VariableWidthBuilder {
    set(index, value) {
      return super.set(index, value);
    }
    setValue(index, value) {
      const row = value instanceof Map ? value : new Map(Object.entries(value));
      const pending = this._pending || (this._pending = /* @__PURE__ */ new Map());
      const current = pending.get(index);
      current && (this._pendingLength -= current.size);
      this._pendingLength += row.size;
      pending.set(index, row);
    }
    addChild(child, name = `${this.numChildren}`) {
      if (this.numChildren > 0) {
        throw new Error("ListBuilder can only have one child.");
      }
      this.children[this.numChildren] = child;
      this.type = new Map_(new Field2(name, child.type, true), this.type.keysSorted);
      return this.numChildren - 1;
    }
    _flushPending(pending) {
      const offsets = this._offsets;
      const [child] = this.children;
      for (const [index, value] of pending) {
        if (value === void 0) {
          offsets.set(index, 0);
        } else {
          let { [index]: idx, [index + 1]: end } = offsets.set(index, value.size).buffer;
          for (const val of value.entries()) {
            child.set(idx, val);
            if (++idx >= end)
              break;
          }
        }
      }
    }
  };

  // ../../node_modules/apache-arrow/builder/null.mjs
  var NullBuilder = class extends Builder {
    // @ts-ignore
    setValue(index, value) {
    }
    setValid(index, valid) {
      this.length = Math.max(index + 1, this.length);
      return valid;
    }
  };

  // ../../node_modules/apache-arrow/builder/struct.mjs
  var StructBuilder = class extends Builder {
    setValue(index, value) {
      const { children, type } = this;
      switch (Array.isArray(value) || value.constructor) {
        case true:
          return type.children.forEach((_, i) => children[i].set(index, value[i]));
        case Map:
          return type.children.forEach((f, i) => children[i].set(index, value.get(f.name)));
        default:
          return type.children.forEach((f, i) => children[i].set(index, value[f.name]));
      }
    }
    /** @inheritdoc */
    setValid(index, valid) {
      if (!super.setValid(index, valid)) {
        this.children.forEach((child) => child.setValid(index, valid));
      }
      return valid;
    }
    addChild(child, name = `${this.numChildren}`) {
      const childIndex = this.children.push(child);
      this.type = new Struct([...this.type.children, new Field2(name, child.type, true)]);
      return childIndex;
    }
  };

  // ../../node_modules/apache-arrow/builder/timestamp.mjs
  var TimestampBuilder = class extends FixedWidthBuilder {
  };
  TimestampBuilder.prototype._setValue = setTimestamp;
  var TimestampSecondBuilder = class extends TimestampBuilder {
  };
  TimestampSecondBuilder.prototype._setValue = setTimestampSecond;
  var TimestampMillisecondBuilder = class extends TimestampBuilder {
  };
  TimestampMillisecondBuilder.prototype._setValue = setTimestampMillisecond;
  var TimestampMicrosecondBuilder = class extends TimestampBuilder {
  };
  TimestampMicrosecondBuilder.prototype._setValue = setTimestampMicrosecond;
  var TimestampNanosecondBuilder = class extends TimestampBuilder {
  };
  TimestampNanosecondBuilder.prototype._setValue = setTimestampNanosecond;

  // ../../node_modules/apache-arrow/builder/time.mjs
  var TimeBuilder = class extends FixedWidthBuilder {
  };
  TimeBuilder.prototype._setValue = setTime;
  var TimeSecondBuilder = class extends TimeBuilder {
  };
  TimeSecondBuilder.prototype._setValue = setTimeSecond;
  var TimeMillisecondBuilder = class extends TimeBuilder {
  };
  TimeMillisecondBuilder.prototype._setValue = setTimeMillisecond;
  var TimeMicrosecondBuilder = class extends TimeBuilder {
  };
  TimeMicrosecondBuilder.prototype._setValue = setTimeMicrosecond;
  var TimeNanosecondBuilder = class extends TimeBuilder {
  };
  TimeNanosecondBuilder.prototype._setValue = setTimeNanosecond;

  // ../../node_modules/apache-arrow/builder/union.mjs
  var UnionBuilder = class extends Builder {
    constructor(options) {
      super(options);
      this._typeIds = new DataBufferBuilder(new Int8Array(0), 1);
      if (typeof options["valueToChildTypeId"] === "function") {
        this._valueToChildTypeId = options["valueToChildTypeId"];
      }
    }
    get typeIdToChildIndex() {
      return this.type.typeIdToChildIndex;
    }
    append(value, childTypeId) {
      return this.set(this.length, value, childTypeId);
    }
    set(index, value, childTypeId) {
      if (childTypeId === void 0) {
        childTypeId = this._valueToChildTypeId(this, value, index);
      }
      if (this.setValid(index, this.isValid(value))) {
        this.setValue(index, value, childTypeId);
      }
      return this;
    }
    setValue(index, value, childTypeId) {
      this._typeIds.set(index, childTypeId);
      const childIndex = this.type.typeIdToChildIndex[childTypeId];
      const child = this.children[childIndex];
      child === null || child === void 0 ? void 0 : child.set(index, value);
    }
    addChild(child, name = `${this.children.length}`) {
      const childTypeId = this.children.push(child);
      const { type: { children, mode, typeIds } } = this;
      const fields = [...children, new Field2(name, child.type)];
      this.type = new Union_(mode, [...typeIds, childTypeId], fields);
      return childTypeId;
    }
    /** @ignore */
    // @ts-ignore
    _valueToChildTypeId(builder, value, offset) {
      throw new Error(`Cannot map UnionBuilder value to child typeId. Pass the \`childTypeId\` as the second argument to unionBuilder.append(), or supply a \`valueToChildTypeId\` function as part of the UnionBuilder constructor options.`);
    }
  };
  var SparseUnionBuilder = class extends UnionBuilder {
  };
  var DenseUnionBuilder = class extends UnionBuilder {
    constructor(options) {
      super(options);
      this._offsets = new DataBufferBuilder(new Int32Array(0));
    }
    /** @ignore */
    setValue(index, value, childTypeId) {
      const id = this._typeIds.set(index, childTypeId).buffer[index];
      const child = this.getChildAt(this.type.typeIdToChildIndex[id]);
      const denseIndex = this._offsets.set(index, child.length).buffer[index];
      child === null || child === void 0 ? void 0 : child.set(denseIndex, value);
    }
  };

  // ../../node_modules/apache-arrow/builder/utf8.mjs
  var Utf8Builder = class extends VariableWidthBuilder {
    constructor(opts) {
      super(opts);
      this._values = new BufferBuilder(new Uint8Array(0));
    }
    get byteLength() {
      let size = this._pendingLength + this.length * 4;
      this._offsets && (size += this._offsets.byteLength);
      this._values && (size += this._values.byteLength);
      this._nulls && (size += this._nulls.byteLength);
      return size;
    }
    setValue(index, value) {
      return super.setValue(index, encodeUtf8(value));
    }
    // @ts-ignore
    _flushPending(pending, pendingLength) {
    }
  };
  Utf8Builder.prototype._flushPending = BinaryBuilder.prototype._flushPending;

  // ../../node_modules/apache-arrow/visitor/builderctor.mjs
  var GetBuilderCtor = class extends Visitor {
    visitNull() {
      return NullBuilder;
    }
    visitBool() {
      return BoolBuilder;
    }
    visitInt() {
      return IntBuilder;
    }
    visitInt8() {
      return Int8Builder;
    }
    visitInt16() {
      return Int16Builder;
    }
    visitInt32() {
      return Int32Builder;
    }
    visitInt64() {
      return Int64Builder;
    }
    visitUint8() {
      return Uint8Builder;
    }
    visitUint16() {
      return Uint16Builder;
    }
    visitUint32() {
      return Uint32Builder;
    }
    visitUint64() {
      return Uint64Builder;
    }
    visitFloat() {
      return FloatBuilder;
    }
    visitFloat16() {
      return Float16Builder;
    }
    visitFloat32() {
      return Float32Builder;
    }
    visitFloat64() {
      return Float64Builder;
    }
    visitUtf8() {
      return Utf8Builder;
    }
    visitBinary() {
      return BinaryBuilder;
    }
    visitFixedSizeBinary() {
      return FixedSizeBinaryBuilder;
    }
    visitDate() {
      return DateBuilder;
    }
    visitDateDay() {
      return DateDayBuilder;
    }
    visitDateMillisecond() {
      return DateMillisecondBuilder;
    }
    visitTimestamp() {
      return TimestampBuilder;
    }
    visitTimestampSecond() {
      return TimestampSecondBuilder;
    }
    visitTimestampMillisecond() {
      return TimestampMillisecondBuilder;
    }
    visitTimestampMicrosecond() {
      return TimestampMicrosecondBuilder;
    }
    visitTimestampNanosecond() {
      return TimestampNanosecondBuilder;
    }
    visitTime() {
      return TimeBuilder;
    }
    visitTimeSecond() {
      return TimeSecondBuilder;
    }
    visitTimeMillisecond() {
      return TimeMillisecondBuilder;
    }
    visitTimeMicrosecond() {
      return TimeMicrosecondBuilder;
    }
    visitTimeNanosecond() {
      return TimeNanosecondBuilder;
    }
    visitDecimal() {
      return DecimalBuilder;
    }
    visitList() {
      return ListBuilder;
    }
    visitStruct() {
      return StructBuilder;
    }
    visitUnion() {
      return UnionBuilder;
    }
    visitDenseUnion() {
      return DenseUnionBuilder;
    }
    visitSparseUnion() {
      return SparseUnionBuilder;
    }
    visitDictionary() {
      return DictionaryBuilder;
    }
    visitInterval() {
      return IntervalBuilder;
    }
    visitIntervalDayTime() {
      return IntervalDayTimeBuilder;
    }
    visitIntervalYearMonth() {
      return IntervalYearMonthBuilder;
    }
    visitFixedSizeList() {
      return FixedSizeListBuilder;
    }
    visitMap() {
      return MapBuilder;
    }
  };
  var instance6 = new GetBuilderCtor();

  // ../../node_modules/apache-arrow/visitor/typecomparator.mjs
  var TypeComparator = class extends Visitor {
    compareSchemas(schema, other) {
      return schema === other || other instanceof schema.constructor && this.compareManyFields(schema.fields, other.fields);
    }
    compareManyFields(fields, others) {
      return fields === others || Array.isArray(fields) && Array.isArray(others) && fields.length === others.length && fields.every((f, i) => this.compareFields(f, others[i]));
    }
    compareFields(field, other) {
      return field === other || other instanceof field.constructor && field.name === other.name && field.nullable === other.nullable && this.visit(field.type, other.type);
    }
  };
  function compareConstructor(type, other) {
    return other instanceof type.constructor;
  }
  function compareAny(type, other) {
    return type === other || compareConstructor(type, other);
  }
  function compareInt(type, other) {
    return type === other || compareConstructor(type, other) && type.bitWidth === other.bitWidth && type.isSigned === other.isSigned;
  }
  function compareFloat(type, other) {
    return type === other || compareConstructor(type, other) && type.precision === other.precision;
  }
  function compareFixedSizeBinary(type, other) {
    return type === other || compareConstructor(type, other) && type.byteWidth === other.byteWidth;
  }
  function compareDate(type, other) {
    return type === other || compareConstructor(type, other) && type.unit === other.unit;
  }
  function compareTimestamp(type, other) {
    return type === other || compareConstructor(type, other) && type.unit === other.unit && type.timezone === other.timezone;
  }
  function compareTime(type, other) {
    return type === other || compareConstructor(type, other) && type.unit === other.unit && type.bitWidth === other.bitWidth;
  }
  function compareList(type, other) {
    return type === other || compareConstructor(type, other) && type.children.length === other.children.length && instance7.compareManyFields(type.children, other.children);
  }
  function compareStruct(type, other) {
    return type === other || compareConstructor(type, other) && type.children.length === other.children.length && instance7.compareManyFields(type.children, other.children);
  }
  function compareUnion(type, other) {
    return type === other || compareConstructor(type, other) && type.mode === other.mode && type.typeIds.every((x, i) => x === other.typeIds[i]) && instance7.compareManyFields(type.children, other.children);
  }
  function compareDictionary(type, other) {
    return type === other || compareConstructor(type, other) && type.id === other.id && type.isOrdered === other.isOrdered && instance7.visit(type.indices, other.indices) && instance7.visit(type.dictionary, other.dictionary);
  }
  function compareInterval(type, other) {
    return type === other || compareConstructor(type, other) && type.unit === other.unit;
  }
  function compareFixedSizeList(type, other) {
    return type === other || compareConstructor(type, other) && type.listSize === other.listSize && type.children.length === other.children.length && instance7.compareManyFields(type.children, other.children);
  }
  function compareMap(type, other) {
    return type === other || compareConstructor(type, other) && type.keysSorted === other.keysSorted && type.children.length === other.children.length && instance7.compareManyFields(type.children, other.children);
  }
  TypeComparator.prototype.visitNull = compareAny;
  TypeComparator.prototype.visitBool = compareAny;
  TypeComparator.prototype.visitInt = compareInt;
  TypeComparator.prototype.visitInt8 = compareInt;
  TypeComparator.prototype.visitInt16 = compareInt;
  TypeComparator.prototype.visitInt32 = compareInt;
  TypeComparator.prototype.visitInt64 = compareInt;
  TypeComparator.prototype.visitUint8 = compareInt;
  TypeComparator.prototype.visitUint16 = compareInt;
  TypeComparator.prototype.visitUint32 = compareInt;
  TypeComparator.prototype.visitUint64 = compareInt;
  TypeComparator.prototype.visitFloat = compareFloat;
  TypeComparator.prototype.visitFloat16 = compareFloat;
  TypeComparator.prototype.visitFloat32 = compareFloat;
  TypeComparator.prototype.visitFloat64 = compareFloat;
  TypeComparator.prototype.visitUtf8 = compareAny;
  TypeComparator.prototype.visitBinary = compareAny;
  TypeComparator.prototype.visitFixedSizeBinary = compareFixedSizeBinary;
  TypeComparator.prototype.visitDate = compareDate;
  TypeComparator.prototype.visitDateDay = compareDate;
  TypeComparator.prototype.visitDateMillisecond = compareDate;
  TypeComparator.prototype.visitTimestamp = compareTimestamp;
  TypeComparator.prototype.visitTimestampSecond = compareTimestamp;
  TypeComparator.prototype.visitTimestampMillisecond = compareTimestamp;
  TypeComparator.prototype.visitTimestampMicrosecond = compareTimestamp;
  TypeComparator.prototype.visitTimestampNanosecond = compareTimestamp;
  TypeComparator.prototype.visitTime = compareTime;
  TypeComparator.prototype.visitTimeSecond = compareTime;
  TypeComparator.prototype.visitTimeMillisecond = compareTime;
  TypeComparator.prototype.visitTimeMicrosecond = compareTime;
  TypeComparator.prototype.visitTimeNanosecond = compareTime;
  TypeComparator.prototype.visitDecimal = compareAny;
  TypeComparator.prototype.visitList = compareList;
  TypeComparator.prototype.visitStruct = compareStruct;
  TypeComparator.prototype.visitUnion = compareUnion;
  TypeComparator.prototype.visitDenseUnion = compareUnion;
  TypeComparator.prototype.visitSparseUnion = compareUnion;
  TypeComparator.prototype.visitDictionary = compareDictionary;
  TypeComparator.prototype.visitInterval = compareInterval;
  TypeComparator.prototype.visitIntervalDayTime = compareInterval;
  TypeComparator.prototype.visitIntervalYearMonth = compareInterval;
  TypeComparator.prototype.visitFixedSizeList = compareFixedSizeList;
  TypeComparator.prototype.visitMap = compareMap;
  var instance7 = new TypeComparator();
  function compareSchemas(schema, other) {
    return instance7.compareSchemas(schema, other);
  }
  function compareFields(field, other) {
    return instance7.compareFields(field, other);
  }
  function compareTypes(type, other) {
    return instance7.visit(type, other);
  }

  // ../../node_modules/apache-arrow/factories.mjs
  function makeBuilder(options) {
    const type = options.type;
    const builder = new (instance6.getVisitFn(type)())(options);
    if (type.children && type.children.length > 0) {
      const children = options["children"] || [];
      const defaultOptions = { "nullValues": options["nullValues"] };
      const getChildOptions = Array.isArray(children) ? (_, i) => children[i] || defaultOptions : ({ name }) => children[name] || defaultOptions;
      for (const [index, field] of type.children.entries()) {
        const { type: type2 } = field;
        const opts = getChildOptions(field, index);
        builder.children.push(makeBuilder(Object.assign(Object.assign({}, opts), { type: type2 })));
      }
    }
    return builder;
  }
  function vectorFromArray(init, type) {
    if (init instanceof Data || init instanceof Vector || init.type instanceof DataType || ArrayBuffer.isView(init)) {
      return makeVector(init);
    }
    const options = { type: type !== null && type !== void 0 ? type : inferType(init), nullValues: [null] };
    const chunks = [...builderThroughIterable(options)(init)];
    const vector = chunks.length === 1 ? chunks[0] : chunks.reduce((a, b) => a.concat(b));
    if (DataType.isDictionary(vector.type)) {
      return vector.memoize();
    }
    return vector;
  }
  function inferType(value) {
    if (value.length === 0) {
      return new Null();
    }
    let nullsCount = 0;
    let arraysCount = 0;
    let objectsCount = 0;
    let numbersCount = 0;
    let stringsCount = 0;
    let bigintsCount = 0;
    let booleansCount = 0;
    let datesCount = 0;
    for (const val of value) {
      if (val == null) {
        ++nullsCount;
        continue;
      }
      switch (typeof val) {
        case "bigint":
          ++bigintsCount;
          continue;
        case "boolean":
          ++booleansCount;
          continue;
        case "number":
          ++numbersCount;
          continue;
        case "string":
          ++stringsCount;
          continue;
        case "object":
          if (Array.isArray(val)) {
            ++arraysCount;
          } else if (Object.prototype.toString.call(val) === "[object Date]") {
            ++datesCount;
          } else {
            ++objectsCount;
          }
          continue;
      }
      throw new TypeError("Unable to infer Vector type from input values, explicit type declaration expected.");
    }
    if (numbersCount + nullsCount === value.length) {
      return new Float64();
    } else if (stringsCount + nullsCount === value.length) {
      return new Dictionary(new Utf8(), new Int32());
    } else if (bigintsCount + nullsCount === value.length) {
      return new Int64();
    } else if (booleansCount + nullsCount === value.length) {
      return new Bool();
    } else if (datesCount + nullsCount === value.length) {
      return new DateMillisecond();
    } else if (arraysCount + nullsCount === value.length) {
      const array = value;
      const childType = inferType(array[array.findIndex((ary) => ary != null)]);
      if (array.every((ary) => ary == null || compareTypes(childType, inferType(ary)))) {
        return new List(new Field2("", childType, true));
      }
    } else if (objectsCount + nullsCount === value.length) {
      const fields = /* @__PURE__ */ new Map();
      for (const row of value) {
        for (const key of Object.keys(row)) {
          if (!fields.has(key) && row[key] != null) {
            fields.set(key, new Field2(key, inferType([row[key]]), true));
          }
        }
      }
      return new Struct([...fields.values()]);
    }
    throw new TypeError("Unable to infer Vector type from input values, explicit type declaration expected.");
  }
  function builderThroughIterable(options) {
    const { ["queueingStrategy"]: queueingStrategy = "count" } = options;
    const { ["highWaterMark"]: highWaterMark = queueingStrategy !== "bytes" ? Number.POSITIVE_INFINITY : Math.pow(2, 14) } = options;
    const sizeProperty = queueingStrategy !== "bytes" ? "length" : "byteLength";
    return function* (source) {
      let numChunks = 0;
      const builder = makeBuilder(options);
      for (const value of source) {
        if (builder.append(value)[sizeProperty] >= highWaterMark) {
          ++numChunks && (yield builder.toVector());
        }
      }
      if (builder.finish().length > 0 || numChunks === 0) {
        yield builder.toVector();
      }
    };
  }

  // ../../node_modules/apache-arrow/util/recordbatch.mjs
  function distributeVectorsIntoRecordBatches(schema, vecs) {
    return uniformlyDistributeChunksAcrossRecordBatches(schema, vecs.map((v) => v.data.concat()));
  }
  function uniformlyDistributeChunksAcrossRecordBatches(schema, cols) {
    const fields = [...schema.fields];
    const batches = [];
    const memo = { numBatches: cols.reduce((n, c) => Math.max(n, c.length), 0) };
    let numBatches = 0, batchLength = 0;
    let i = -1;
    const numColumns = cols.length;
    let child, children = [];
    while (memo.numBatches-- > 0) {
      for (batchLength = Number.POSITIVE_INFINITY, i = -1; ++i < numColumns; ) {
        children[i] = child = cols[i].shift();
        batchLength = Math.min(batchLength, child ? child.length : batchLength);
      }
      if (Number.isFinite(batchLength)) {
        children = distributeChildren(fields, batchLength, children, cols, memo);
        if (batchLength > 0) {
          batches[numBatches++] = makeData({
            type: new Struct(fields),
            length: batchLength,
            nullCount: 0,
            children: children.slice()
          });
        }
      }
    }
    return [
      schema = schema.assign(fields),
      batches.map((data) => new RecordBatch(schema, data))
    ];
  }
  function distributeChildren(fields, batchLength, children, columns, memo) {
    var _a5;
    const nullBitmapSize = (batchLength + 63 & ~63) >> 3;
    for (let i = -1, n = columns.length; ++i < n; ) {
      const child = children[i];
      const length = child === null || child === void 0 ? void 0 : child.length;
      if (length >= batchLength) {
        if (length === batchLength) {
          children[i] = child;
        } else {
          children[i] = child.slice(0, batchLength);
          memo.numBatches = Math.max(memo.numBatches, columns[i].unshift(child.slice(batchLength, length - batchLength)));
        }
      } else {
        const field = fields[i];
        fields[i] = field.clone({ nullable: true });
        children[i] = (_a5 = child === null || child === void 0 ? void 0 : child._changeLengthAndBackfillNullBitmap(batchLength)) !== null && _a5 !== void 0 ? _a5 : makeData({
          type: field.type,
          length: batchLength,
          nullCount: batchLength,
          nullBitmap: new Uint8Array(nullBitmapSize)
        });
      }
    }
    return children;
  }

  // ../../node_modules/apache-arrow/table.mjs
  var _a3;
  var Table = class _Table {
    constructor(...args) {
      var _b2, _c2;
      if (args.length === 0) {
        this.batches = [];
        this.schema = new Schema2([]);
        this._offsets = [0];
        return this;
      }
      let schema;
      let offsets;
      if (args[0] instanceof Schema2) {
        schema = args.shift();
      }
      if (args.at(-1) instanceof Uint32Array) {
        offsets = args.pop();
      }
      const unwrap = (x) => {
        if (x) {
          if (x instanceof RecordBatch) {
            return [x];
          } else if (x instanceof _Table) {
            return x.batches;
          } else if (x instanceof Data) {
            if (x.type instanceof Struct) {
              return [new RecordBatch(new Schema2(x.type.children), x)];
            }
          } else if (Array.isArray(x)) {
            return x.flatMap((v) => unwrap(v));
          } else if (typeof x[Symbol.iterator] === "function") {
            return [...x].flatMap((v) => unwrap(v));
          } else if (typeof x === "object") {
            const keys = Object.keys(x);
            const vecs = keys.map((k) => new Vector([x[k]]));
            const schema2 = new Schema2(keys.map((k, i) => new Field2(String(k), vecs[i].type)));
            const [, batches2] = distributeVectorsIntoRecordBatches(schema2, vecs);
            return batches2.length === 0 ? [new RecordBatch(x)] : batches2;
          }
        }
        return [];
      };
      const batches = args.flatMap((v) => unwrap(v));
      schema = (_c2 = schema !== null && schema !== void 0 ? schema : (_b2 = batches[0]) === null || _b2 === void 0 ? void 0 : _b2.schema) !== null && _c2 !== void 0 ? _c2 : new Schema2([]);
      if (!(schema instanceof Schema2)) {
        throw new TypeError("Table constructor expects a [Schema, RecordBatch[]] pair.");
      }
      for (const batch of batches) {
        if (!(batch instanceof RecordBatch)) {
          throw new TypeError("Table constructor expects a [Schema, RecordBatch[]] pair.");
        }
        if (!compareSchemas(schema, batch.schema)) {
          throw new TypeError("Table and inner RecordBatch schemas must be equivalent.");
        }
      }
      this.schema = schema;
      this.batches = batches;
      this._offsets = offsets !== null && offsets !== void 0 ? offsets : computeChunkOffsets(this.data);
    }
    /**
     * The contiguous {@link RecordBatch `RecordBatch`} chunks of the Table rows.
     */
    get data() {
      return this.batches.map(({ data }) => data);
    }
    /**
     * The number of columns in this Table.
     */
    get numCols() {
      return this.schema.fields.length;
    }
    /**
     * The number of rows in this Table.
     */
    get numRows() {
      return this.data.reduce((numRows, data) => numRows + data.length, 0);
    }
    /**
     * The number of null rows in this Table.
     */
    get nullCount() {
      if (this._nullCount === -1) {
        this._nullCount = computeChunkNullCounts(this.data);
      }
      return this._nullCount;
    }
    /**
     * Check whether an element is null.
     *
     * @param index The index at which to read the validity bitmap.
     */
    // @ts-ignore
    isValid(index) {
      return false;
    }
    /**
     * Get an element value by position.
     *
     * @param index The index of the element to read.
     */
    // @ts-ignore
    get(index) {
      return null;
    }
    /**
     * Set an element value by position.
     *
     * @param index The index of the element to write.
     * @param value The value to set.
     */
    // @ts-ignore
    set(index, value) {
      return;
    }
    /**
     * Retrieve the index of the first occurrence of a value in an Vector.
     *
     * @param element The value to locate in the Vector.
     * @param offset The index at which to begin the search. If offset is omitted, the search starts at index 0.
     */
    // @ts-ignore
    indexOf(element, offset) {
      return -1;
    }
    /**
     * Get the size in bytes of an element by index.
     * @param index The index at which to get the byteLength.
     */
    // @ts-ignore
    getByteLength(index) {
      return 0;
    }
    /**
     * Iterator for rows in this Table.
     */
    [Symbol.iterator]() {
      if (this.batches.length > 0) {
        return instance4.visit(new Vector(this.data));
      }
      return new Array(0)[Symbol.iterator]();
    }
    /**
     * Return a JavaScript Array of the Table rows.
     *
     * @returns An Array of Table rows.
     */
    toArray() {
      return [...this];
    }
    /**
     * Returns a string representation of the Table rows.
     *
     * @returns A string representation of the Table rows.
     */
    toString() {
      return `[
  ${this.toArray().join(",\n  ")}
]`;
    }
    /**
     * Combines two or more Tables of the same schema.
     *
     * @param others Additional Tables to add to the end of this Tables.
     */
    concat(...others) {
      const schema = this.schema;
      const data = this.data.concat(others.flatMap(({ data: data2 }) => data2));
      return new _Table(schema, data.map((data2) => new RecordBatch(schema, data2)));
    }
    /**
     * Return a zero-copy sub-section of this Table.
     *
     * @param begin The beginning of the specified portion of the Table.
     * @param end The end of the specified portion of the Table. This is exclusive of the element at the index 'end'.
     */
    slice(begin, end) {
      const schema = this.schema;
      [begin, end] = clampRange({ length: this.numRows }, begin, end);
      const data = sliceChunks(this.data, this._offsets, begin, end);
      return new _Table(schema, data.map((chunk) => new RecordBatch(schema, chunk)));
    }
    /**
     * Returns a child Vector by name, or null if this Vector has no child with the given name.
     *
     * @param name The name of the child to retrieve.
     */
    getChild(name) {
      return this.getChildAt(this.schema.fields.findIndex((f) => f.name === name));
    }
    /**
     * Returns a child Vector by index, or null if this Vector has no child at the supplied index.
     *
     * @param index The index of the child to retrieve.
     */
    getChildAt(index) {
      if (index > -1 && index < this.schema.fields.length) {
        const data = this.data.map((data2) => data2.children[index]);
        if (data.length === 0) {
          const { type } = this.schema.fields[index];
          const empty = makeData({ type, length: 0, nullCount: 0 });
          data.push(empty._changeLengthAndBackfillNullBitmap(this.numRows));
        }
        return new Vector(data);
      }
      return null;
    }
    /**
     * Sets a child Vector by name.
     *
     * @param name The name of the child to overwrite.
     * @returns A new Table with the supplied child for the specified name.
     */
    setChild(name, child) {
      var _b2;
      return this.setChildAt((_b2 = this.schema.fields) === null || _b2 === void 0 ? void 0 : _b2.findIndex((f) => f.name === name), child);
    }
    setChildAt(index, child) {
      let schema = this.schema;
      let batches = [...this.batches];
      if (index > -1 && index < this.numCols) {
        if (!child) {
          child = new Vector([makeData({ type: new Null(), length: this.numRows })]);
        }
        const fields = schema.fields.slice();
        const field = fields[index].clone({ type: child.type });
        const children = this.schema.fields.map((_, i) => this.getChildAt(i));
        [fields[index], children[index]] = [field, child];
        [schema, batches] = distributeVectorsIntoRecordBatches(schema, children);
      }
      return new _Table(schema, batches);
    }
    /**
     * Construct a new Table containing only specified columns.
     *
     * @param columnNames Names of columns to keep.
     * @returns A new Table of columns matching the specified names.
     */
    select(columnNames) {
      const nameToIndex = this.schema.fields.reduce((m, f, i) => m.set(f.name, i), /* @__PURE__ */ new Map());
      return this.selectAt(columnNames.map((columnName) => nameToIndex.get(columnName)).filter((x) => x > -1));
    }
    /**
     * Construct a new Table containing only columns at the specified indices.
     *
     * @param columnIndices Indices of columns to keep.
     * @returns A new Table of columns at the specified indices.
     */
    selectAt(columnIndices) {
      const schema = this.schema.selectAt(columnIndices);
      const data = this.batches.map((batch) => batch.selectAt(columnIndices));
      return new _Table(schema, data);
    }
    assign(other) {
      const fields = this.schema.fields;
      const [indices, oldToNew] = other.schema.fields.reduce((memo, f2, newIdx) => {
        const [indices2, oldToNew2] = memo;
        const i = fields.findIndex((f) => f.name === f2.name);
        ~i ? oldToNew2[i] = newIdx : indices2.push(newIdx);
        return memo;
      }, [[], []]);
      const schema = this.schema.assign(other.schema);
      const columns = [
        ...fields.map((_, i) => [i, oldToNew[i]]).map(([i, j]) => j === void 0 ? this.getChildAt(i) : other.getChildAt(j)),
        ...indices.map((i) => other.getChildAt(i))
      ].filter(Boolean);
      return new _Table(...distributeVectorsIntoRecordBatches(schema, columns));
    }
  };
  _a3 = Symbol.toStringTag;
  Table[_a3] = ((proto) => {
    proto.schema = null;
    proto.batches = [];
    proto._offsets = new Uint32Array([0]);
    proto._nullCount = -1;
    proto[Symbol.isConcatSpreadable] = true;
    proto["isValid"] = wrapChunkedCall1(isChunkedValid);
    proto["get"] = wrapChunkedCall1(instance2.getVisitFn(Type.Struct));
    proto["set"] = wrapChunkedCall2(instance.getVisitFn(Type.Struct));
    proto["indexOf"] = wrapChunkedIndexOf(instance3.getVisitFn(Type.Struct));
    proto["getByteLength"] = wrapChunkedCall1(instance5.getVisitFn(Type.Struct));
    return "Table";
  })(Table.prototype);

  // ../../node_modules/apache-arrow/recordbatch.mjs
  var _a4;
  var RecordBatch = class _RecordBatch {
    constructor(...args) {
      switch (args.length) {
        case 2: {
          [this.schema] = args;
          if (!(this.schema instanceof Schema2)) {
            throw new TypeError("RecordBatch constructor expects a [Schema, Data] pair.");
          }
          [
            ,
            this.data = makeData({
              nullCount: 0,
              type: new Struct(this.schema.fields),
              children: this.schema.fields.map((f) => makeData({ type: f.type, nullCount: 0 }))
            })
          ] = args;
          if (!(this.data instanceof Data)) {
            throw new TypeError("RecordBatch constructor expects a [Schema, Data] pair.");
          }
          [this.schema, this.data] = ensureSameLengthData(this.schema, this.data.children);
          break;
        }
        case 1: {
          const [obj] = args;
          const { fields, children, length } = Object.keys(obj).reduce((memo, name, i) => {
            memo.children[i] = obj[name];
            memo.length = Math.max(memo.length, obj[name].length);
            memo.fields[i] = Field2.new({ name, type: obj[name].type, nullable: true });
            return memo;
          }, {
            length: 0,
            fields: new Array(),
            children: new Array()
          });
          const schema = new Schema2(fields);
          const data = makeData({ type: new Struct(fields), length, children, nullCount: 0 });
          [this.schema, this.data] = ensureSameLengthData(schema, data.children, length);
          break;
        }
        default:
          throw new TypeError("RecordBatch constructor expects an Object mapping names to child Data, or a [Schema, Data] pair.");
      }
    }
    get dictionaries() {
      return this._dictionaries || (this._dictionaries = collectDictionaries(this.schema.fields, this.data.children));
    }
    /**
     * The number of columns in this RecordBatch.
     */
    get numCols() {
      return this.schema.fields.length;
    }
    /**
     * The number of rows in this RecordBatch.
     */
    get numRows() {
      return this.data.length;
    }
    /**
     * The number of null rows in this RecordBatch.
     */
    get nullCount() {
      return this.data.nullCount;
    }
    /**
     * Check whether an element is null.
     * @param index The index at which to read the validity bitmap.
     */
    isValid(index) {
      return this.data.getValid(index);
    }
    /**
     * Get a row by position.
     * @param index The index of the element to read.
     */
    get(index) {
      return instance2.visit(this.data, index);
    }
    /**
     * Set a row by position.
     * @param index The index of the element to write.
     * @param value The value to set.
     */
    set(index, value) {
      return instance.visit(this.data, index, value);
    }
    /**
     * Retrieve the index of the first occurrence of a row in an RecordBatch.
     * @param element The row to locate in the RecordBatch.
     * @param offset The index at which to begin the search. If offset is omitted, the search starts at index 0.
     */
    indexOf(element, offset) {
      return instance3.visit(this.data, element, offset);
    }
    /**
     * Get the size (in bytes) of a row by index.
     * @param index The row index for which to compute the byteLength.
     */
    getByteLength(index) {
      return instance5.visit(this.data, index);
    }
    /**
     * Iterator for rows in this RecordBatch.
     */
    [Symbol.iterator]() {
      return instance4.visit(new Vector([this.data]));
    }
    /**
     * Return a JavaScript Array of the RecordBatch rows.
     * @returns An Array of RecordBatch rows.
     */
    toArray() {
      return [...this];
    }
    /**
     * Combines two or more RecordBatch of the same schema.
     * @param others Additional RecordBatch to add to the end of this RecordBatch.
     */
    concat(...others) {
      return new Table(this.schema, [this, ...others]);
    }
    /**
     * Return a zero-copy sub-section of this RecordBatch.
     * @param start The beginning of the specified portion of the RecordBatch.
     * @param end The end of the specified portion of the RecordBatch. This is exclusive of the element at the index 'end'.
     */
    slice(begin, end) {
      const [slice] = new Vector([this.data]).slice(begin, end).data;
      return new _RecordBatch(this.schema, slice);
    }
    /**
     * Returns a child Vector by name, or null if this Vector has no child with the given name.
     * @param name The name of the child to retrieve.
     */
    getChild(name) {
      var _b2;
      return this.getChildAt((_b2 = this.schema.fields) === null || _b2 === void 0 ? void 0 : _b2.findIndex((f) => f.name === name));
    }
    /**
     * Returns a child Vector by index, or null if this Vector has no child at the supplied index.
     * @param index The index of the child to retrieve.
     */
    getChildAt(index) {
      if (index > -1 && index < this.schema.fields.length) {
        return new Vector([this.data.children[index]]);
      }
      return null;
    }
    /**
     * Sets a child Vector by name.
     * @param name The name of the child to overwrite.
     * @returns A new RecordBatch with the new child for the specified name.
     */
    setChild(name, child) {
      var _b2;
      return this.setChildAt((_b2 = this.schema.fields) === null || _b2 === void 0 ? void 0 : _b2.findIndex((f) => f.name === name), child);
    }
    setChildAt(index, child) {
      let schema = this.schema;
      let data = this.data;
      if (index > -1 && index < this.numCols) {
        if (!child) {
          child = new Vector([makeData({ type: new Null(), length: this.numRows })]);
        }
        const fields = schema.fields.slice();
        const children = data.children.slice();
        const field = fields[index].clone({ type: child.type });
        [fields[index], children[index]] = [field, child.data[0]];
        schema = new Schema2(fields, new Map(this.schema.metadata));
        data = makeData({ type: new Struct(fields), children });
      }
      return new _RecordBatch(schema, data);
    }
    /**
     * Construct a new RecordBatch containing only specified columns.
     *
     * @param columnNames Names of columns to keep.
     * @returns A new RecordBatch of columns matching the specified names.
     */
    select(columnNames) {
      const schema = this.schema.select(columnNames);
      const type = new Struct(schema.fields);
      const children = [];
      for (const name of columnNames) {
        const index = this.schema.fields.findIndex((f) => f.name === name);
        if (~index) {
          children[index] = this.data.children[index];
        }
      }
      return new _RecordBatch(schema, makeData({ type, length: this.numRows, children }));
    }
    /**
     * Construct a new RecordBatch containing only columns at the specified indices.
     *
     * @param columnIndices Indices of columns to keep.
     * @returns A new RecordBatch of columns matching at the specified indices.
     */
    selectAt(columnIndices) {
      const schema = this.schema.selectAt(columnIndices);
      const children = columnIndices.map((i) => this.data.children[i]).filter(Boolean);
      const subset = makeData({ type: new Struct(schema.fields), length: this.numRows, children });
      return new _RecordBatch(schema, subset);
    }
  };
  _a4 = Symbol.toStringTag;
  RecordBatch[_a4] = ((proto) => {
    proto._nullCount = -1;
    proto[Symbol.isConcatSpreadable] = true;
    return "RecordBatch";
  })(RecordBatch.prototype);
  function ensureSameLengthData(schema, chunks, maxLength = chunks.reduce((max, col) => Math.max(max, col.length), 0)) {
    var _b2;
    const fields = [...schema.fields];
    const children = [...chunks];
    const nullBitmapSize = (maxLength + 63 & ~63) >> 3;
    for (const [idx, field] of schema.fields.entries()) {
      const chunk = chunks[idx];
      if (!chunk || chunk.length !== maxLength) {
        fields[idx] = field.clone({ nullable: true });
        children[idx] = (_b2 = chunk === null || chunk === void 0 ? void 0 : chunk._changeLengthAndBackfillNullBitmap(maxLength)) !== null && _b2 !== void 0 ? _b2 : makeData({
          type: field.type,
          length: maxLength,
          nullCount: maxLength,
          nullBitmap: new Uint8Array(nullBitmapSize)
        });
      }
    }
    return [
      schema.assign(fields),
      makeData({ type: new Struct(fields), length: maxLength, children })
    ];
  }
  function collectDictionaries(fields, children, dictionaries = /* @__PURE__ */ new Map()) {
    for (let i = -1, n = fields.length; ++i < n; ) {
      const field = fields[i];
      const type = field.type;
      const data = children[i];
      if (DataType.isDictionary(type)) {
        if (!dictionaries.has(type.id)) {
          if (data.dictionary) {
            dictionaries.set(type.id, data.dictionary);
          }
        } else if (dictionaries.get(type.id) !== data.dictionary) {
          throw new Error(`Cannot create Schema containing two different dictionaries with the same Id`);
        }
      }
      if (type.children && type.children.length > 0) {
        collectDictionaries(type.children, data.children, dictionaries);
      }
    }
    return dictionaries;
  }
  var _InternalEmptyPlaceholderRecordBatch = class extends RecordBatch {
    constructor(schema) {
      const children = schema.fields.map((f) => makeData({ type: f.type }));
      const data = makeData({ type: new Struct(schema.fields), nullCount: 0, children });
      super(schema, data);
    }
  };

  // ../../node_modules/apache-arrow/fb/body-compression-method.mjs
  var BodyCompressionMethod;
  (function(BodyCompressionMethod2) {
    BodyCompressionMethod2[BodyCompressionMethod2["BUFFER"] = 0] = "BUFFER";
  })(BodyCompressionMethod || (BodyCompressionMethod = {}));

  // ../../node_modules/apache-arrow/fb/compression-type.mjs
  var CompressionType;
  (function(CompressionType2) {
    CompressionType2[CompressionType2["LZ4_FRAME"] = 0] = "LZ4_FRAME";
    CompressionType2[CompressionType2["ZSTD"] = 1] = "ZSTD";
  })(CompressionType || (CompressionType = {}));

  // ../../node_modules/apache-arrow/fb/body-compression.mjs
  var BodyCompression = class _BodyCompression {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsBodyCompression(bb, obj) {
      return (obj || new _BodyCompression()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsBodyCompression(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _BodyCompression()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    /**
     * Compressor library.
     * For LZ4_FRAME, each compressed buffer must consist of a single frame.
     */
    codec() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt8(this.bb_pos + offset) : CompressionType.LZ4_FRAME;
    }
    /**
     * Indicates the way the record batch body was compressed
     */
    method() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readInt8(this.bb_pos + offset) : BodyCompressionMethod.BUFFER;
    }
    static startBodyCompression(builder) {
      builder.startObject(2);
    }
    static addCodec(builder, codec) {
      builder.addFieldInt8(0, codec, CompressionType.LZ4_FRAME);
    }
    static addMethod(builder, method2) {
      builder.addFieldInt8(1, method2, BodyCompressionMethod.BUFFER);
    }
    static endBodyCompression(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static createBodyCompression(builder, codec, method2) {
      _BodyCompression.startBodyCompression(builder);
      _BodyCompression.addCodec(builder, codec);
      _BodyCompression.addMethod(builder, method2);
      return _BodyCompression.endBodyCompression(builder);
    }
  };

  // ../../node_modules/apache-arrow/fb/buffer.mjs
  var Buffer2 = class {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    /**
     * The relative offset into the shared memory page where the bytes for this
     * buffer starts
     */
    offset() {
      return this.bb.readInt64(this.bb_pos);
    }
    /**
     * The absolute length (in bytes) of the memory buffer. The memory is found
     * from offset (inclusive) to offset + length (non-inclusive). When building
     * messages using the encapsulated IPC message, padding bytes may be written
     * after a buffer, but such padding bytes do not need to be accounted for in
     * the size here.
     */
    length() {
      return this.bb.readInt64(this.bb_pos + 8);
    }
    static sizeOf() {
      return 16;
    }
    static createBuffer(builder, offset, length) {
      builder.prep(8, 16);
      builder.writeInt64(BigInt(length !== null && length !== void 0 ? length : 0));
      builder.writeInt64(BigInt(offset !== null && offset !== void 0 ? offset : 0));
      return builder.offset();
    }
  };

  // ../../node_modules/apache-arrow/fb/field-node.mjs
  var FieldNode = class {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    /**
     * The number of value slots in the Arrow array at this level of a nested
     * tree
     */
    length() {
      return this.bb.readInt64(this.bb_pos);
    }
    /**
     * The number of observed nulls. Fields with null_count == 0 may choose not
     * to write their physical validity bitmap out as a materialized buffer,
     * instead setting the length of the bitmap buffer to 0.
     */
    nullCount() {
      return this.bb.readInt64(this.bb_pos + 8);
    }
    static sizeOf() {
      return 16;
    }
    static createFieldNode(builder, length, null_count) {
      builder.prep(8, 16);
      builder.writeInt64(BigInt(null_count !== null && null_count !== void 0 ? null_count : 0));
      builder.writeInt64(BigInt(length !== null && length !== void 0 ? length : 0));
      return builder.offset();
    }
  };

  // ../../node_modules/apache-arrow/fb/record-batch.mjs
  var RecordBatch2 = class _RecordBatch {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsRecordBatch(bb, obj) {
      return (obj || new _RecordBatch()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsRecordBatch(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _RecordBatch()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    /**
     * number of records / rows. The arrays in the batch should all have this
     * length
     */
    length() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
    }
    /**
     * Nodes correspond to the pre-ordered flattened logical schema
     */
    nodes(index, obj) {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? (obj || new FieldNode()).__init(this.bb.__vector(this.bb_pos + offset) + index * 16, this.bb) : null;
    }
    nodesLength() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    /**
     * Buffers correspond to the pre-ordered flattened buffer tree
     *
     * The number of buffers appended to this list depends on the schema. For
     * example, most primitive arrays will have 2 buffers, 1 for the validity
     * bitmap and 1 for the values. For struct arrays, there will only be a
     * single buffer for the validity (nulls) bitmap
     */
    buffers(index, obj) {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? (obj || new Buffer2()).__init(this.bb.__vector(this.bb_pos + offset) + index * 16, this.bb) : null;
    }
    buffersLength() {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    /**
     * Optional compression of the message body
     */
    compression(obj) {
      const offset = this.bb.__offset(this.bb_pos, 10);
      return offset ? (obj || new BodyCompression()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }
    static startRecordBatch(builder) {
      builder.startObject(4);
    }
    static addLength(builder, length) {
      builder.addFieldInt64(0, length, BigInt("0"));
    }
    static addNodes(builder, nodesOffset) {
      builder.addFieldOffset(1, nodesOffset, 0);
    }
    static startNodesVector(builder, numElems) {
      builder.startVector(16, numElems, 8);
    }
    static addBuffers(builder, buffersOffset) {
      builder.addFieldOffset(2, buffersOffset, 0);
    }
    static startBuffersVector(builder, numElems) {
      builder.startVector(16, numElems, 8);
    }
    static addCompression(builder, compressionOffset) {
      builder.addFieldOffset(3, compressionOffset, 0);
    }
    static endRecordBatch(builder) {
      const offset = builder.endObject();
      return offset;
    }
  };

  // ../../node_modules/apache-arrow/fb/dictionary-batch.mjs
  var DictionaryBatch = class _DictionaryBatch {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsDictionaryBatch(bb, obj) {
      return (obj || new _DictionaryBatch()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsDictionaryBatch(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _DictionaryBatch()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    id() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
    }
    data(obj) {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? (obj || new RecordBatch2()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }
    /**
     * If isDelta is true the values in the dictionary are to be appended to a
     * dictionary with the indicated id. If isDelta is false this dictionary
     * should replace the existing dictionary.
     */
    isDelta() {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
    }
    static startDictionaryBatch(builder) {
      builder.startObject(3);
    }
    static addId(builder, id) {
      builder.addFieldInt64(0, id, BigInt("0"));
    }
    static addData(builder, dataOffset) {
      builder.addFieldOffset(1, dataOffset, 0);
    }
    static addIsDelta(builder, isDelta) {
      builder.addFieldInt8(2, +isDelta, 0);
    }
    static endDictionaryBatch(builder) {
      const offset = builder.endObject();
      return offset;
    }
  };

  // ../../node_modules/apache-arrow/fb/message-header.mjs
  var MessageHeader2;
  (function(MessageHeader3) {
    MessageHeader3[MessageHeader3["NONE"] = 0] = "NONE";
    MessageHeader3[MessageHeader3["Schema"] = 1] = "Schema";
    MessageHeader3[MessageHeader3["DictionaryBatch"] = 2] = "DictionaryBatch";
    MessageHeader3[MessageHeader3["RecordBatch"] = 3] = "RecordBatch";
    MessageHeader3[MessageHeader3["Tensor"] = 4] = "Tensor";
    MessageHeader3[MessageHeader3["SparseTensor"] = 5] = "SparseTensor";
  })(MessageHeader2 || (MessageHeader2 = {}));

  // ../../node_modules/apache-arrow/fb/message.mjs
  var Message = class _Message {
    constructor() {
      this.bb = null;
      this.bb_pos = 0;
    }
    __init(i, bb) {
      this.bb_pos = i;
      this.bb = bb;
      return this;
    }
    static getRootAsMessage(bb, obj) {
      return (obj || new _Message()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    static getSizePrefixedRootAsMessage(bb, obj) {
      bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
      return (obj || new _Message()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
    }
    version() {
      const offset = this.bb.__offset(this.bb_pos, 4);
      return offset ? this.bb.readInt16(this.bb_pos + offset) : MetadataVersion2.V1;
    }
    headerType() {
      const offset = this.bb.__offset(this.bb_pos, 6);
      return offset ? this.bb.readUint8(this.bb_pos + offset) : MessageHeader2.NONE;
    }
    header(obj) {
      const offset = this.bb.__offset(this.bb_pos, 8);
      return offset ? this.bb.__union(obj, this.bb_pos + offset) : null;
    }
    bodyLength() {
      const offset = this.bb.__offset(this.bb_pos, 10);
      return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
    }
    customMetadata(index, obj) {
      const offset = this.bb.__offset(this.bb_pos, 12);
      return offset ? (obj || new KeyValue()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
    }
    customMetadataLength() {
      const offset = this.bb.__offset(this.bb_pos, 12);
      return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
    }
    static startMessage(builder) {
      builder.startObject(5);
    }
    static addVersion(builder, version) {
      builder.addFieldInt16(0, version, MetadataVersion2.V1);
    }
    static addHeaderType(builder, headerType) {
      builder.addFieldInt8(1, headerType, MessageHeader2.NONE);
    }
    static addHeader(builder, headerOffset) {
      builder.addFieldOffset(2, headerOffset, 0);
    }
    static addBodyLength(builder, bodyLength) {
      builder.addFieldInt64(3, bodyLength, BigInt("0"));
    }
    static addCustomMetadata(builder, customMetadataOffset) {
      builder.addFieldOffset(4, customMetadataOffset, 0);
    }
    static createCustomMetadataVector(builder, data) {
      builder.startVector(4, data.length, 4);
      for (let i = data.length - 1; i >= 0; i--) {
        builder.addOffset(data[i]);
      }
      return builder.endVector();
    }
    static startCustomMetadataVector(builder, numElems) {
      builder.startVector(4, numElems, 4);
    }
    static endMessage(builder) {
      const offset = builder.endObject();
      return offset;
    }
    static finishMessageBuffer(builder, offset) {
      builder.finish(offset);
    }
    static finishSizePrefixedMessageBuffer(builder, offset) {
      builder.finish(offset, void 0, true);
    }
    static createMessage(builder, version, headerType, headerOffset, bodyLength, customMetadataOffset) {
      _Message.startMessage(builder);
      _Message.addVersion(builder, version);
      _Message.addHeaderType(builder, headerType);
      _Message.addHeader(builder, headerOffset);
      _Message.addBodyLength(builder, bodyLength);
      _Message.addCustomMetadata(builder, customMetadataOffset);
      return _Message.endMessage(builder);
    }
  };

  // ../../node_modules/apache-arrow/visitor/typeassembler.mjs
  var TypeAssembler = class extends Visitor {
    visit(node, builder) {
      return node == null || builder == null ? void 0 : super.visit(node, builder);
    }
    visitNull(_node, b) {
      Null2.startNull(b);
      return Null2.endNull(b);
    }
    visitInt(node, b) {
      Int.startInt(b);
      Int.addBitWidth(b, node.bitWidth);
      Int.addIsSigned(b, node.isSigned);
      return Int.endInt(b);
    }
    visitFloat(node, b) {
      FloatingPoint.startFloatingPoint(b);
      FloatingPoint.addPrecision(b, node.precision);
      return FloatingPoint.endFloatingPoint(b);
    }
    visitBinary(_node, b) {
      Binary2.startBinary(b);
      return Binary2.endBinary(b);
    }
    visitBool(_node, b) {
      Bool2.startBool(b);
      return Bool2.endBool(b);
    }
    visitUtf8(_node, b) {
      Utf82.startUtf8(b);
      return Utf82.endUtf8(b);
    }
    visitDecimal(node, b) {
      Decimal2.startDecimal(b);
      Decimal2.addScale(b, node.scale);
      Decimal2.addPrecision(b, node.precision);
      Decimal2.addBitWidth(b, node.bitWidth);
      return Decimal2.endDecimal(b);
    }
    visitDate(node, b) {
      Date2.startDate(b);
      Date2.addUnit(b, node.unit);
      return Date2.endDate(b);
    }
    visitTime(node, b) {
      Time.startTime(b);
      Time.addUnit(b, node.unit);
      Time.addBitWidth(b, node.bitWidth);
      return Time.endTime(b);
    }
    visitTimestamp(node, b) {
      const timezone = node.timezone && b.createString(node.timezone) || void 0;
      Timestamp.startTimestamp(b);
      Timestamp.addUnit(b, node.unit);
      if (timezone !== void 0) {
        Timestamp.addTimezone(b, timezone);
      }
      return Timestamp.endTimestamp(b);
    }
    visitInterval(node, b) {
      Interval.startInterval(b);
      Interval.addUnit(b, node.unit);
      return Interval.endInterval(b);
    }
    visitList(_node, b) {
      List2.startList(b);
      return List2.endList(b);
    }
    visitStruct(_node, b) {
      Struct_.startStruct_(b);
      return Struct_.endStruct_(b);
    }
    visitUnion(node, b) {
      Union.startTypeIdsVector(b, node.typeIds.length);
      const typeIds = Union.createTypeIdsVector(b, node.typeIds);
      Union.startUnion(b);
      Union.addMode(b, node.mode);
      Union.addTypeIds(b, typeIds);
      return Union.endUnion(b);
    }
    visitDictionary(node, b) {
      const indexType = this.visit(node.indices, b);
      DictionaryEncoding.startDictionaryEncoding(b);
      DictionaryEncoding.addId(b, BigInt(node.id));
      DictionaryEncoding.addIsOrdered(b, node.isOrdered);
      if (indexType !== void 0) {
        DictionaryEncoding.addIndexType(b, indexType);
      }
      return DictionaryEncoding.endDictionaryEncoding(b);
    }
    visitFixedSizeBinary(node, b) {
      FixedSizeBinary2.startFixedSizeBinary(b);
      FixedSizeBinary2.addByteWidth(b, node.byteWidth);
      return FixedSizeBinary2.endFixedSizeBinary(b);
    }
    visitFixedSizeList(node, b) {
      FixedSizeList2.startFixedSizeList(b);
      FixedSizeList2.addListSize(b, node.listSize);
      return FixedSizeList2.endFixedSizeList(b);
    }
    visitMap(node, b) {
      Map2.startMap(b);
      Map2.addKeysSorted(b, node.keysSorted);
      return Map2.endMap(b);
    }
  };
  var instance8 = new TypeAssembler();

  // ../../node_modules/apache-arrow/ipc/metadata/json.mjs
  function schemaFromJSON(_schema, dictionaries = /* @__PURE__ */ new Map()) {
    return new Schema2(schemaFieldsFromJSON(_schema, dictionaries), customMetadataFromJSON(_schema["customMetadata"]), dictionaries);
  }
  function recordBatchFromJSON(b) {
    return new RecordBatch3(b["count"], fieldNodesFromJSON(b["columns"]), buffersFromJSON(b["columns"]));
  }
  function dictionaryBatchFromJSON(b) {
    return new DictionaryBatch2(recordBatchFromJSON(b["data"]), b["id"], b["isDelta"]);
  }
  function schemaFieldsFromJSON(_schema, dictionaries) {
    return (_schema["fields"] || []).filter(Boolean).map((f) => Field2.fromJSON(f, dictionaries));
  }
  function fieldChildrenFromJSON(_field, dictionaries) {
    return (_field["children"] || []).filter(Boolean).map((f) => Field2.fromJSON(f, dictionaries));
  }
  function fieldNodesFromJSON(xs) {
    return (xs || []).reduce((fieldNodes, column) => [
      ...fieldNodes,
      new FieldNode2(column["count"], nullCountFromJSON(column["VALIDITY"])),
      ...fieldNodesFromJSON(column["children"])
    ], []);
  }
  function buffersFromJSON(xs, buffers = []) {
    for (let i = -1, n = (xs || []).length; ++i < n; ) {
      const column = xs[i];
      column["VALIDITY"] && buffers.push(new BufferRegion(buffers.length, column["VALIDITY"].length));
      column["TYPE"] && buffers.push(new BufferRegion(buffers.length, column["TYPE"].length));
      column["OFFSET"] && buffers.push(new BufferRegion(buffers.length, column["OFFSET"].length));
      column["DATA"] && buffers.push(new BufferRegion(buffers.length, column["DATA"].length));
      buffers = buffersFromJSON(column["children"], buffers);
    }
    return buffers;
  }
  function nullCountFromJSON(validity) {
    return (validity || []).reduce((sum2, val) => sum2 + +(val === 0), 0);
  }
  function fieldFromJSON(_field, dictionaries) {
    let id;
    let keys;
    let field;
    let dictMeta;
    let type;
    let dictType;
    if (!dictionaries || !(dictMeta = _field["dictionary"])) {
      type = typeFromJSON(_field, fieldChildrenFromJSON(_field, dictionaries));
      field = new Field2(_field["name"], type, _field["nullable"], customMetadataFromJSON(_field["customMetadata"]));
    } else if (!dictionaries.has(id = dictMeta["id"])) {
      keys = (keys = dictMeta["indexType"]) ? indexTypeFromJSON(keys) : new Int32();
      dictionaries.set(id, type = typeFromJSON(_field, fieldChildrenFromJSON(_field, dictionaries)));
      dictType = new Dictionary(type, keys, id, dictMeta["isOrdered"]);
      field = new Field2(_field["name"], dictType, _field["nullable"], customMetadataFromJSON(_field["customMetadata"]));
    } else {
      keys = (keys = dictMeta["indexType"]) ? indexTypeFromJSON(keys) : new Int32();
      dictType = new Dictionary(dictionaries.get(id), keys, id, dictMeta["isOrdered"]);
      field = new Field2(_field["name"], dictType, _field["nullable"], customMetadataFromJSON(_field["customMetadata"]));
    }
    return field || null;
  }
  function customMetadataFromJSON(_metadata) {
    return new Map(Object.entries(_metadata || {}));
  }
  function indexTypeFromJSON(_type) {
    return new Int_(_type["isSigned"], _type["bitWidth"]);
  }
  function typeFromJSON(f, children) {
    const typeId = f["type"]["name"];
    switch (typeId) {
      case "NONE":
        return new Null();
      case "null":
        return new Null();
      case "binary":
        return new Binary();
      case "utf8":
        return new Utf8();
      case "bool":
        return new Bool();
      case "list":
        return new List((children || [])[0]);
      case "struct":
        return new Struct(children || []);
      case "struct_":
        return new Struct(children || []);
    }
    switch (typeId) {
      case "int": {
        const t = f["type"];
        return new Int_(t["isSigned"], t["bitWidth"]);
      }
      case "floatingpoint": {
        const t = f["type"];
        return new Float(Precision[t["precision"]]);
      }
      case "decimal": {
        const t = f["type"];
        return new Decimal(t["scale"], t["precision"], t["bitWidth"]);
      }
      case "date": {
        const t = f["type"];
        return new Date_(DateUnit[t["unit"]]);
      }
      case "time": {
        const t = f["type"];
        return new Time_(TimeUnit[t["unit"]], t["bitWidth"]);
      }
      case "timestamp": {
        const t = f["type"];
        return new Timestamp_(TimeUnit[t["unit"]], t["timezone"]);
      }
      case "interval": {
        const t = f["type"];
        return new Interval_(IntervalUnit[t["unit"]]);
      }
      case "union": {
        const t = f["type"];
        return new Union_(UnionMode[t["mode"]], t["typeIds"] || [], children || []);
      }
      case "fixedsizebinary": {
        const t = f["type"];
        return new FixedSizeBinary(t["byteWidth"]);
      }
      case "fixedsizelist": {
        const t = f["type"];
        return new FixedSizeList(t["listSize"], (children || [])[0]);
      }
      case "map": {
        const t = f["type"];
        return new Map_((children || [])[0], t["keysSorted"]);
      }
    }
    throw new Error(`Unrecognized type: "${typeId}"`);
  }

  // ../../node_modules/apache-arrow/ipc/metadata/message.mjs
  var Builder4 = Builder2;
  var ByteBuffer3 = ByteBuffer;
  var Message2 = class _Message {
    /** @nocollapse */
    static fromJSON(msg, headerType) {
      const message = new _Message(0, MetadataVersion.V4, headerType);
      message._createHeader = messageHeaderFromJSON(msg, headerType);
      return message;
    }
    /** @nocollapse */
    static decode(buf) {
      buf = new ByteBuffer3(toUint8Array(buf));
      const _message = Message.getRootAsMessage(buf);
      const bodyLength = _message.bodyLength();
      const version = _message.version();
      const headerType = _message.headerType();
      const message = new _Message(bodyLength, version, headerType);
      message._createHeader = decodeMessageHeader(_message, headerType);
      return message;
    }
    /** @nocollapse */
    static encode(message) {
      const b = new Builder4();
      let headerOffset = -1;
      if (message.isSchema()) {
        headerOffset = Schema2.encode(b, message.header());
      } else if (message.isRecordBatch()) {
        headerOffset = RecordBatch3.encode(b, message.header());
      } else if (message.isDictionaryBatch()) {
        headerOffset = DictionaryBatch2.encode(b, message.header());
      }
      Message.startMessage(b);
      Message.addVersion(b, MetadataVersion.V4);
      Message.addHeader(b, headerOffset);
      Message.addHeaderType(b, message.headerType);
      Message.addBodyLength(b, BigInt(message.bodyLength));
      Message.finishMessageBuffer(b, Message.endMessage(b));
      return b.asUint8Array();
    }
    /** @nocollapse */
    static from(header, bodyLength = 0) {
      if (header instanceof Schema2) {
        return new _Message(0, MetadataVersion.V4, MessageHeader.Schema, header);
      }
      if (header instanceof RecordBatch3) {
        return new _Message(bodyLength, MetadataVersion.V4, MessageHeader.RecordBatch, header);
      }
      if (header instanceof DictionaryBatch2) {
        return new _Message(bodyLength, MetadataVersion.V4, MessageHeader.DictionaryBatch, header);
      }
      throw new Error(`Unrecognized Message header: ${header}`);
    }
    get type() {
      return this.headerType;
    }
    get version() {
      return this._version;
    }
    get headerType() {
      return this._headerType;
    }
    get bodyLength() {
      return this._bodyLength;
    }
    header() {
      return this._createHeader();
    }
    isSchema() {
      return this.headerType === MessageHeader.Schema;
    }
    isRecordBatch() {
      return this.headerType === MessageHeader.RecordBatch;
    }
    isDictionaryBatch() {
      return this.headerType === MessageHeader.DictionaryBatch;
    }
    constructor(bodyLength, version, headerType, header) {
      this._version = version;
      this._headerType = headerType;
      this.body = new Uint8Array(0);
      header && (this._createHeader = () => header);
      this._bodyLength = bigIntToNumber(bodyLength);
    }
  };
  var RecordBatch3 = class {
    get nodes() {
      return this._nodes;
    }
    get length() {
      return this._length;
    }
    get buffers() {
      return this._buffers;
    }
    constructor(length, nodes, buffers) {
      this._nodes = nodes;
      this._buffers = buffers;
      this._length = bigIntToNumber(length);
    }
  };
  var DictionaryBatch2 = class {
    get id() {
      return this._id;
    }
    get data() {
      return this._data;
    }
    get isDelta() {
      return this._isDelta;
    }
    get length() {
      return this.data.length;
    }
    get nodes() {
      return this.data.nodes;
    }
    get buffers() {
      return this.data.buffers;
    }
    constructor(data, id, isDelta = false) {
      this._data = data;
      this._isDelta = isDelta;
      this._id = bigIntToNumber(id);
    }
  };
  var BufferRegion = class {
    constructor(offset, length) {
      this.offset = bigIntToNumber(offset);
      this.length = bigIntToNumber(length);
    }
  };
  var FieldNode2 = class {
    constructor(length, nullCount) {
      this.length = bigIntToNumber(length);
      this.nullCount = bigIntToNumber(nullCount);
    }
  };
  function messageHeaderFromJSON(message, type) {
    return () => {
      switch (type) {
        case MessageHeader.Schema:
          return Schema2.fromJSON(message);
        case MessageHeader.RecordBatch:
          return RecordBatch3.fromJSON(message);
        case MessageHeader.DictionaryBatch:
          return DictionaryBatch2.fromJSON(message);
      }
      throw new Error(`Unrecognized Message type: { name: ${MessageHeader[type]}, type: ${type} }`);
    };
  }
  function decodeMessageHeader(message, type) {
    return () => {
      switch (type) {
        case MessageHeader.Schema:
          return Schema2.decode(message.header(new Schema()));
        case MessageHeader.RecordBatch:
          return RecordBatch3.decode(message.header(new RecordBatch2()), message.version());
        case MessageHeader.DictionaryBatch:
          return DictionaryBatch2.decode(message.header(new DictionaryBatch()), message.version());
      }
      throw new Error(`Unrecognized Message type: { name: ${MessageHeader[type]}, type: ${type} }`);
    };
  }
  Field2["encode"] = encodeField;
  Field2["decode"] = decodeField;
  Field2["fromJSON"] = fieldFromJSON;
  Schema2["encode"] = encodeSchema;
  Schema2["decode"] = decodeSchema;
  Schema2["fromJSON"] = schemaFromJSON;
  RecordBatch3["encode"] = encodeRecordBatch;
  RecordBatch3["decode"] = decodeRecordBatch;
  RecordBatch3["fromJSON"] = recordBatchFromJSON;
  DictionaryBatch2["encode"] = encodeDictionaryBatch;
  DictionaryBatch2["decode"] = decodeDictionaryBatch;
  DictionaryBatch2["fromJSON"] = dictionaryBatchFromJSON;
  FieldNode2["encode"] = encodeFieldNode;
  FieldNode2["decode"] = decodeFieldNode;
  BufferRegion["encode"] = encodeBufferRegion;
  BufferRegion["decode"] = decodeBufferRegion;
  function decodeSchema(_schema, dictionaries = /* @__PURE__ */ new Map()) {
    const fields = decodeSchemaFields(_schema, dictionaries);
    return new Schema2(fields, decodeCustomMetadata(_schema), dictionaries);
  }
  function decodeRecordBatch(batch, version = MetadataVersion.V4) {
    if (batch.compression() !== null) {
      throw new Error("Record batch compression not implemented");
    }
    return new RecordBatch3(batch.length(), decodeFieldNodes(batch), decodeBuffers(batch, version));
  }
  function decodeDictionaryBatch(batch, version = MetadataVersion.V4) {
    return new DictionaryBatch2(RecordBatch3.decode(batch.data(), version), batch.id(), batch.isDelta());
  }
  function decodeBufferRegion(b) {
    return new BufferRegion(b.offset(), b.length());
  }
  function decodeFieldNode(f) {
    return new FieldNode2(f.length(), f.nullCount());
  }
  function decodeFieldNodes(batch) {
    const nodes = [];
    for (let f, i = -1, j = -1, n = batch.nodesLength(); ++i < n; ) {
      if (f = batch.nodes(i)) {
        nodes[++j] = FieldNode2.decode(f);
      }
    }
    return nodes;
  }
  function decodeBuffers(batch, version) {
    const bufferRegions = [];
    for (let b, i = -1, j = -1, n = batch.buffersLength(); ++i < n; ) {
      if (b = batch.buffers(i)) {
        if (version < MetadataVersion.V4) {
          b.bb_pos += 8 * (i + 1);
        }
        bufferRegions[++j] = BufferRegion.decode(b);
      }
    }
    return bufferRegions;
  }
  function decodeSchemaFields(schema, dictionaries) {
    const fields = [];
    for (let f, i = -1, j = -1, n = schema.fieldsLength(); ++i < n; ) {
      if (f = schema.fields(i)) {
        fields[++j] = Field2.decode(f, dictionaries);
      }
    }
    return fields;
  }
  function decodeFieldChildren(field, dictionaries) {
    const children = [];
    for (let f, i = -1, j = -1, n = field.childrenLength(); ++i < n; ) {
      if (f = field.children(i)) {
        children[++j] = Field2.decode(f, dictionaries);
      }
    }
    return children;
  }
  function decodeField(f, dictionaries) {
    let id;
    let field;
    let type;
    let keys;
    let dictType;
    let dictMeta;
    if (!dictionaries || !(dictMeta = f.dictionary())) {
      type = decodeFieldType(f, decodeFieldChildren(f, dictionaries));
      field = new Field2(f.name(), type, f.nullable(), decodeCustomMetadata(f));
    } else if (!dictionaries.has(id = bigIntToNumber(dictMeta.id()))) {
      keys = (keys = dictMeta.indexType()) ? decodeIndexType(keys) : new Int32();
      dictionaries.set(id, type = decodeFieldType(f, decodeFieldChildren(f, dictionaries)));
      dictType = new Dictionary(type, keys, id, dictMeta.isOrdered());
      field = new Field2(f.name(), dictType, f.nullable(), decodeCustomMetadata(f));
    } else {
      keys = (keys = dictMeta.indexType()) ? decodeIndexType(keys) : new Int32();
      dictType = new Dictionary(dictionaries.get(id), keys, id, dictMeta.isOrdered());
      field = new Field2(f.name(), dictType, f.nullable(), decodeCustomMetadata(f));
    }
    return field || null;
  }
  function decodeCustomMetadata(parent) {
    const data = /* @__PURE__ */ new Map();
    if (parent) {
      for (let entry, key, i = -1, n = Math.trunc(parent.customMetadataLength()); ++i < n; ) {
        if ((entry = parent.customMetadata(i)) && (key = entry.key()) != null) {
          data.set(key, entry.value());
        }
      }
    }
    return data;
  }
  function decodeIndexType(_type) {
    return new Int_(_type.isSigned(), _type.bitWidth());
  }
  function decodeFieldType(f, children) {
    const typeId = f.typeType();
    switch (typeId) {
      case Type2["NONE"]:
        return new Null();
      case Type2["Null"]:
        return new Null();
      case Type2["Binary"]:
        return new Binary();
      case Type2["Utf8"]:
        return new Utf8();
      case Type2["Bool"]:
        return new Bool();
      case Type2["List"]:
        return new List((children || [])[0]);
      case Type2["Struct_"]:
        return new Struct(children || []);
    }
    switch (typeId) {
      case Type2["Int"]: {
        const t = f.type(new Int());
        return new Int_(t.isSigned(), t.bitWidth());
      }
      case Type2["FloatingPoint"]: {
        const t = f.type(new FloatingPoint());
        return new Float(t.precision());
      }
      case Type2["Decimal"]: {
        const t = f.type(new Decimal2());
        return new Decimal(t.scale(), t.precision(), t.bitWidth());
      }
      case Type2["Date"]: {
        const t = f.type(new Date2());
        return new Date_(t.unit());
      }
      case Type2["Time"]: {
        const t = f.type(new Time());
        return new Time_(t.unit(), t.bitWidth());
      }
      case Type2["Timestamp"]: {
        const t = f.type(new Timestamp());
        return new Timestamp_(t.unit(), t.timezone());
      }
      case Type2["Interval"]: {
        const t = f.type(new Interval());
        return new Interval_(t.unit());
      }
      case Type2["Union"]: {
        const t = f.type(new Union());
        return new Union_(t.mode(), t.typeIdsArray() || [], children || []);
      }
      case Type2["FixedSizeBinary"]: {
        const t = f.type(new FixedSizeBinary2());
        return new FixedSizeBinary(t.byteWidth());
      }
      case Type2["FixedSizeList"]: {
        const t = f.type(new FixedSizeList2());
        return new FixedSizeList(t.listSize(), (children || [])[0]);
      }
      case Type2["Map"]: {
        const t = f.type(new Map2());
        return new Map_((children || [])[0], t.keysSorted());
      }
    }
    throw new Error(`Unrecognized type: "${Type2[typeId]}" (${typeId})`);
  }
  function encodeSchema(b, schema) {
    const fieldOffsets = schema.fields.map((f) => Field2.encode(b, f));
    Schema.startFieldsVector(b, fieldOffsets.length);
    const fieldsVectorOffset = Schema.createFieldsVector(b, fieldOffsets);
    const metadataOffset = !(schema.metadata && schema.metadata.size > 0) ? -1 : Schema.createCustomMetadataVector(b, [...schema.metadata].map(([k, v]) => {
      const key = b.createString(`${k}`);
      const val = b.createString(`${v}`);
      KeyValue.startKeyValue(b);
      KeyValue.addKey(b, key);
      KeyValue.addValue(b, val);
      return KeyValue.endKeyValue(b);
    }));
    Schema.startSchema(b);
    Schema.addFields(b, fieldsVectorOffset);
    Schema.addEndianness(b, platformIsLittleEndian ? Endianness.Little : Endianness.Big);
    if (metadataOffset !== -1) {
      Schema.addCustomMetadata(b, metadataOffset);
    }
    return Schema.endSchema(b);
  }
  function encodeField(b, field) {
    let nameOffset = -1;
    let typeOffset = -1;
    let dictionaryOffset = -1;
    const type = field.type;
    let typeId = field.typeId;
    if (!DataType.isDictionary(type)) {
      typeOffset = instance8.visit(type, b);
    } else {
      typeId = type.dictionary.typeId;
      dictionaryOffset = instance8.visit(type, b);
      typeOffset = instance8.visit(type.dictionary, b);
    }
    const childOffsets = (type.children || []).map((f) => Field2.encode(b, f));
    const childrenVectorOffset = Field.createChildrenVector(b, childOffsets);
    const metadataOffset = !(field.metadata && field.metadata.size > 0) ? -1 : Field.createCustomMetadataVector(b, [...field.metadata].map(([k, v]) => {
      const key = b.createString(`${k}`);
      const val = b.createString(`${v}`);
      KeyValue.startKeyValue(b);
      KeyValue.addKey(b, key);
      KeyValue.addValue(b, val);
      return KeyValue.endKeyValue(b);
    }));
    if (field.name) {
      nameOffset = b.createString(field.name);
    }
    Field.startField(b);
    Field.addType(b, typeOffset);
    Field.addTypeType(b, typeId);
    Field.addChildren(b, childrenVectorOffset);
    Field.addNullable(b, !!field.nullable);
    if (nameOffset !== -1) {
      Field.addName(b, nameOffset);
    }
    if (dictionaryOffset !== -1) {
      Field.addDictionary(b, dictionaryOffset);
    }
    if (metadataOffset !== -1) {
      Field.addCustomMetadata(b, metadataOffset);
    }
    return Field.endField(b);
  }
  function encodeRecordBatch(b, recordBatch) {
    const nodes = recordBatch.nodes || [];
    const buffers = recordBatch.buffers || [];
    RecordBatch2.startNodesVector(b, nodes.length);
    for (const n of nodes.slice().reverse())
      FieldNode2.encode(b, n);
    const nodesVectorOffset = b.endVector();
    RecordBatch2.startBuffersVector(b, buffers.length);
    for (const b_ of buffers.slice().reverse())
      BufferRegion.encode(b, b_);
    const buffersVectorOffset = b.endVector();
    RecordBatch2.startRecordBatch(b);
    RecordBatch2.addLength(b, BigInt(recordBatch.length));
    RecordBatch2.addNodes(b, nodesVectorOffset);
    RecordBatch2.addBuffers(b, buffersVectorOffset);
    return RecordBatch2.endRecordBatch(b);
  }
  function encodeDictionaryBatch(b, dictionaryBatch) {
    const dataOffset = RecordBatch3.encode(b, dictionaryBatch.data);
    DictionaryBatch.startDictionaryBatch(b);
    DictionaryBatch.addId(b, BigInt(dictionaryBatch.id));
    DictionaryBatch.addIsDelta(b, dictionaryBatch.isDelta);
    DictionaryBatch.addData(b, dataOffset);
    return DictionaryBatch.endDictionaryBatch(b);
  }
  function encodeFieldNode(b, node) {
    return FieldNode.createFieldNode(b, BigInt(node.length), BigInt(node.nullCount));
  }
  function encodeBufferRegion(b, node) {
    return Buffer2.createBuffer(b, BigInt(node.offset), BigInt(node.length));
  }
  var platformIsLittleEndian = (() => {
    const buffer = new ArrayBuffer(2);
    new DataView(buffer).setInt16(
      0,
      256,
      true
      /* littleEndian */
    );
    return new Int16Array(buffer)[0] === 256;
  })();

  // ../../node_modules/apache-arrow/ipc/message.mjs
  var invalidMessageType = (type) => `Expected ${MessageHeader[type]} Message in stream, but was null or length 0.`;
  var nullMessage = (type) => `Header pointer of flatbuffer-encoded ${MessageHeader[type]} Message is null or length 0.`;
  var invalidMessageMetadata = (expected, actual) => `Expected to read ${expected} metadata bytes, but only read ${actual}.`;
  var invalidMessageBodyLength = (expected, actual) => `Expected to read ${expected} bytes for message body, but only read ${actual}.`;
  var MessageReader = class {
    constructor(source) {
      this.source = source instanceof ByteStream ? source : new ByteStream(source);
    }
    [Symbol.iterator]() {
      return this;
    }
    next() {
      let r;
      if ((r = this.readMetadataLength()).done) {
        return ITERATOR_DONE;
      }
      if (r.value === -1 && (r = this.readMetadataLength()).done) {
        return ITERATOR_DONE;
      }
      if ((r = this.readMetadata(r.value)).done) {
        return ITERATOR_DONE;
      }
      return r;
    }
    throw(value) {
      return this.source.throw(value);
    }
    return(value) {
      return this.source.return(value);
    }
    readMessage(type) {
      let r;
      if ((r = this.next()).done) {
        return null;
      }
      if (type != null && r.value.headerType !== type) {
        throw new Error(invalidMessageType(type));
      }
      return r.value;
    }
    readMessageBody(bodyLength) {
      if (bodyLength <= 0) {
        return new Uint8Array(0);
      }
      const buf = toUint8Array(this.source.read(bodyLength));
      if (buf.byteLength < bodyLength) {
        throw new Error(invalidMessageBodyLength(bodyLength, buf.byteLength));
      }
      return (
        /* 1. */
        buf.byteOffset % 8 === 0 && /* 2. */
        buf.byteOffset + buf.byteLength <= buf.buffer.byteLength ? buf : buf.slice()
      );
    }
    readSchema(throwIfNull = false) {
      const type = MessageHeader.Schema;
      const message = this.readMessage(type);
      const schema = message === null || message === void 0 ? void 0 : message.header();
      if (throwIfNull && !schema) {
        throw new Error(nullMessage(type));
      }
      return schema;
    }
    readMetadataLength() {
      const buf = this.source.read(PADDING);
      const bb = buf && new ByteBuffer(buf);
      const len = (bb === null || bb === void 0 ? void 0 : bb.readInt32(0)) || 0;
      return { done: len === 0, value: len };
    }
    readMetadata(metadataLength) {
      const buf = this.source.read(metadataLength);
      if (!buf) {
        return ITERATOR_DONE;
      }
      if (buf.byteLength < metadataLength) {
        throw new Error(invalidMessageMetadata(metadataLength, buf.byteLength));
      }
      return { done: false, value: Message2.decode(buf) };
    }
  };
  var AsyncMessageReader = class {
    constructor(source, byteLength) {
      this.source = source instanceof AsyncByteStream ? source : isFileHandle(source) ? new AsyncRandomAccessFile(source, byteLength) : new AsyncByteStream(source);
    }
    [Symbol.asyncIterator]() {
      return this;
    }
    next() {
      return __awaiter(this, void 0, void 0, function* () {
        let r;
        if ((r = yield this.readMetadataLength()).done) {
          return ITERATOR_DONE;
        }
        if (r.value === -1 && (r = yield this.readMetadataLength()).done) {
          return ITERATOR_DONE;
        }
        if ((r = yield this.readMetadata(r.value)).done) {
          return ITERATOR_DONE;
        }
        return r;
      });
    }
    throw(value) {
      return __awaiter(this, void 0, void 0, function* () {
        return yield this.source.throw(value);
      });
    }
    return(value) {
      return __awaiter(this, void 0, void 0, function* () {
        return yield this.source.return(value);
      });
    }
    readMessage(type) {
      return __awaiter(this, void 0, void 0, function* () {
        let r;
        if ((r = yield this.next()).done) {
          return null;
        }
        if (type != null && r.value.headerType !== type) {
          throw new Error(invalidMessageType(type));
        }
        return r.value;
      });
    }
    readMessageBody(bodyLength) {
      return __awaiter(this, void 0, void 0, function* () {
        if (bodyLength <= 0) {
          return new Uint8Array(0);
        }
        const buf = toUint8Array(yield this.source.read(bodyLength));
        if (buf.byteLength < bodyLength) {
          throw new Error(invalidMessageBodyLength(bodyLength, buf.byteLength));
        }
        return (
          /* 1. */
          buf.byteOffset % 8 === 0 && /* 2. */
          buf.byteOffset + buf.byteLength <= buf.buffer.byteLength ? buf : buf.slice()
        );
      });
    }
    readSchema(throwIfNull = false) {
      return __awaiter(this, void 0, void 0, function* () {
        const type = MessageHeader.Schema;
        const message = yield this.readMessage(type);
        const schema = message === null || message === void 0 ? void 0 : message.header();
        if (throwIfNull && !schema) {
          throw new Error(nullMessage(type));
        }
        return schema;
      });
    }
    readMetadataLength() {
      return __awaiter(this, void 0, void 0, function* () {
        const buf = yield this.source.read(PADDING);
        const bb = buf && new ByteBuffer(buf);
        const len = (bb === null || bb === void 0 ? void 0 : bb.readInt32(0)) || 0;
        return { done: len === 0, value: len };
      });
    }
    readMetadata(metadataLength) {
      return __awaiter(this, void 0, void 0, function* () {
        const buf = yield this.source.read(metadataLength);
        if (!buf) {
          return ITERATOR_DONE;
        }
        if (buf.byteLength < metadataLength) {
          throw new Error(invalidMessageMetadata(metadataLength, buf.byteLength));
        }
        return { done: false, value: Message2.decode(buf) };
      });
    }
  };
  var JSONMessageReader = class extends MessageReader {
    constructor(source) {
      super(new Uint8Array(0));
      this._schema = false;
      this._body = [];
      this._batchIndex = 0;
      this._dictionaryIndex = 0;
      this._json = source instanceof ArrowJSON ? source : new ArrowJSON(source);
    }
    next() {
      const { _json } = this;
      if (!this._schema) {
        this._schema = true;
        const message = Message2.fromJSON(_json.schema, MessageHeader.Schema);
        return { done: false, value: message };
      }
      if (this._dictionaryIndex < _json.dictionaries.length) {
        const batch = _json.dictionaries[this._dictionaryIndex++];
        this._body = batch["data"]["columns"];
        const message = Message2.fromJSON(batch, MessageHeader.DictionaryBatch);
        return { done: false, value: message };
      }
      if (this._batchIndex < _json.batches.length) {
        const batch = _json.batches[this._batchIndex++];
        this._body = batch["columns"];
        const message = Message2.fromJSON(batch, MessageHeader.RecordBatch);
        return { done: false, value: message };
      }
      this._body = [];
      return ITERATOR_DONE;
    }
    readMessageBody(_bodyLength) {
      return flattenDataSources(this._body);
      function flattenDataSources(xs) {
        return (xs || []).reduce((buffers, column) => [
          ...buffers,
          ...column["VALIDITY"] && [column["VALIDITY"]] || [],
          ...column["TYPE"] && [column["TYPE"]] || [],
          ...column["OFFSET"] && [column["OFFSET"]] || [],
          ...column["DATA"] && [column["DATA"]] || [],
          ...flattenDataSources(column["children"])
        ], []);
      }
    }
    readMessage(type) {
      let r;
      if ((r = this.next()).done) {
        return null;
      }
      if (type != null && r.value.headerType !== type) {
        throw new Error(invalidMessageType(type));
      }
      return r.value;
    }
    readSchema() {
      const type = MessageHeader.Schema;
      const message = this.readMessage(type);
      const schema = message === null || message === void 0 ? void 0 : message.header();
      if (!message || !schema) {
        throw new Error(nullMessage(type));
      }
      return schema;
    }
  };
  var PADDING = 4;
  var MAGIC_STR = "ARROW1";
  var MAGIC = new Uint8Array(MAGIC_STR.length);
  for (let i = 0; i < MAGIC_STR.length; i += 1) {
    MAGIC[i] = MAGIC_STR.codePointAt(i);
  }
  function checkForMagicArrowString(buffer, index = 0) {
    for (let i = -1, n = MAGIC.length; ++i < n; ) {
      if (MAGIC[i] !== buffer[index + i]) {
        return false;
      }
    }
    return true;
  }
  var magicLength = MAGIC.length;
  var magicAndPadding = magicLength + PADDING;
  var magicX2AndPadding = magicLength * 2 + PADDING;

  // ../../node_modules/apache-arrow/ipc/reader.mjs
  var RecordBatchReader = class _RecordBatchReader extends ReadableInterop {
    constructor(impl) {
      super();
      this._impl = impl;
    }
    get closed() {
      return this._impl.closed;
    }
    get schema() {
      return this._impl.schema;
    }
    get autoDestroy() {
      return this._impl.autoDestroy;
    }
    get dictionaries() {
      return this._impl.dictionaries;
    }
    get numDictionaries() {
      return this._impl.numDictionaries;
    }
    get numRecordBatches() {
      return this._impl.numRecordBatches;
    }
    get footer() {
      return this._impl.isFile() ? this._impl.footer : null;
    }
    isSync() {
      return this._impl.isSync();
    }
    isAsync() {
      return this._impl.isAsync();
    }
    isFile() {
      return this._impl.isFile();
    }
    isStream() {
      return this._impl.isStream();
    }
    next() {
      return this._impl.next();
    }
    throw(value) {
      return this._impl.throw(value);
    }
    return(value) {
      return this._impl.return(value);
    }
    cancel() {
      return this._impl.cancel();
    }
    reset(schema) {
      this._impl.reset(schema);
      this._DOMStream = void 0;
      this._nodeStream = void 0;
      return this;
    }
    open(options) {
      const opening = this._impl.open(options);
      return isPromise(opening) ? opening.then(() => this) : this;
    }
    readRecordBatch(index) {
      return this._impl.isFile() ? this._impl.readRecordBatch(index) : null;
    }
    [Symbol.iterator]() {
      return this._impl[Symbol.iterator]();
    }
    [Symbol.asyncIterator]() {
      return this._impl[Symbol.asyncIterator]();
    }
    toDOMStream() {
      return adapters_default.toDOMStream(this.isSync() ? { [Symbol.iterator]: () => this } : { [Symbol.asyncIterator]: () => this });
    }
    toNodeStream() {
      return adapters_default.toNodeStream(this.isSync() ? { [Symbol.iterator]: () => this } : { [Symbol.asyncIterator]: () => this }, { objectMode: true });
    }
    /** @nocollapse */
    // @ts-ignore
    static throughNode(options) {
      throw new Error(`"throughNode" not available in this environment`);
    }
    /** @nocollapse */
    static throughDOM(writableStrategy, readableStrategy) {
      throw new Error(`"throughDOM" not available in this environment`);
    }
    /** @nocollapse */
    static from(source) {
      if (source instanceof _RecordBatchReader) {
        return source;
      } else if (isArrowJSON(source)) {
        return fromArrowJSON(source);
      } else if (isFileHandle(source)) {
        return fromFileHandle(source);
      } else if (isPromise(source)) {
        return (() => __awaiter(this, void 0, void 0, function* () {
          return yield _RecordBatchReader.from(yield source);
        }))();
      } else if (isFetchResponse(source) || isReadableDOMStream(source) || isReadableNodeStream(source) || isAsyncIterable(source)) {
        return fromAsyncByteStream(new AsyncByteStream(source));
      }
      return fromByteStream(new ByteStream(source));
    }
    /** @nocollapse */
    static readAll(source) {
      if (source instanceof _RecordBatchReader) {
        return source.isSync() ? readAllSync(source) : readAllAsync(source);
      } else if (isArrowJSON(source) || ArrayBuffer.isView(source) || isIterable(source) || isIteratorResult(source)) {
        return readAllSync(source);
      }
      return readAllAsync(source);
    }
  };
  var RecordBatchStreamReader = class extends RecordBatchReader {
    constructor(_impl) {
      super(_impl);
      this._impl = _impl;
    }
    readAll() {
      return [...this];
    }
    [Symbol.iterator]() {
      return this._impl[Symbol.iterator]();
    }
    [Symbol.asyncIterator]() {
      return __asyncGenerator(this, arguments, function* _a5() {
        yield __await(yield* __asyncDelegator(__asyncValues(this[Symbol.iterator]())));
      });
    }
  };
  var AsyncRecordBatchStreamReader = class extends RecordBatchReader {
    constructor(_impl) {
      super(_impl);
      this._impl = _impl;
    }
    readAll() {
      var _a5, e_1, _b2, _c2;
      return __awaiter(this, void 0, void 0, function* () {
        const batches = new Array();
        try {
          for (var _d2 = true, _e2 = __asyncValues(this), _f2; _f2 = yield _e2.next(), _a5 = _f2.done, !_a5; _d2 = true) {
            _c2 = _f2.value;
            _d2 = false;
            const batch = _c2;
            batches.push(batch);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (!_d2 && !_a5 && (_b2 = _e2.return))
              yield _b2.call(_e2);
          } finally {
            if (e_1)
              throw e_1.error;
          }
        }
        return batches;
      });
    }
    [Symbol.iterator]() {
      throw new Error(`AsyncRecordBatchStreamReader is not Iterable`);
    }
    [Symbol.asyncIterator]() {
      return this._impl[Symbol.asyncIterator]();
    }
  };
  var RecordBatchFileReader = class extends RecordBatchStreamReader {
    constructor(_impl) {
      super(_impl);
      this._impl = _impl;
    }
  };
  var AsyncRecordBatchFileReader = class extends AsyncRecordBatchStreamReader {
    constructor(_impl) {
      super(_impl);
      this._impl = _impl;
    }
  };
  var RecordBatchReaderImpl = class {
    get numDictionaries() {
      return this._dictionaryIndex;
    }
    get numRecordBatches() {
      return this._recordBatchIndex;
    }
    constructor(dictionaries = /* @__PURE__ */ new Map()) {
      this.closed = false;
      this.autoDestroy = true;
      this._dictionaryIndex = 0;
      this._recordBatchIndex = 0;
      this.dictionaries = dictionaries;
    }
    isSync() {
      return false;
    }
    isAsync() {
      return false;
    }
    isFile() {
      return false;
    }
    isStream() {
      return false;
    }
    reset(schema) {
      this._dictionaryIndex = 0;
      this._recordBatchIndex = 0;
      this.schema = schema;
      this.dictionaries = /* @__PURE__ */ new Map();
      return this;
    }
    _loadRecordBatch(header, body) {
      const children = this._loadVectors(header, body, this.schema.fields);
      const data = makeData({ type: new Struct(this.schema.fields), length: header.length, children });
      return new RecordBatch(this.schema, data);
    }
    _loadDictionaryBatch(header, body) {
      const { id, isDelta } = header;
      const { dictionaries, schema } = this;
      const dictionary = dictionaries.get(id);
      if (isDelta || !dictionary) {
        const type = schema.dictionaries.get(id);
        const data = this._loadVectors(header.data, body, [type]);
        return (dictionary && isDelta ? dictionary.concat(new Vector(data)) : new Vector(data)).memoize();
      }
      return dictionary.memoize();
    }
    _loadVectors(header, body, types) {
      return new VectorLoader(body, header.nodes, header.buffers, this.dictionaries).visitMany(types);
    }
  };
  var RecordBatchStreamReaderImpl = class extends RecordBatchReaderImpl {
    constructor(source, dictionaries) {
      super(dictionaries);
      this._reader = !isArrowJSON(source) ? new MessageReader(this._handle = source) : new JSONMessageReader(this._handle = source);
    }
    isSync() {
      return true;
    }
    isStream() {
      return true;
    }
    [Symbol.iterator]() {
      return this;
    }
    cancel() {
      if (!this.closed && (this.closed = true)) {
        this.reset()._reader.return();
        this._reader = null;
        this.dictionaries = null;
      }
    }
    open(options) {
      if (!this.closed) {
        this.autoDestroy = shouldAutoDestroy(this, options);
        if (!(this.schema || (this.schema = this._reader.readSchema()))) {
          this.cancel();
        }
      }
      return this;
    }
    throw(value) {
      if (!this.closed && this.autoDestroy && (this.closed = true)) {
        return this.reset()._reader.throw(value);
      }
      return ITERATOR_DONE;
    }
    return(value) {
      if (!this.closed && this.autoDestroy && (this.closed = true)) {
        return this.reset()._reader.return(value);
      }
      return ITERATOR_DONE;
    }
    next() {
      if (this.closed) {
        return ITERATOR_DONE;
      }
      let message;
      const { _reader: reader } = this;
      while (message = this._readNextMessageAndValidate()) {
        if (message.isSchema()) {
          this.reset(message.header());
        } else if (message.isRecordBatch()) {
          this._recordBatchIndex++;
          const header = message.header();
          const buffer = reader.readMessageBody(message.bodyLength);
          const recordBatch = this._loadRecordBatch(header, buffer);
          return { done: false, value: recordBatch };
        } else if (message.isDictionaryBatch()) {
          this._dictionaryIndex++;
          const header = message.header();
          const buffer = reader.readMessageBody(message.bodyLength);
          const vector = this._loadDictionaryBatch(header, buffer);
          this.dictionaries.set(header.id, vector);
        }
      }
      if (this.schema && this._recordBatchIndex === 0) {
        this._recordBatchIndex++;
        return { done: false, value: new _InternalEmptyPlaceholderRecordBatch(this.schema) };
      }
      return this.return();
    }
    _readNextMessageAndValidate(type) {
      return this._reader.readMessage(type);
    }
  };
  var AsyncRecordBatchStreamReaderImpl = class extends RecordBatchReaderImpl {
    constructor(source, dictionaries) {
      super(dictionaries);
      this._reader = new AsyncMessageReader(this._handle = source);
    }
    isAsync() {
      return true;
    }
    isStream() {
      return true;
    }
    [Symbol.asyncIterator]() {
      return this;
    }
    cancel() {
      return __awaiter(this, void 0, void 0, function* () {
        if (!this.closed && (this.closed = true)) {
          yield this.reset()._reader.return();
          this._reader = null;
          this.dictionaries = null;
        }
      });
    }
    open(options) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!this.closed) {
          this.autoDestroy = shouldAutoDestroy(this, options);
          if (!(this.schema || (this.schema = yield this._reader.readSchema()))) {
            yield this.cancel();
          }
        }
        return this;
      });
    }
    throw(value) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!this.closed && this.autoDestroy && (this.closed = true)) {
          return yield this.reset()._reader.throw(value);
        }
        return ITERATOR_DONE;
      });
    }
    return(value) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!this.closed && this.autoDestroy && (this.closed = true)) {
          return yield this.reset()._reader.return(value);
        }
        return ITERATOR_DONE;
      });
    }
    next() {
      return __awaiter(this, void 0, void 0, function* () {
        if (this.closed) {
          return ITERATOR_DONE;
        }
        let message;
        const { _reader: reader } = this;
        while (message = yield this._readNextMessageAndValidate()) {
          if (message.isSchema()) {
            yield this.reset(message.header());
          } else if (message.isRecordBatch()) {
            this._recordBatchIndex++;
            const header = message.header();
            const buffer = yield reader.readMessageBody(message.bodyLength);
            const recordBatch = this._loadRecordBatch(header, buffer);
            return { done: false, value: recordBatch };
          } else if (message.isDictionaryBatch()) {
            this._dictionaryIndex++;
            const header = message.header();
            const buffer = yield reader.readMessageBody(message.bodyLength);
            const vector = this._loadDictionaryBatch(header, buffer);
            this.dictionaries.set(header.id, vector);
          }
        }
        if (this.schema && this._recordBatchIndex === 0) {
          this._recordBatchIndex++;
          return { done: false, value: new _InternalEmptyPlaceholderRecordBatch(this.schema) };
        }
        return yield this.return();
      });
    }
    _readNextMessageAndValidate(type) {
      return __awaiter(this, void 0, void 0, function* () {
        return yield this._reader.readMessage(type);
      });
    }
  };
  var RecordBatchFileReaderImpl = class extends RecordBatchStreamReaderImpl {
    get footer() {
      return this._footer;
    }
    get numDictionaries() {
      return this._footer ? this._footer.numDictionaries : 0;
    }
    get numRecordBatches() {
      return this._footer ? this._footer.numRecordBatches : 0;
    }
    constructor(source, dictionaries) {
      super(source instanceof RandomAccessFile ? source : new RandomAccessFile(source), dictionaries);
    }
    isSync() {
      return true;
    }
    isFile() {
      return true;
    }
    open(options) {
      if (!this.closed && !this._footer) {
        this.schema = (this._footer = this._readFooter()).schema;
        for (const block of this._footer.dictionaryBatches()) {
          block && this._readDictionaryBatch(this._dictionaryIndex++);
        }
      }
      return super.open(options);
    }
    readRecordBatch(index) {
      var _a5;
      if (this.closed) {
        return null;
      }
      if (!this._footer) {
        this.open();
      }
      const block = (_a5 = this._footer) === null || _a5 === void 0 ? void 0 : _a5.getRecordBatch(index);
      if (block && this._handle.seek(block.offset)) {
        const message = this._reader.readMessage(MessageHeader.RecordBatch);
        if (message === null || message === void 0 ? void 0 : message.isRecordBatch()) {
          const header = message.header();
          const buffer = this._reader.readMessageBody(message.bodyLength);
          const recordBatch = this._loadRecordBatch(header, buffer);
          return recordBatch;
        }
      }
      return null;
    }
    _readDictionaryBatch(index) {
      var _a5;
      const block = (_a5 = this._footer) === null || _a5 === void 0 ? void 0 : _a5.getDictionaryBatch(index);
      if (block && this._handle.seek(block.offset)) {
        const message = this._reader.readMessage(MessageHeader.DictionaryBatch);
        if (message === null || message === void 0 ? void 0 : message.isDictionaryBatch()) {
          const header = message.header();
          const buffer = this._reader.readMessageBody(message.bodyLength);
          const vector = this._loadDictionaryBatch(header, buffer);
          this.dictionaries.set(header.id, vector);
        }
      }
    }
    _readFooter() {
      const { _handle } = this;
      const offset = _handle.size - magicAndPadding;
      const length = _handle.readInt32(offset);
      const buffer = _handle.readAt(offset - length, length);
      return Footer_.decode(buffer);
    }
    _readNextMessageAndValidate(type) {
      var _a5;
      if (!this._footer) {
        this.open();
      }
      if (this._footer && this._recordBatchIndex < this.numRecordBatches) {
        const block = (_a5 = this._footer) === null || _a5 === void 0 ? void 0 : _a5.getRecordBatch(this._recordBatchIndex);
        if (block && this._handle.seek(block.offset)) {
          return this._reader.readMessage(type);
        }
      }
      return null;
    }
  };
  var AsyncRecordBatchFileReaderImpl = class extends AsyncRecordBatchStreamReaderImpl {
    get footer() {
      return this._footer;
    }
    get numDictionaries() {
      return this._footer ? this._footer.numDictionaries : 0;
    }
    get numRecordBatches() {
      return this._footer ? this._footer.numRecordBatches : 0;
    }
    constructor(source, ...rest) {
      const byteLength = typeof rest[0] !== "number" ? rest.shift() : void 0;
      const dictionaries = rest[0] instanceof Map ? rest.shift() : void 0;
      super(source instanceof AsyncRandomAccessFile ? source : new AsyncRandomAccessFile(source, byteLength), dictionaries);
    }
    isFile() {
      return true;
    }
    isAsync() {
      return true;
    }
    open(options) {
      const _super = Object.create(null, {
        open: { get: () => super.open }
      });
      return __awaiter(this, void 0, void 0, function* () {
        if (!this.closed && !this._footer) {
          this.schema = (this._footer = yield this._readFooter()).schema;
          for (const block of this._footer.dictionaryBatches()) {
            block && (yield this._readDictionaryBatch(this._dictionaryIndex++));
          }
        }
        return yield _super.open.call(this, options);
      });
    }
    readRecordBatch(index) {
      var _a5;
      return __awaiter(this, void 0, void 0, function* () {
        if (this.closed) {
          return null;
        }
        if (!this._footer) {
          yield this.open();
        }
        const block = (_a5 = this._footer) === null || _a5 === void 0 ? void 0 : _a5.getRecordBatch(index);
        if (block && (yield this._handle.seek(block.offset))) {
          const message = yield this._reader.readMessage(MessageHeader.RecordBatch);
          if (message === null || message === void 0 ? void 0 : message.isRecordBatch()) {
            const header = message.header();
            const buffer = yield this._reader.readMessageBody(message.bodyLength);
            const recordBatch = this._loadRecordBatch(header, buffer);
            return recordBatch;
          }
        }
        return null;
      });
    }
    _readDictionaryBatch(index) {
      var _a5;
      return __awaiter(this, void 0, void 0, function* () {
        const block = (_a5 = this._footer) === null || _a5 === void 0 ? void 0 : _a5.getDictionaryBatch(index);
        if (block && (yield this._handle.seek(block.offset))) {
          const message = yield this._reader.readMessage(MessageHeader.DictionaryBatch);
          if (message === null || message === void 0 ? void 0 : message.isDictionaryBatch()) {
            const header = message.header();
            const buffer = yield this._reader.readMessageBody(message.bodyLength);
            const vector = this._loadDictionaryBatch(header, buffer);
            this.dictionaries.set(header.id, vector);
          }
        }
      });
    }
    _readFooter() {
      return __awaiter(this, void 0, void 0, function* () {
        const { _handle } = this;
        _handle._pending && (yield _handle._pending);
        const offset = _handle.size - magicAndPadding;
        const length = yield _handle.readInt32(offset);
        const buffer = yield _handle.readAt(offset - length, length);
        return Footer_.decode(buffer);
      });
    }
    _readNextMessageAndValidate(type) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!this._footer) {
          yield this.open();
        }
        if (this._footer && this._recordBatchIndex < this.numRecordBatches) {
          const block = this._footer.getRecordBatch(this._recordBatchIndex);
          if (block && (yield this._handle.seek(block.offset))) {
            return yield this._reader.readMessage(type);
          }
        }
        return null;
      });
    }
  };
  var RecordBatchJSONReaderImpl = class extends RecordBatchStreamReaderImpl {
    constructor(source, dictionaries) {
      super(source, dictionaries);
    }
    _loadVectors(header, body, types) {
      return new JSONVectorLoader(body, header.nodes, header.buffers, this.dictionaries).visitMany(types);
    }
  };
  function shouldAutoDestroy(self2, options) {
    return options && typeof options["autoDestroy"] === "boolean" ? options["autoDestroy"] : self2["autoDestroy"];
  }
  function* readAllSync(source) {
    const reader = RecordBatchReader.from(source);
    try {
      if (!reader.open({ autoDestroy: false }).closed) {
        do {
          yield reader;
        } while (!reader.reset().open().closed);
      }
    } finally {
      reader.cancel();
    }
  }
  function readAllAsync(source) {
    return __asyncGenerator(this, arguments, function* readAllAsync_1() {
      const reader = yield __await(RecordBatchReader.from(source));
      try {
        if (!(yield __await(reader.open({ autoDestroy: false }))).closed) {
          do {
            yield yield __await(reader);
          } while (!(yield __await(reader.reset().open())).closed);
        }
      } finally {
        yield __await(reader.cancel());
      }
    });
  }
  function fromArrowJSON(source) {
    return new RecordBatchStreamReader(new RecordBatchJSONReaderImpl(source));
  }
  function fromByteStream(source) {
    const bytes = source.peek(magicLength + 7 & ~7);
    return bytes && bytes.byteLength >= 4 ? !checkForMagicArrowString(bytes) ? new RecordBatchStreamReader(new RecordBatchStreamReaderImpl(source)) : new RecordBatchFileReader(new RecordBatchFileReaderImpl(source.read())) : new RecordBatchStreamReader(new RecordBatchStreamReaderImpl(/* @__PURE__ */ function* () {
    }()));
  }
  function fromAsyncByteStream(source) {
    return __awaiter(this, void 0, void 0, function* () {
      const bytes = yield source.peek(magicLength + 7 & ~7);
      return bytes && bytes.byteLength >= 4 ? !checkForMagicArrowString(bytes) ? new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(source)) : new RecordBatchFileReader(new RecordBatchFileReaderImpl(yield source.read())) : new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(function() {
        return __asyncGenerator(this, arguments, function* () {
        });
      }()));
    });
  }
  function fromFileHandle(source) {
    return __awaiter(this, void 0, void 0, function* () {
      const { size } = yield source.stat();
      const file = new AsyncRandomAccessFile(source, size);
      if (size >= magicX2AndPadding && checkForMagicArrowString(yield file.readAt(0, magicLength + 7 & ~7))) {
        return new AsyncRecordBatchFileReader(new AsyncRecordBatchFileReaderImpl(file));
      }
      return new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(file));
    });
  }

  // ../../node_modules/apache-arrow/visitor/vectorassembler.mjs
  var VectorAssembler = class _VectorAssembler extends Visitor {
    /** @nocollapse */
    static assemble(...args) {
      const unwrap = (nodes) => nodes.flatMap((node) => Array.isArray(node) ? unwrap(node) : node instanceof RecordBatch ? node.data.children : node.data);
      const assembler = new _VectorAssembler();
      assembler.visitMany(unwrap(args));
      return assembler;
    }
    constructor() {
      super();
      this._byteLength = 0;
      this._nodes = [];
      this._buffers = [];
      this._bufferRegions = [];
    }
    visit(data) {
      if (data instanceof Vector) {
        this.visitMany(data.data);
        return this;
      }
      const { type } = data;
      if (!DataType.isDictionary(type)) {
        const { length, nullCount } = data;
        if (length > 2147483647) {
          throw new RangeError("Cannot write arrays larger than 2^31 - 1 in length");
        }
        if (!DataType.isNull(type)) {
          addBuffer.call(this, nullCount <= 0 ? new Uint8Array(0) : truncateBitmap(data.offset, length, data.nullBitmap));
        }
        this.nodes.push(new FieldNode2(length, nullCount));
      }
      return super.visit(data);
    }
    visitNull(_null) {
      return this;
    }
    visitDictionary(data) {
      return this.visit(data.clone(data.type.indices));
    }
    get nodes() {
      return this._nodes;
    }
    get buffers() {
      return this._buffers;
    }
    get byteLength() {
      return this._byteLength;
    }
    get bufferRegions() {
      return this._bufferRegions;
    }
  };
  function addBuffer(values) {
    const byteLength = values.byteLength + 7 & ~7;
    this.buffers.push(values);
    this.bufferRegions.push(new BufferRegion(this._byteLength, byteLength));
    this._byteLength += byteLength;
    return this;
  }
  function assembleUnion(data) {
    const { type, length, typeIds, valueOffsets } = data;
    addBuffer.call(this, typeIds);
    if (type.mode === UnionMode.Sparse) {
      return assembleNestedVector.call(this, data);
    } else if (type.mode === UnionMode.Dense) {
      if (data.offset <= 0) {
        addBuffer.call(this, valueOffsets);
        return assembleNestedVector.call(this, data);
      } else {
        const maxChildTypeId = typeIds.reduce((x, y) => Math.max(x, y), typeIds[0]);
        const childLengths = new Int32Array(maxChildTypeId + 1);
        const childOffsets = new Int32Array(maxChildTypeId + 1).fill(-1);
        const shiftedOffsets = new Int32Array(length);
        const unshiftedOffsets = rebaseValueOffsets(-valueOffsets[0], length, valueOffsets);
        for (let typeId, shift, index = -1; ++index < length; ) {
          if ((shift = childOffsets[typeId = typeIds[index]]) === -1) {
            shift = childOffsets[typeId] = unshiftedOffsets[typeId];
          }
          shiftedOffsets[index] = unshiftedOffsets[index] - shift;
          ++childLengths[typeId];
        }
        addBuffer.call(this, shiftedOffsets);
        for (let child, childIndex = -1, numChildren = type.children.length; ++childIndex < numChildren; ) {
          if (child = data.children[childIndex]) {
            const typeId = type.typeIds[childIndex];
            const childLength = Math.min(length, childLengths[typeId]);
            this.visit(child.slice(childOffsets[typeId], childLength));
          }
        }
      }
    }
    return this;
  }
  function assembleBoolVector(data) {
    let values;
    if (data.nullCount >= data.length) {
      return addBuffer.call(this, new Uint8Array(0));
    } else if ((values = data.values) instanceof Uint8Array) {
      return addBuffer.call(this, truncateBitmap(data.offset, data.length, values));
    }
    return addBuffer.call(this, packBools(data.values));
  }
  function assembleFlatVector(data) {
    return addBuffer.call(this, data.values.subarray(0, data.length * data.stride));
  }
  function assembleFlatListVector(data) {
    const { length, values, valueOffsets } = data;
    const firstOffset = valueOffsets[0];
    const lastOffset = valueOffsets[length];
    const byteLength = Math.min(lastOffset - firstOffset, values.byteLength - firstOffset);
    addBuffer.call(this, rebaseValueOffsets(-valueOffsets[0], length, valueOffsets));
    addBuffer.call(this, values.subarray(firstOffset, firstOffset + byteLength));
    return this;
  }
  function assembleListVector(data) {
    const { length, valueOffsets } = data;
    if (valueOffsets) {
      addBuffer.call(this, rebaseValueOffsets(valueOffsets[0], length, valueOffsets));
    }
    return this.visit(data.children[0]);
  }
  function assembleNestedVector(data) {
    return this.visitMany(data.type.children.map((_, i) => data.children[i]).filter(Boolean))[0];
  }
  VectorAssembler.prototype.visitBool = assembleBoolVector;
  VectorAssembler.prototype.visitInt = assembleFlatVector;
  VectorAssembler.prototype.visitFloat = assembleFlatVector;
  VectorAssembler.prototype.visitUtf8 = assembleFlatListVector;
  VectorAssembler.prototype.visitBinary = assembleFlatListVector;
  VectorAssembler.prototype.visitFixedSizeBinary = assembleFlatVector;
  VectorAssembler.prototype.visitDate = assembleFlatVector;
  VectorAssembler.prototype.visitTimestamp = assembleFlatVector;
  VectorAssembler.prototype.visitTime = assembleFlatVector;
  VectorAssembler.prototype.visitDecimal = assembleFlatVector;
  VectorAssembler.prototype.visitList = assembleListVector;
  VectorAssembler.prototype.visitStruct = assembleNestedVector;
  VectorAssembler.prototype.visitUnion = assembleUnion;
  VectorAssembler.prototype.visitInterval = assembleFlatVector;
  VectorAssembler.prototype.visitFixedSizeList = assembleListVector;
  VectorAssembler.prototype.visitMap = assembleListVector;

  // ../../node_modules/apache-arrow/ipc/writer.mjs
  var RecordBatchWriter = class extends ReadableInterop {
    /** @nocollapse */
    // @ts-ignore
    static throughNode(options) {
      throw new Error(`"throughNode" not available in this environment`);
    }
    /** @nocollapse */
    static throughDOM(writableStrategy, readableStrategy) {
      throw new Error(`"throughDOM" not available in this environment`);
    }
    constructor(options) {
      super();
      this._position = 0;
      this._started = false;
      this._sink = new AsyncByteQueue();
      this._schema = null;
      this._dictionaryBlocks = [];
      this._recordBatchBlocks = [];
      this._dictionaryDeltaOffsets = /* @__PURE__ */ new Map();
      isObject(options) || (options = { autoDestroy: true, writeLegacyIpcFormat: false });
      this._autoDestroy = typeof options.autoDestroy === "boolean" ? options.autoDestroy : true;
      this._writeLegacyIpcFormat = typeof options.writeLegacyIpcFormat === "boolean" ? options.writeLegacyIpcFormat : false;
    }
    toString(sync = false) {
      return this._sink.toString(sync);
    }
    toUint8Array(sync = false) {
      return this._sink.toUint8Array(sync);
    }
    writeAll(input) {
      if (isPromise(input)) {
        return input.then((x) => this.writeAll(x));
      } else if (isAsyncIterable(input)) {
        return writeAllAsync(this, input);
      }
      return writeAll(this, input);
    }
    get closed() {
      return this._sink.closed;
    }
    [Symbol.asyncIterator]() {
      return this._sink[Symbol.asyncIterator]();
    }
    toDOMStream(options) {
      return this._sink.toDOMStream(options);
    }
    toNodeStream(options) {
      return this._sink.toNodeStream(options);
    }
    close() {
      return this.reset()._sink.close();
    }
    abort(reason) {
      return this.reset()._sink.abort(reason);
    }
    finish() {
      this._autoDestroy ? this.close() : this.reset(this._sink, this._schema);
      return this;
    }
    reset(sink = this._sink, schema = null) {
      if (sink === this._sink || sink instanceof AsyncByteQueue) {
        this._sink = sink;
      } else {
        this._sink = new AsyncByteQueue();
        if (sink && isWritableDOMStream(sink)) {
          this.toDOMStream({ type: "bytes" }).pipeTo(sink);
        } else if (sink && isWritableNodeStream(sink)) {
          this.toNodeStream({ objectMode: false }).pipe(sink);
        }
      }
      if (this._started && this._schema) {
        this._writeFooter(this._schema);
      }
      this._started = false;
      this._dictionaryBlocks = [];
      this._recordBatchBlocks = [];
      this._dictionaryDeltaOffsets = /* @__PURE__ */ new Map();
      if (!schema || !compareSchemas(schema, this._schema)) {
        if (schema == null) {
          this._position = 0;
          this._schema = null;
        } else {
          this._started = true;
          this._schema = schema;
          this._writeSchema(schema);
        }
      }
      return this;
    }
    write(payload) {
      let schema = null;
      if (!this._sink) {
        throw new Error(`RecordBatchWriter is closed`);
      } else if (payload == null) {
        return this.finish() && void 0;
      } else if (payload instanceof Table && !(schema = payload.schema)) {
        return this.finish() && void 0;
      } else if (payload instanceof RecordBatch && !(schema = payload.schema)) {
        return this.finish() && void 0;
      }
      if (schema && !compareSchemas(schema, this._schema)) {
        if (this._started && this._autoDestroy) {
          return this.close();
        }
        this.reset(this._sink, schema);
      }
      if (payload instanceof RecordBatch) {
        if (!(payload instanceof _InternalEmptyPlaceholderRecordBatch)) {
          this._writeRecordBatch(payload);
        }
      } else if (payload instanceof Table) {
        this.writeAll(payload.batches);
      } else if (isIterable(payload)) {
        this.writeAll(payload);
      }
    }
    _writeMessage(message, alignment = 8) {
      const a = alignment - 1;
      const buffer = Message2.encode(message);
      const flatbufferSize = buffer.byteLength;
      const prefixSize = !this._writeLegacyIpcFormat ? 8 : 4;
      const alignedSize = flatbufferSize + prefixSize + a & ~a;
      const nPaddingBytes = alignedSize - flatbufferSize - prefixSize;
      if (message.headerType === MessageHeader.RecordBatch) {
        this._recordBatchBlocks.push(new FileBlock(alignedSize, message.bodyLength, this._position));
      } else if (message.headerType === MessageHeader.DictionaryBatch) {
        this._dictionaryBlocks.push(new FileBlock(alignedSize, message.bodyLength, this._position));
      }
      if (!this._writeLegacyIpcFormat) {
        this._write(Int32Array.of(-1));
      }
      this._write(Int32Array.of(alignedSize - prefixSize));
      if (flatbufferSize > 0) {
        this._write(buffer);
      }
      return this._writePadding(nPaddingBytes);
    }
    _write(chunk) {
      if (this._started) {
        const buffer = toUint8Array(chunk);
        if (buffer && buffer.byteLength > 0) {
          this._sink.write(buffer);
          this._position += buffer.byteLength;
        }
      }
      return this;
    }
    _writeSchema(schema) {
      return this._writeMessage(Message2.from(schema));
    }
    // @ts-ignore
    _writeFooter(schema) {
      return this._writeLegacyIpcFormat ? this._write(Int32Array.of(0)) : this._write(Int32Array.of(-1, 0));
    }
    _writeMagic() {
      return this._write(MAGIC);
    }
    _writePadding(nBytes) {
      return nBytes > 0 ? this._write(new Uint8Array(nBytes)) : this;
    }
    _writeRecordBatch(batch) {
      const { byteLength, nodes, bufferRegions, buffers } = VectorAssembler.assemble(batch);
      const recordBatch = new RecordBatch3(batch.numRows, nodes, bufferRegions);
      const message = Message2.from(recordBatch, byteLength);
      return this._writeDictionaries(batch)._writeMessage(message)._writeBodyBuffers(buffers);
    }
    _writeDictionaryBatch(dictionary, id, isDelta = false) {
      this._dictionaryDeltaOffsets.set(id, dictionary.length + (this._dictionaryDeltaOffsets.get(id) || 0));
      const { byteLength, nodes, bufferRegions, buffers } = VectorAssembler.assemble(new Vector([dictionary]));
      const recordBatch = new RecordBatch3(dictionary.length, nodes, bufferRegions);
      const dictionaryBatch = new DictionaryBatch2(recordBatch, id, isDelta);
      const message = Message2.from(dictionaryBatch, byteLength);
      return this._writeMessage(message)._writeBodyBuffers(buffers);
    }
    _writeBodyBuffers(buffers) {
      let buffer;
      let size, padding;
      for (let i = -1, n = buffers.length; ++i < n; ) {
        if ((buffer = buffers[i]) && (size = buffer.byteLength) > 0) {
          this._write(buffer);
          if ((padding = (size + 7 & ~7) - size) > 0) {
            this._writePadding(padding);
          }
        }
      }
      return this;
    }
    _writeDictionaries(batch) {
      for (let [id, dictionary] of batch.dictionaries) {
        let offset = this._dictionaryDeltaOffsets.get(id) || 0;
        if (offset === 0 || (dictionary = dictionary === null || dictionary === void 0 ? void 0 : dictionary.slice(offset)).length > 0) {
          for (const data of dictionary.data) {
            this._writeDictionaryBatch(data, id, offset > 0);
            offset += data.length;
          }
        }
      }
      return this;
    }
  };
  var RecordBatchStreamWriter = class _RecordBatchStreamWriter extends RecordBatchWriter {
    /** @nocollapse */
    static writeAll(input, options) {
      const writer = new _RecordBatchStreamWriter(options);
      if (isPromise(input)) {
        return input.then((x) => writer.writeAll(x));
      } else if (isAsyncIterable(input)) {
        return writeAllAsync(writer, input);
      }
      return writeAll(writer, input);
    }
  };
  var RecordBatchFileWriter = class _RecordBatchFileWriter extends RecordBatchWriter {
    /** @nocollapse */
    static writeAll(input) {
      const writer = new _RecordBatchFileWriter();
      if (isPromise(input)) {
        return input.then((x) => writer.writeAll(x));
      } else if (isAsyncIterable(input)) {
        return writeAllAsync(writer, input);
      }
      return writeAll(writer, input);
    }
    constructor() {
      super();
      this._autoDestroy = true;
    }
    // @ts-ignore
    _writeSchema(schema) {
      return this._writeMagic()._writePadding(2);
    }
    _writeFooter(schema) {
      const buffer = Footer_.encode(new Footer_(schema, MetadataVersion.V4, this._recordBatchBlocks, this._dictionaryBlocks));
      return super._writeFooter(schema)._write(buffer)._write(Int32Array.of(buffer.byteLength))._writeMagic();
    }
  };
  function writeAll(writer, input) {
    let chunks = input;
    if (input instanceof Table) {
      chunks = input.batches;
      writer.reset(void 0, input.schema);
    }
    for (const batch of chunks) {
      writer.write(batch);
    }
    return writer.finish();
  }
  function writeAllAsync(writer, batches) {
    var _a5, batches_1, batches_1_1;
    var _b2, e_1, _c2, _d2;
    return __awaiter(this, void 0, void 0, function* () {
      try {
        for (_a5 = true, batches_1 = __asyncValues(batches); batches_1_1 = yield batches_1.next(), _b2 = batches_1_1.done, !_b2; _a5 = true) {
          _d2 = batches_1_1.value;
          _a5 = false;
          const batch = _d2;
          writer.write(batch);
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (!_a5 && !_b2 && (_c2 = batches_1.return))
            yield _c2.call(batches_1);
        } finally {
          if (e_1)
            throw e_1.error;
        }
      }
      return writer.finish();
    });
  }

  // ../../node_modules/apache-arrow/io/whatwg/iterable.mjs
  function toDOMStream(source, options) {
    if (isAsyncIterable(source)) {
      return asyncIterableAsReadableDOMStream(source, options);
    }
    if (isIterable(source)) {
      return iterableAsReadableDOMStream(source, options);
    }
    throw new Error(`toDOMStream() must be called with an Iterable or AsyncIterable`);
  }
  function iterableAsReadableDOMStream(source, options) {
    let it2 = null;
    const bm = (options === null || options === void 0 ? void 0 : options.type) === "bytes" || false;
    const hwm = (options === null || options === void 0 ? void 0 : options.highWaterMark) || Math.pow(2, 24);
    return new ReadableStream(Object.assign(Object.assign({}, options), {
      start(controller) {
        next(controller, it2 || (it2 = source[Symbol.iterator]()));
      },
      pull(controller) {
        it2 ? next(controller, it2) : controller.close();
      },
      cancel() {
        ((it2 === null || it2 === void 0 ? void 0 : it2.return) && it2.return() || true) && (it2 = null);
      }
    }), Object.assign({ highWaterMark: bm ? hwm : void 0 }, options));
    function next(controller, it3) {
      let buf;
      let r = null;
      let size = controller.desiredSize || null;
      while (!(r = it3.next(bm ? size : null)).done) {
        if (ArrayBuffer.isView(r.value) && (buf = toUint8Array(r.value))) {
          size != null && bm && (size = size - buf.byteLength + 1);
          r.value = buf;
        }
        controller.enqueue(r.value);
        if (size != null && --size <= 0) {
          return;
        }
      }
      controller.close();
    }
  }
  function asyncIterableAsReadableDOMStream(source, options) {
    let it2 = null;
    const bm = (options === null || options === void 0 ? void 0 : options.type) === "bytes" || false;
    const hwm = (options === null || options === void 0 ? void 0 : options.highWaterMark) || Math.pow(2, 24);
    return new ReadableStream(Object.assign(Object.assign({}, options), {
      start(controller) {
        return __awaiter(this, void 0, void 0, function* () {
          yield next(controller, it2 || (it2 = source[Symbol.asyncIterator]()));
        });
      },
      pull(controller) {
        return __awaiter(this, void 0, void 0, function* () {
          it2 ? yield next(controller, it2) : controller.close();
        });
      },
      cancel() {
        return __awaiter(this, void 0, void 0, function* () {
          ((it2 === null || it2 === void 0 ? void 0 : it2.return) && (yield it2.return()) || true) && (it2 = null);
        });
      }
    }), Object.assign({ highWaterMark: bm ? hwm : void 0 }, options));
    function next(controller, it3) {
      return __awaiter(this, void 0, void 0, function* () {
        let buf;
        let r = null;
        let size = controller.desiredSize || null;
        while (!(r = yield it3.next(bm ? size : null)).done) {
          if (ArrayBuffer.isView(r.value) && (buf = toUint8Array(r.value))) {
            size != null && bm && (size = size - buf.byteLength + 1);
            r.value = buf;
          }
          controller.enqueue(r.value);
          if (size != null && --size <= 0) {
            return;
          }
        }
        controller.close();
      });
    }
  }

  // ../../node_modules/apache-arrow/io/whatwg/builder.mjs
  function builderThroughDOMStream(options) {
    return new BuilderTransform(options);
  }
  var BuilderTransform = class {
    constructor(options) {
      this._numChunks = 0;
      this._finished = false;
      this._bufferedSize = 0;
      const { ["readableStrategy"]: readableStrategy, ["writableStrategy"]: writableStrategy, ["queueingStrategy"]: queueingStrategy = "count" } = options, builderOptions = __rest(options, ["readableStrategy", "writableStrategy", "queueingStrategy"]);
      this._controller = null;
      this._builder = makeBuilder(builderOptions);
      this._getSize = queueingStrategy !== "bytes" ? chunkLength : chunkByteLength;
      const { ["highWaterMark"]: readableHighWaterMark = queueingStrategy === "bytes" ? Math.pow(2, 14) : 1e3 } = Object.assign({}, readableStrategy);
      const { ["highWaterMark"]: writableHighWaterMark = queueingStrategy === "bytes" ? Math.pow(2, 14) : 1e3 } = Object.assign({}, writableStrategy);
      this["readable"] = new ReadableStream({
        ["cancel"]: () => {
          this._builder.clear();
        },
        ["pull"]: (c) => {
          this._maybeFlush(this._builder, this._controller = c);
        },
        ["start"]: (c) => {
          this._maybeFlush(this._builder, this._controller = c);
        }
      }, {
        "highWaterMark": readableHighWaterMark,
        "size": queueingStrategy !== "bytes" ? chunkLength : chunkByteLength
      });
      this["writable"] = new WritableStream({
        ["abort"]: () => {
          this._builder.clear();
        },
        ["write"]: () => {
          this._maybeFlush(this._builder, this._controller);
        },
        ["close"]: () => {
          this._maybeFlush(this._builder.finish(), this._controller);
        }
      }, {
        "highWaterMark": writableHighWaterMark,
        "size": (value) => this._writeValueAndReturnChunkSize(value)
      });
    }
    _writeValueAndReturnChunkSize(value) {
      const bufferedSize = this._bufferedSize;
      this._bufferedSize = this._getSize(this._builder.append(value));
      return this._bufferedSize - bufferedSize;
    }
    _maybeFlush(builder, controller) {
      if (controller == null) {
        return;
      }
      if (this._bufferedSize >= controller.desiredSize) {
        ++this._numChunks && this._enqueue(controller, builder.toVector());
      }
      if (builder.finished) {
        if (builder.length > 0 || this._numChunks === 0) {
          ++this._numChunks && this._enqueue(controller, builder.toVector());
        }
        if (!this._finished && (this._finished = true)) {
          this._enqueue(controller, null);
        }
      }
    }
    _enqueue(controller, chunk) {
      this._bufferedSize = 0;
      this._controller = null;
      chunk == null ? controller.close() : controller.enqueue(chunk);
    }
  };
  var chunkLength = (chunk) => {
    var _a5;
    return (_a5 = chunk === null || chunk === void 0 ? void 0 : chunk.length) !== null && _a5 !== void 0 ? _a5 : 0;
  };
  var chunkByteLength = (chunk) => {
    var _a5;
    return (_a5 = chunk === null || chunk === void 0 ? void 0 : chunk.byteLength) !== null && _a5 !== void 0 ? _a5 : 0;
  };

  // ../../node_modules/apache-arrow/io/whatwg/reader.mjs
  function recordBatchReaderThroughDOMStream(writableStrategy, readableStrategy) {
    const queue = new AsyncByteQueue();
    let reader = null;
    const readable = new ReadableStream({
      cancel() {
        return __awaiter(this, void 0, void 0, function* () {
          yield queue.close();
        });
      },
      start(controller) {
        return __awaiter(this, void 0, void 0, function* () {
          yield next(controller, reader || (reader = yield open()));
        });
      },
      pull(controller) {
        return __awaiter(this, void 0, void 0, function* () {
          reader ? yield next(controller, reader) : controller.close();
        });
      }
    });
    return { writable: new WritableStream(queue, Object.assign({ "highWaterMark": Math.pow(2, 14) }, writableStrategy)), readable };
    function open() {
      return __awaiter(this, void 0, void 0, function* () {
        return yield (yield RecordBatchReader.from(queue)).open(readableStrategy);
      });
    }
    function next(controller, reader2) {
      return __awaiter(this, void 0, void 0, function* () {
        let size = controller.desiredSize;
        let r = null;
        while (!(r = yield reader2.next()).done) {
          controller.enqueue(r.value);
          if (size != null && --size <= 0) {
            return;
          }
        }
        controller.close();
      });
    }
  }

  // ../../node_modules/apache-arrow/io/whatwg/writer.mjs
  function recordBatchWriterThroughDOMStream(writableStrategy, readableStrategy) {
    const writer = new this(writableStrategy);
    const reader = new AsyncByteStream(writer);
    const readable = new ReadableStream({
      // type: 'bytes',
      cancel() {
        return __awaiter(this, void 0, void 0, function* () {
          yield reader.cancel();
        });
      },
      pull(controller) {
        return __awaiter(this, void 0, void 0, function* () {
          yield next(controller);
        });
      },
      start(controller) {
        return __awaiter(this, void 0, void 0, function* () {
          yield next(controller);
        });
      }
    }, Object.assign({ "highWaterMark": Math.pow(2, 14) }, readableStrategy));
    return { writable: new WritableStream(writer, writableStrategy), readable };
    function next(controller) {
      return __awaiter(this, void 0, void 0, function* () {
        let buf = null;
        let size = controller.desiredSize;
        while (buf = yield reader.read(size || null)) {
          controller.enqueue(buf);
          if (size != null && (size -= buf.byteLength) <= 0) {
            return;
          }
        }
        controller.close();
      });
    }
  }

  // ../../node_modules/apache-arrow/ipc/serialization.mjs
  function tableToIPC(table, type = "stream") {
    return (type === "stream" ? RecordBatchStreamWriter : RecordBatchFileWriter).writeAll(table).toUint8Array(true);
  }

  // ../../node_modules/apache-arrow/Arrow.mjs
  var util = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, bn_exports), int_exports), bit_exports), math_exports), buffer_exports), vector_exports), {
    compareSchemas,
    compareFields,
    compareTypes
  });

  // ../../node_modules/apache-arrow/Arrow.dom.mjs
  adapters_default.toDOMStream = toDOMStream;
  Builder["throughDOM"] = builderThroughDOMStream;
  RecordBatchReader["throughDOM"] = recordBatchReaderThroughDOMStream;
  RecordBatchFileReader["throughDOM"] = recordBatchReaderThroughDOMStream;
  RecordBatchStreamReader["throughDOM"] = recordBatchReaderThroughDOMStream;
  RecordBatchWriter["throughDOM"] = recordBatchWriterThroughDOMStream;
  RecordBatchFileWriter["throughDOM"] = recordBatchWriterThroughDOMStream;
  RecordBatchStreamWriter["throughDOM"] = recordBatchWriterThroughDOMStream;

  // src/bindings/connection.ts
  var DuckDBConnection = class {
    /** Constructor */
    constructor(bindings, conn) {
      this._bindings = bindings;
      this._conn = conn;
    }
    /** Close a connection */
    close() {
      this._bindings.disconnect(this._conn);
    }
    /** Brave souls may use this function to consume the underlying connection id */
    useUnsafe(callback) {
      return callback(this._bindings, this._conn);
    }
    /** Run a query */
    query(text) {
      const buffer = this._bindings.runQuery(this._conn, text);
      const reader = RecordBatchReader.from(buffer);
      console.assert(reader.isSync());
      console.assert(reader.isFile());
      return new Table(reader);
    }
    /** Send a query */
    async send(text) {
      let header = this._bindings.startPendingQuery(this._conn, text);
      while (header == null) {
        header = await new Promise((resolve, reject) => {
          try {
            resolve(this._bindings.pollPendingQuery(this._conn));
          } catch (e) {
            console.log(e);
            reject(e);
          }
        });
      }
      const iter = new ResultStreamIterator(this._bindings, this._conn, header);
      const reader = RecordBatchReader.from(iter);
      console.assert(reader.isSync());
      console.assert(reader.isStream());
      return reader;
    }
    /** Cancel a query that was sent earlier */
    cancelSent() {
      return this._bindings.cancelPendingQuery(this._conn);
    }
    /** Get table names */
    getTableNames(query) {
      return this._bindings.getTableNames(this._conn, query);
    }
    /** Create a prepared statement */
    prepare(text) {
      const stmt = this._bindings.createPrepared(this._conn, text);
      return new PreparedStatement(this._bindings, this._conn, stmt);
    }
    /** Create a scalar function */
    createScalarFunction(name, returns, func) {
      this._bindings.createScalarFunction(this._conn, name, returns, func);
    }
    /** Insert an arrow table */
    insertArrowTable(table, options) {
      const buffer = tableToIPC(table, "stream");
      this.insertArrowFromIPCStream(buffer, options);
    }
    /** Insert an arrow table from an ipc stream */
    insertArrowFromIPCStream(buffer, options) {
      this._bindings.insertArrowFromIPCStream(this._conn, buffer, options);
    }
    /** Inesrt csv file from path */
    insertCSVFromPath(path, options) {
      this._bindings.insertCSVFromPath(this._conn, path, options);
    }
    /** Insert json file from path */
    insertJSONFromPath(path, options) {
      this._bindings.insertJSONFromPath(this._conn, path, options);
    }
  };
  var ResultStreamIterator = class {
    constructor(bindings, conn, header) {
      this.bindings = bindings;
      this.conn = conn;
      this.header = header;
      this._first = true;
      this._depleted = false;
    }
    next() {
      if (this._first) {
        this._first = false;
        return { done: false, value: this.header };
      }
      if (this._depleted) {
        return { done: true, value: null };
      }
      const bufferI8 = this.bindings.fetchQueryResults(this.conn);
      this._depleted = bufferI8.length == 0;
      return {
        done: this._depleted,
        value: bufferI8
      };
    }
    [Symbol.iterator]() {
      return this;
    }
  };
  var PreparedStatement = class {
    /** Constructor */
    constructor(bindings, connectionId, statementId) {
      this.bindings = bindings;
      this.connectionId = connectionId;
      this.statementId = statementId;
    }
    /** Close a prepared statement */
    close() {
      this.bindings.closePrepared(this.connectionId, this.statementId);
    }
    /** Run a prepared statement */
    query(...params) {
      const buffer = this.bindings.runPrepared(this.connectionId, this.statementId, params);
      const reader = RecordBatchReader.from(buffer);
      console.assert(reader.isSync());
      console.assert(reader.isFile());
      return new Table(reader);
    }
    /** Send a prepared statement */
    send(...params) {
      const header = this.bindings.sendPrepared(this.connectionId, this.statementId, params);
      const iter = new ResultStreamIterator(this.bindings, this.connectionId, header);
      const reader = RecordBatchReader.from(iter);
      console.assert(reader.isSync());
      console.assert(reader.isStream());
      return reader;
    }
  };

  // src/bindings/udf_runtime.ts
  var TEXT_ENCODER = new TextEncoder();
  var TEXT_DECODER = new TextDecoder("utf-8");
  function storeError(mod, response, message) {
    const msgBuffer = TEXT_ENCODER.encode(message);
    const heapAddr = mod._malloc(msgBuffer.byteLength);
    const heapArray = mod.HEAPU8.subarray(heapAddr, heapAddr + msgBuffer.byteLength);
    heapArray.set(msgBuffer);
    mod.HEAPF64[(response >> 3) + 0] = 1;
    mod.HEAPF64[(response >> 3) + 1] = heapAddr;
    mod.HEAPF64[(response >> 3) + 2] = heapArray.byteLength;
  }
  function getTypeSize(ptype) {
    switch (ptype) {
      case "UINT8":
      case "INT8":
        return 1;
      case "INT32":
      case "FLOAT":
        return 4;
      case "INT64":
      case "UINT64":
      case "DOUBLE":
      case "VARCHAR":
        return 8;
      default:
        return 0;
    }
  }
  function ptrToArray(mod, ptr, ptype, n) {
    const heap = mod.HEAPU8.subarray(ptr, ptr + n * getTypeSize(ptype));
    switch (ptype) {
      case "UINT8":
        return new Uint8Array(heap.buffer, heap.byteOffset, n);
      case "INT8":
        return new Int8Array(heap.buffer, heap.byteOffset, n);
      case "INT32":
        return new Int32Array(heap.buffer, heap.byteOffset, n);
      case "FLOAT":
        return new Float32Array(heap.buffer, heap.byteOffset, n);
      case "DOUBLE":
        return new Float64Array(heap.buffer, heap.byteOffset, n);
      case "VARCHAR":
        return new Float64Array(heap.buffer, heap.byteOffset, n);
      default:
        return new Array(0);
    }
  }
  function ptrToUint8Array(mod, ptr, n) {
    const heap = mod.HEAPU8.subarray(ptr, ptr + n);
    return new Uint8Array(heap.buffer, heap.byteOffset, n);
  }
  function ptrToFloat64Array(mod, ptr, n) {
    const heap = mod.HEAPU8.subarray(ptr, ptr + n * 8);
    return new Float64Array(heap.buffer, heap.byteOffset, n);
  }
  function callScalarUDF(runtime, mod, response, funcId, descPtr, descSize, ptrsPtr, ptrsSize) {
    try {
      const udf = runtime._udfFunctions.get(funcId);
      if (!udf) {
        storeError(mod, response, "Unknown UDF with id: " + funcId);
        return;
      }
      const rawDesc = TEXT_DECODER.decode(mod.HEAPU8.subarray(descPtr, descPtr + descSize));
      const desc = JSON.parse(rawDesc);
      const ptrs = ptrToFloat64Array(mod, ptrsPtr, ptrsSize / 8);
      const buildResolver = (arg) => {
        let validity = null;
        if (arg.validityBuffer !== void 0) {
          validity = ptrToUint8Array(mod, ptrs[arg.validityBuffer], desc.rows);
        }
        switch (arg.physicalType) {
          case "VARCHAR": {
            if (arg.dataBuffer === null || arg.dataBuffer === void 0) {
              throw new Error("malformed data view, expected data buffer for VARCHAR argument");
            }
            if (arg.lengthBuffer === null || arg.lengthBuffer === void 0) {
              throw new Error("malformed data view, expected data length buffer for VARCHAR argument");
            }
            const raw = ptrToArray(mod, ptrs[arg.dataBuffer], arg.physicalType, desc.rows);
            const strings = [];
            const stringLengths = ptrToFloat64Array(mod, ptrs[arg.lengthBuffer], desc.rows);
            for (let j = 0; j < desc.rows; ++j) {
              if (validity != null && !validity[j]) {
                strings.push(null);
                continue;
              }
              const subarray = mod.HEAPU8.subarray(
                raw[j],
                raw[j] + stringLengths[j]
              );
              const str = TEXT_DECODER.decode(subarray);
              strings.push(str);
            }
            return (row) => strings[row];
          }
          case "STRUCT": {
            const tmp2 = {};
            const children = [];
            for (let j = 0; j < (arg.children?.length || 0); ++j) {
              const attr = arg.children[j];
              const child = buildResolver(attr);
              children.push((row) => {
                tmp2[attr.name] = child(row);
              });
            }
            if (validity != null) {
              return (row) => {
                if (!validity[row]) {
                  return null;
                }
                for (const resolver of children) {
                  resolver(row);
                }
                return tmp2;
              };
            } else {
              return (row) => {
                for (const resolver of children) {
                  resolver(row);
                }
                return tmp2;
              };
            }
          }
          default: {
            if (arg.dataBuffer === void 0) {
              throw new Error(
                "malformed data view, expected data buffer for argument of type: " + arg.physicalType
              );
            }
            const data = ptrToArray(mod, ptrs[arg.dataBuffer], arg.physicalType, desc.rows);
            if (validity != null) {
              return (row) => !validity[row] ? null : data[row];
            } else {
              return (row) => data[row];
            }
          }
        }
      };
      const argResolvers = [];
      for (let i = 0; i < desc.args.length; ++i) {
        argResolvers.push(buildResolver(desc.args[i]));
      }
      const resultDataLen = desc.rows * getTypeSize(desc.ret.physicalType);
      const resultDataPtr = mod._malloc(resultDataLen);
      const resultData = ptrToArray(mod, resultDataPtr, desc.ret.physicalType, desc.rows);
      const resultValidityPtr = mod._malloc(desc.rows);
      const resultValidity = ptrToUint8Array(mod, resultValidityPtr, desc.rows);
      if (resultData.length == 0 || resultValidity.length == 0) {
        storeError(mod, response, "Can't create physical arrays for result");
        return;
      }
      let rawResultData = resultData;
      if (desc.ret.physicalType == "VARCHAR") {
        rawResultData = new Array(desc.rows);
      }
      const args = [];
      for (let i = 0; i < desc.args.length; ++i) {
        args.push(null);
      }
      for (let i = 0; i < desc.rows; ++i) {
        for (let j = 0; j < desc.args.length; ++j) {
          args[j] = argResolvers[j](i);
        }
        const res = udf.func(...args);
        rawResultData[i] = res;
        resultValidity[i] = res === void 0 || res === null ? 0 : 1;
      }
      let resultLengthsPtr = 0;
      switch (desc.ret.physicalType) {
        case "VARCHAR": {
          const resultDataUTF8 = new Array(0);
          resultLengthsPtr = mod._malloc(desc.rows * getTypeSize("DOUBLE"));
          const resultLengths = ptrToFloat64Array(mod, resultLengthsPtr, desc.rows);
          let totalLength = 0;
          for (let row = 0; row < desc.rows; ++row) {
            const utf8 = TEXT_ENCODER.encode(rawResultData[row] || "");
            resultDataUTF8.push(utf8);
            resultLengths[row] = utf8.length;
            totalLength += utf8.length;
          }
          const resultStringPtr = mod._malloc(totalLength);
          const resultStringBuf = mod.HEAPU8.subarray(resultStringPtr, resultStringPtr + totalLength);
          let writerOffset = 0;
          for (let row = 0; row < desc.rows; ++row) {
            resultData[row] = writerOffset;
            const resultUTF8 = resultDataUTF8[row];
            const writer = resultStringBuf.subarray(writerOffset, writerOffset + resultUTF8.length);
            writer.set(resultUTF8);
            writerOffset += resultUTF8.length;
          }
        }
      }
      const retLen = 3 * 8;
      const retPtr = mod._malloc(retLen);
      const retBuffer = ptrToFloat64Array(mod, retPtr, 3);
      retBuffer[0] = resultDataPtr;
      retBuffer[1] = resultValidityPtr;
      retBuffer[2] = resultLengthsPtr;
      mod.HEAPF64[(response >> 3) + 0] = 0;
      mod.HEAPF64[(response >> 3) + 1] = retPtr;
      mod.HEAPF64[(response >> 3) + 2] = 0;
    } catch (e) {
      storeError(mod, response, e.toString());
    }
  }

  // src/bindings/runtime.ts
  function TextDecoderWrapper() {
    const decoder3 = new TextDecoder();
    return (data) => {
      if (typeof SharedArrayBuffer !== "undefined" && data.buffer instanceof SharedArrayBuffer) {
        data = new Uint8Array(data);
      }
      return decoder3.decode(data);
    };
  }
  var decodeText = TextDecoderWrapper();
  function failWith(mod, msg) {
    console.error(`FAIL WITH: ${msg}`);
    mod.ccall("duckdb_web_fail_with", null, ["string"], [msg]);
  }
  function copyBuffer(mod, begin, length) {
    const buffer = mod.HEAPU8.subarray(begin, begin + length);
    const copy = new Uint8Array(new ArrayBuffer(buffer.byteLength));
    copy.set(buffer);
    return copy;
  }
  function readString(mod, begin, length) {
    return decodeText(mod.HEAPU8.subarray(begin, begin + length));
  }
  function callSRet(mod, funcName, argTypes, args) {
    const stackPointer = mod.stackSave();
    const response = mod.stackAlloc(3 * 8);
    argTypes.unshift("number");
    args.unshift(response);
    mod.ccall(funcName, null, argTypes, args);
    const status = mod.HEAPF64[(response >> 3) + 0];
    const data = mod.HEAPF64[(response >> 3) + 1];
    const dataSize = mod.HEAPF64[(response >> 3) + 2];
    mod.stackRestore(stackPointer);
    return [status, data, dataSize];
  }
  function dropResponseBuffers(mod) {
    mod.ccall("duckdb_web_clear_response", null, [], []);
  }

  // src/bindings/file_stats.ts
  var FileStatistics = class {
    constructor(u8array) {
      const f642 = new Float64Array(u8array.buffer, u8array.byteOffset, u8array.byteLength / 8);
      const blocks2 = new Uint8Array(new ArrayBuffer(u8array.byteLength));
      blocks2.set(u8array.subarray(7 * 8));
      this.totalFileReadsCold = f642[0];
      this.totalFileReadsAhead = f642[1];
      this.totalFileReadsCached = f642[2];
      this.totalFileWrites = f642[3];
      this.totalPageAccesses = f642[4];
      this.totalPageLoads = f642[5];
      this.blockSize = f642[6];
      this.blockStats = blocks2;
    }
    /** The block stats */
    getBlockStats(index, out) {
      out = out || {
        file_reads_cold: 0,
        file_reads_ahead: 0,
        file_reads_cached: 0,
        file_writes: 0,
        page_accesses: 0,
        page_loads: 0
      };
      out.file_writes = this.blockStats[index * 3 + 0] & 15;
      out.file_reads_cold = this.blockStats[index * 3 + 0] >> 4;
      out.file_reads_ahead = this.blockStats[index * 3 + 1] & 15;
      out.file_reads_cached = this.blockStats[index * 3 + 1] >> 4;
      out.page_accesses = this.blockStats[index * 3 + 1] & 15;
      out.page_loads = this.blockStats[index * 3 + 1] >> 4;
      return out;
    }
  };

  // src/json_typedef.ts
  function arrowToSQLType(type) {
    switch (type.typeId) {
      case Type.Binary:
        return { sqlType: "binary" };
      case Type.Bool:
        return { sqlType: "bool" };
      case Type.Date:
        return { sqlType: "date" };
      case Type.DateDay:
        return { sqlType: "date32[d]" };
      case Type.DateMillisecond:
        return { sqlType: "date64[ms]" };
      case Type.Decimal: {
        const dec = type;
        return { sqlType: "decimal", precision: dec.precision, scale: dec.scale };
      }
      case Type.Float:
        return { sqlType: "float" };
      case Type.Float16:
        return { sqlType: "float16" };
      case Type.Float32:
        return { sqlType: "float32" };
      case Type.Float64:
        return { sqlType: "float64" };
      case Type.Int:
        return { sqlType: "int32" };
      case Type.Int16:
        return { sqlType: "int16" };
      case Type.Int32:
        return { sqlType: "int32" };
      case Type.Int64:
        return { sqlType: "int64" };
      case Type.Uint16:
        return { sqlType: "uint16" };
      case Type.Uint32:
        return { sqlType: "uint32" };
      case Type.Uint64:
        return { sqlType: "uint64" };
      case Type.Uint8:
        return { sqlType: "uint8" };
      case Type.IntervalDayTime:
        return { sqlType: "interval[dt]" };
      case Type.IntervalYearMonth:
        return { sqlType: "interval[m]" };
      case Type.List: {
        const list = type;
        return {
          sqlType: "list",
          valueType: arrowToSQLType(list.valueType)
        };
      }
      case Type.FixedSizeBinary: {
        const bin = type;
        return { sqlType: "fixedsizebinary", byteWidth: bin.byteWidth };
      }
      case Type.Null:
        return { sqlType: "null" };
      case Type.Utf8:
        return { sqlType: "utf8" };
      case Type.Struct: {
        const struct_ = type;
        return {
          sqlType: "struct",
          fields: struct_.children.map((c) => arrowToSQLField(c.name, c.type))
        };
      }
      case Type.Map: {
        const map_ = type;
        return {
          sqlType: "map",
          keyType: arrowToSQLType(map_.keyType),
          valueType: arrowToSQLType(map_.valueType)
        };
      }
      case Type.Time:
        return { sqlType: "time[s]" };
      case Type.TimeMicrosecond:
        return { sqlType: "time[us]" };
      case Type.TimeMillisecond:
        return { sqlType: "time[ms]" };
      case Type.TimeNanosecond:
        return { sqlType: "time[ns]" };
      case Type.TimeSecond:
        return { sqlType: "time[s]" };
      case Type.Timestamp: {
        const ts = type;
        return { sqlType: "timestamp", timezone: ts.timezone || void 0 };
      }
      case Type.TimestampSecond: {
        const ts = type;
        return { sqlType: "timestamp[s]", timezone: ts.timezone || void 0 };
      }
      case Type.TimestampMicrosecond: {
        const ts = type;
        return { sqlType: "timestamp[us]", timezone: ts.timezone || void 0 };
      }
      case Type.TimestampNanosecond: {
        const ts = type;
        return { sqlType: "timestamp[ns]", timezone: ts.timezone || void 0 };
      }
      case Type.TimestampMillisecond: {
        const ts = type;
        return { sqlType: "timestamp[ms]", timezone: ts.timezone || void 0 };
      }
    }
    throw new Error(`unsupported arrow type: ${type.toString()}`);
  }
  function arrowToSQLField(name, type) {
    const t = arrowToSQLType(type);
    t.name = name;
    return t;
  }

  // src/bindings/bindings_base.ts
  var TEXT_ENCODER2 = new TextEncoder();
  var DuckDBBindingsBase = class {
    constructor(logger, runtime) {
      /** The instance */
      this._instance = null;
      /** The loading promise */
      this._initPromise = null;
      /** The resolver for the open promise (called by onRuntimeInitialized) */
      this._initPromiseResolver = () => {
      };
      /** Instantiate the module */
      this.onInstantiationProgress = [];
      this._logger = logger;
      this._runtime = runtime;
      this._nextUDFId = 1;
    }
    /** Get the logger */
    get logger() {
      return this._logger;
    }
    /** Get the instance */
    get mod() {
      return this._instance;
    }
    /** Get the instance */
    get pthread() {
      return this.mod.PThread || null;
    }
    /** Instantiate the database */
    async instantiate(onProgress = (_) => {
    }) {
      if (this._instance != null) {
        return this;
      }
      if (this._initPromise != null) {
        this.onInstantiationProgress.push(onProgress);
        await this._initPromise;
      }
      this._initPromise = new Promise((resolve) => {
        this._initPromiseResolver = resolve;
      });
      this.onInstantiationProgress = [onProgress];
      this._instance = await this.instantiateImpl({
        print: console.log.bind(console),
        printErr: console.log.bind(console),
        onRuntimeInitialized: this._initPromiseResolver
      });
      await this._initPromise;
      this._initPromise = null;
      this.onInstantiationProgress = this.onInstantiationProgress.filter((x) => x != onProgress);
      return this;
    }
    /** Open a database with a config */
    open(config) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_open", ["string"], [JSON.stringify(config)]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      dropResponseBuffers(this.mod);
    }
    /** Reset the database */
    reset() {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_reset", [], []);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      dropResponseBuffers(this.mod);
    }
    /** Get the version */
    getVersion() {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_get_version", [], []);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      const version = readString(this.mod, d, n);
      dropResponseBuffers(this.mod);
      return version;
    }
    /** Get the feature flags */
    getFeatureFlags() {
      return this.mod.ccall("duckdb_web_get_feature_flags", "number", [], []);
    }
    /** Tokenize a script */
    tokenize(text) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_tokenize", ["string"], [text]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      const res = readString(this.mod, d, n);
      dropResponseBuffers(this.mod);
      return JSON.parse(res);
    }
    /** Connect to database */
    connect() {
      const conn = this.mod.ccall("duckdb_web_connect", "number", [], []);
      return new DuckDBConnection(this, conn);
    }
    /** Disconnect from database */
    disconnect(conn) {
      this.mod.ccall("duckdb_web_disconnect", null, ["number"], [conn]);
      if (this.pthread) {
        for (const worker2 of [...this.pthread.runningWorkers, ...this.pthread.unusedWorkers]) {
          worker2.postMessage({
            cmd: "dropUDFFunctions",
            connectionId: conn
          });
        }
      }
    }
    /** Send a query and return the full result */
    runQuery(conn, text) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_query_run", ["number", "string"], [conn, text]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      const res = copyBuffer(this.mod, d, n);
      dropResponseBuffers(this.mod);
      return res;
    }
    /**
     *  Start a pending query asynchronously.
     *  This method returns either the arrow ipc schema or null.
     *  On null, the query has to be executed using `pollPendingQuery` until that returns != null.
     *  Results can then be fetched using `fetchQueryResults`
     */
    startPendingQuery(conn, text) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_pending_query_start", ["number", "string"], [conn, text]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      if (d == 0) {
        return null;
      }
      const res = copyBuffer(this.mod, d, n);
      dropResponseBuffers(this.mod);
      return res;
    }
    /** Poll a pending query */
    pollPendingQuery(conn) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_pending_query_poll", ["number"], [conn]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      if (d == 0) {
        return null;
      }
      const res = copyBuffer(this.mod, d, n);
      dropResponseBuffers(this.mod);
      return res;
    }
    /** Cancel a pending query */
    cancelPendingQuery(conn) {
      return this.mod.ccall("duckdb_web_pending_query_cancel", "boolean", ["number"], [conn]);
    }
    /** Fetch query results */
    fetchQueryResults(conn) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_query_fetch_results", ["number"], [conn]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      const res = copyBuffer(this.mod, d, n);
      dropResponseBuffers(this.mod);
      return res;
    }
    /** Get table names */
    getTableNames(conn, text) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_get_tablenames", ["number", "string"], [conn, text]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      const res = readString(this.mod, d, n);
      dropResponseBuffers(this.mod);
      return JSON.parse(res);
    }
    /** Create a scalar function */
    createScalarFunction(conn, name, returns, func) {
      const decl = {
        functionId: this._nextUDFId,
        name,
        returnType: arrowToSQLType(returns)
      };
      const def = {
        functionId: decl.functionId,
        connectionId: conn,
        name,
        returnType: returns,
        func
      };
      this._nextUDFId += 1;
      const [s, d, n] = callSRet(
        this.mod,
        "duckdb_web_udf_scalar_create",
        ["number", "string"],
        [conn, JSON.stringify(decl)]
      );
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      dropResponseBuffers(this.mod);
      globalThis.DUCKDB_RUNTIME._udfFunctions = (globalThis.DUCKDB_RUNTIME._udfFunctions || /* @__PURE__ */ new Map()).set(
        def.functionId,
        def
      );
      if (this.pthread) {
        for (const worker2 of [...this.pthread.runningWorkers, ...this.pthread.unusedWorkers]) {
          worker2.postMessage({
            cmd: "registerUDFFunction",
            udf: def
          });
        }
      }
    }
    /** Prepare a statement and return its identifier */
    createPrepared(conn, text) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_prepared_create", ["number", "string"], [conn, text]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      dropResponseBuffers(this.mod);
      return d;
    }
    /** Close a prepared statement */
    closePrepared(conn, statement) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_prepared_close", ["number", "number"], [conn, statement]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      dropResponseBuffers(this.mod);
    }
    /** Execute a prepared statement and return the full result */
    runPrepared(conn, statement, params) {
      const [s, d, n] = callSRet(
        this.mod,
        "duckdb_web_prepared_run",
        ["number", "number", "string"],
        [conn, statement, JSON.stringify(params)]
      );
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      const res = copyBuffer(this.mod, d, n);
      dropResponseBuffers(this.mod);
      return res;
    }
    /** Execute a prepared statement and stream the result */
    sendPrepared(conn, statement, params) {
      const [s, d, n] = callSRet(
        this.mod,
        "duckdb_web_prepared_send",
        ["number", "number", "string"],
        [conn, statement, JSON.stringify(params)]
      );
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      const res = copyBuffer(this.mod, d, n);
      dropResponseBuffers(this.mod);
      return res;
    }
    /** Insert record batches from an arrow ipc stream */
    insertArrowFromIPCStream(conn, buffer, options) {
      if (buffer.length == 0)
        return;
      const bufferPtr = this.mod._malloc(buffer.length);
      const bufferOfs = this.mod.HEAPU8.subarray(bufferPtr, bufferPtr + buffer.length);
      bufferOfs.set(buffer);
      const optJSON = options ? JSON.stringify(options) : "";
      const [s, d, n] = callSRet(
        this.mod,
        "duckdb_web_insert_arrow_from_ipc_stream",
        ["number", "number", "number", "string"],
        [conn, bufferPtr, buffer.length, optJSON]
      );
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
    }
    /** Insert csv from path */
    insertCSVFromPath(conn, path, options) {
      if (options.columns !== void 0) {
        options.columnsFlat = [];
        for (const k in options.columns) {
          options.columnsFlat.push(arrowToSQLField(k, options.columns[k]));
        }
      }
      const opt = { ...options };
      opt.columns = opt.columnsFlat;
      delete opt.columnsFlat;
      const optJSON = JSON.stringify(opt);
      const [s, d, n] = callSRet(
        this.mod,
        "duckdb_web_insert_csv_from_path",
        ["number", "string", "string"],
        [conn, path, optJSON]
      );
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
    }
    /** Insert json from path */
    insertJSONFromPath(conn, path, options) {
      if (options.columns !== void 0) {
        options.columnsFlat = [];
        for (const k in options.columns) {
          options.columnsFlat.push(arrowToSQLField(k, options.columns[k]));
        }
      }
      const opt = { ...options };
      opt.columns = opt.columnsFlat;
      delete opt.columnsFlat;
      const optJSON = JSON.stringify(opt);
      const [s, d, n] = callSRet(
        this.mod,
        "duckdb_web_insert_json_from_path",
        ["number", "string", "string"],
        [conn, path, optJSON]
      );
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
    }
    /** Glob file infos */
    globFiles(path) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_fs_glob_file_infos", ["string"], [path]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      const infoStr = readString(this.mod, d, n);
      dropResponseBuffers(this.mod);
      const info = JSON.parse(infoStr);
      if (info == null) {
        return [];
      }
      return info;
    }
    /** Register a file object URL */
    registerFileURL(name, url, proto, directIO = false) {
      if (url === void 0) {
        url = name;
      }
      const [s, d, n] = callSRet(
        this.mod,
        "duckdb_web_fs_register_file_url",
        ["string", "string"],
        [name, url, proto, directIO]
      );
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      dropResponseBuffers(this.mod);
    }
    /** Register file text */
    registerFileText(name, text) {
      const buffer = TEXT_ENCODER2.encode(text);
      this.registerFileBuffer(name, buffer);
    }
    /** Register a file buffer */
    registerFileBuffer(name, buffer) {
      const ptr = this.mod._malloc(buffer.length);
      const dst = this.mod.HEAPU8.subarray(ptr, ptr + buffer.length);
      dst.set(buffer);
      const [s, d, n] = callSRet(
        this.mod,
        "duckdb_web_fs_register_file_buffer",
        ["string", "number", "number"],
        [name, ptr, buffer.length]
      );
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      dropResponseBuffers(this.mod);
    }
    /** Register a file object URL */
    registerFileHandle(name, handle, protocol, directIO) {
      const [s, d, n] = callSRet(
        this.mod,
        "duckdb_web_fs_register_file_url",
        ["string", "string", "number", "boolean"],
        [name, name, protocol, directIO]
      );
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      dropResponseBuffers(this.mod);
      globalThis.DUCKDB_RUNTIME._files = (globalThis.DUCKDB_RUNTIME._files || /* @__PURE__ */ new Map()).set(name, handle);
      if (this.pthread) {
        for (const worker2 of this.pthread.runningWorkers) {
          worker2.postMessage({
            cmd: "registerFileHandle",
            fileName: name,
            fileHandle: handle
          });
        }
        for (const worker2 of this.pthread.unusedWorkers) {
          worker2.postMessage({
            cmd: "dropFileHandle",
            fileName: name
          });
        }
      }
    }
    /** Drop file */
    dropFile(name) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_fs_drop_file", ["string"], [name]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      dropResponseBuffers(this.mod);
    }
    /** Drop files */
    dropFiles() {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_fs_drop_files", [], []);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      dropResponseBuffers(this.mod);
    }
    /** Flush all files */
    flushFiles() {
      this.mod.ccall("duckdb_web_flush_files", null, [], []);
    }
    /** Write a file to a path */
    copyFileToPath(name, path) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_copy_file_to_path", ["string", "string"], [name, path]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      dropResponseBuffers(this.mod);
    }
    /** Write a file to a buffer */
    copyFileToBuffer(name) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_copy_file_to_buffer", ["string"], [name]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      const buffer = this.mod.HEAPU8.subarray(d, d + n);
      const copy = new Uint8Array(buffer.length);
      copy.set(buffer);
      dropResponseBuffers(this.mod);
      return copy;
    }
    /** Enable tracking of file statistics */
    collectFileStatistics(file, enable) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_collect_file_stats", ["string", "boolean"], [file, enable]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
    }
    /** Export file statistics */
    exportFileStatistics(file) {
      const [s, d, n] = callSRet(this.mod, "duckdb_web_export_file_stats", ["string"], [file]);
      if (s !== 0 /* SUCCESS */) {
        throw new Error(readString(this.mod, d, n));
      }
      return new FileStatistics(this.mod.HEAPU8.subarray(d, d + n));
    }
  };

  // src/log.ts
  var VoidLogger = class {
    log(_entry) {
    }
  };

  // ../../node_modules/wasm-feature-detect/dist/esm/index.js
  var bulkMemory = async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 3, 1, 0, 1, 10, 14, 1, 12, 0, 65, 0, 65, 0, 65, 0, 252, 10, 0, 0, 11]));
  var exceptions = async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 8, 1, 6, 0, 6, 64, 25, 11, 11]));
  var simd = async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
  var threads = () => (async (e) => {
    try {
      return "undefined" != typeof MessageChannel && new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)), WebAssembly.validate(e);
    } catch (e2) {
      return false;
    }
  })(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4, 1, 3, 1, 1, 10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11]));

  // src/platform.ts
  var isNode = () => typeof navigator === "undefined" ? true : false;
  var bigInt64Array = null;
  var wasmExceptions = null;
  var wasmThreads = null;
  var wasmSIMD = null;
  var wasmBulkMemory = null;
  async function getPlatformFeatures() {
    if (bigInt64Array == null) {
      bigInt64Array = typeof BigInt64Array != "undefined";
    }
    if (wasmExceptions == null) {
      wasmExceptions = await exceptions();
    }
    if (wasmThreads == null) {
      wasmThreads = await threads();
    }
    if (wasmSIMD == null) {
      wasmSIMD = await simd();
    }
    if (wasmBulkMemory == null) {
      wasmBulkMemory = await bulkMemory();
    }
    return {
      bigInt64Array,
      crossOriginIsolated: isNode() || globalThis.crossOriginIsolated || false,
      wasmExceptions,
      wasmSIMD,
      wasmThreads,
      wasmBulkMemory
    };
  }
  async function selectBundle(bundles) {
    const platform = await getPlatformFeatures();
    if (platform.wasmExceptions) {
      if (platform.wasmSIMD && platform.wasmThreads && platform.crossOriginIsolated && bundles.coi) {
        return {
          mainModule: bundles.coi.mainModule,
          mainWorker: bundles.coi.mainWorker,
          pthreadWorker: bundles.coi.pthreadWorker
        };
      }
      if (bundles.eh) {
        return {
          mainModule: bundles.eh.mainModule,
          mainWorker: bundles.eh.mainWorker,
          pthreadWorker: null
        };
      }
    }
    return {
      mainModule: bundles.mvp.mainModule,
      mainWorker: bundles.mvp.mainWorker,
      pthreadWorker: null
    };
  }

  // src/utils/s3_helper.ts
  var import_js_sha256 = __toESM(require_sha256());
  var getHTTPHost = function(config, url, bucket) {
    if (config?.endpoint?.startsWith("http")) {
      const httpHost = `${config?.endpoint}`;
      const offset = httpHost.indexOf("://") + 3;
      return httpHost.substring(offset);
    } else if (config?.endpoint) {
      return `${bucket}.${config?.endpoint}`;
    } else {
      return `${bucket}.s3.amazonaws.com`;
    }
  };
  function getS3Params(config, url, method2) {
    const parsedS3Url = parseS3Url(url);
    let path = parsedS3Url.path;
    if (isPathStyleAccess(config)) {
      path = `/${parsedS3Url.bucket}${path}`;
    }
    return {
      url: path,
      query: "",
      host: getHTTPHost(config, url, parsedS3Url.bucket),
      region: config?.region ?? "",
      service: "s3",
      method: method2,
      accessKeyId: config?.accessKeyId ?? "",
      secretAccessKey: config?.secretAccessKey ?? "",
      sessionToken: config?.sessionToken ?? "",
      dateNow: (/* @__PURE__ */ new Date()).toISOString().replace(/-/g, "").split("T")[0],
      datetimeNow: (/* @__PURE__ */ new Date()).toISOString().replace(/-/g, "").replace(/:/g, "").split(".")[0] + "Z"
    };
  }
  function uriEncode(input, encode_slash = false) {
    const hexDigit = "0123456789ABCDEF";
    let result = "";
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch >= "A" && ch <= "Z" || ch >= "a" && ch <= "z" || ch >= "0" && ch <= "9" || ch == "_" || ch == "-" || ch == "~" || ch == ".") {
        result += ch;
      } else if (ch == "/") {
        if (encode_slash) {
          result += "%2F";
        } else {
          result += ch;
        }
      } else {
        result += "%";
        result += hexDigit[ch.charCodeAt(0) >> 4];
        result += hexDigit[ch.charCodeAt(0) & 15];
      }
    }
    return result;
  }
  function createS3Headers(params, payloadParams = null) {
    const payloadHash = payloadParams?.contentHash ?? "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const res = /* @__PURE__ */ new Map();
    res.set("x-amz-date", params.datetimeNow);
    res.set("x-amz-content-sha256", payloadHash);
    if (params.sessionToken) {
      res.set("x-amz-security-token", params.sessionToken);
    }
    let signedHeaders = "";
    if (payloadParams?.contentType) {
      signedHeaders += "content-type;";
    }
    signedHeaders += "host;x-amz-content-sha256;x-amz-date";
    if (params.sessionToken) {
      signedHeaders += ";x-amz-security-token";
    }
    let canonicalRequest = params.method + "\n" + uriEncode(params.url) + "\n" + params.query;
    if (payloadParams?.contentType) {
      canonicalRequest += "\ncontent-type:" + payloadParams?.contentType;
    }
    canonicalRequest += "\nhost:" + params.host + "\nx-amz-content-sha256:" + payloadHash + "\nx-amz-date:" + params.datetimeNow;
    if (params.sessionToken && params.sessionToken.length > 0) {
      canonicalRequest += "\nx-amz-security-token:" + params.sessionToken;
    }
    canonicalRequest += "\n\n" + signedHeaders + "\n" + payloadHash;
    const canonicalRequestHashStr = (0, import_js_sha256.sha256)(canonicalRequest);
    const stringToSign = "AWS4-HMAC-SHA256\n" + params.datetimeNow + "\n" + params.dateNow + "/" + params.region + "/" + params.service + "/aws4_request\n" + canonicalRequestHashStr;
    const signKey = "AWS4" + params.secretAccessKey;
    const kDate = import_js_sha256.sha256.hmac.arrayBuffer(signKey, params.dateNow);
    const kRegion = import_js_sha256.sha256.hmac.arrayBuffer(kDate, params.region);
    const kService = import_js_sha256.sha256.hmac.arrayBuffer(kRegion, params.service);
    const signingKey = import_js_sha256.sha256.hmac.arrayBuffer(kService, "aws4_request");
    const signature = import_js_sha256.sha256.hmac(signingKey, stringToSign);
    res.set("Authorization", "AWS4-HMAC-SHA256 Credential=" + params.accessKeyId + "/" + params.dateNow + "/" + params.region + "/" + params.service + "/aws4_request, SignedHeaders=" + signedHeaders + ", Signature=" + signature);
    return res;
  }
  var createS3HeadersFromS3Config = function(config, url, method2, contentType = null, payload = null) {
    const params = getS3Params(config, url, method2);
    const payloadParams = {
      contentType,
      contentHash: payload ? import_js_sha256.sha256.hex(payload) : null
    };
    return createS3Headers(params, payloadParams);
  };
  function addS3Headers(xhr, config, url, method2, contentType = null, payload = null) {
    if (config?.accessKeyId || config?.sessionToken) {
      const headers = createS3HeadersFromS3Config(config, url, method2, contentType, payload);
      headers.forEach((value, header) => {
        xhr.setRequestHeader(header, value);
      });
      if (contentType) {
        xhr.setRequestHeader("content-type", contentType);
      }
    }
  }
  function parseS3Url(url) {
    if (url.indexOf("s3://") != 0) {
      throw new Error("URL needs to start with s3://");
    }
    const slashPos = url.indexOf("/", 5);
    if (slashPos == -1) {
      throw new Error("URL needs to contain a '/' after the host");
    }
    const bucket = url.substring(5, slashPos);
    if (!bucket) {
      throw new Error("URL needs to contain a bucket name");
    }
    const path = url.substring(slashPos);
    if (!path) {
      throw new Error("URL needs to contain key");
    }
    return { bucket, path };
  }
  function isPathStyleAccess(config) {
    if (config?.endpoint?.startsWith("http")) {
      return true;
    }
    return false;
  }
  function getHTTPUrl(config, url) {
    const parsedUrl = parseS3Url(url);
    if (isPathStyleAccess(config)) {
      return `${config?.endpoint}/${parsedUrl.bucket}` + parsedUrl.path;
    }
    return "https://" + getHTTPHost(config, url, parsedUrl.bucket) + parsedUrl.path;
  }

  // src/bindings/runtime_browser.ts
  var BROWSER_RUNTIME = {
    _files: /* @__PURE__ */ new Map(),
    _fileInfoCache: /* @__PURE__ */ new Map(),
    _udfFunctions: /* @__PURE__ */ new Map(),
    _globalFileInfo: null,
    getFileInfo(mod, fileId) {
      try {
        const cached = BROWSER_RUNTIME._fileInfoCache.get(fileId);
        const [s, d, n] = callSRet(
          mod,
          "duckdb_web_fs_get_file_info_by_id",
          ["number", "number"],
          [fileId, cached?.cacheEpoch || 0]
        );
        if (s !== 0 /* SUCCESS */) {
          return null;
        } else if (n === 0) {
          return cached;
        }
        const infoStr = readString(mod, d, n);
        dropResponseBuffers(mod);
        const info = JSON.parse(infoStr);
        if (info == null) {
          return null;
        }
        const file = { ...info, blob: null };
        BROWSER_RUNTIME._fileInfoCache.set(fileId, file);
        return file;
      } catch (e) {
        console.log(e);
        return null;
      }
    },
    getGlobalFileInfo(mod) {
      try {
        const [s, d, n] = callSRet(
          mod,
          "duckdb_web_get_global_file_info",
          ["number"],
          [BROWSER_RUNTIME._globalFileInfo?.cacheEpoch || 0]
        );
        if (s !== 0 /* SUCCESS */) {
          return null;
        } else if (n === 0) {
          return BROWSER_RUNTIME._globalFileInfo;
        }
        const infoStr = readString(mod, d, n);
        dropResponseBuffers(mod);
        const info = JSON.parse(infoStr);
        if (info == null) {
          return null;
        }
        BROWSER_RUNTIME._globalFileInfo = { ...info, blob: null };
        return BROWSER_RUNTIME._globalFileInfo;
      } catch (e) {
        console.log(e);
        return null;
      }
    },
    testPlatformFeature: (_mod, feature) => {
      switch (feature) {
        case 1:
          return typeof BigInt64Array !== "undefined";
        default:
          console.warn(`test for unknown feature: ${feature}`);
          return false;
      }
    },
    getDefaultDataProtocol(mod) {
      return 2 /* BROWSER_FILEREADER */;
    },
    openFile: (mod, fileId, flags) => {
      try {
        BROWSER_RUNTIME._fileInfoCache.delete(fileId);
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.dataProtocol) {
          case 4 /* HTTP */:
          case 5 /* S3 */: {
            if (flags & 1 /* FILE_FLAGS_READ */ && flags & 2 /* FILE_FLAGS_WRITE */) {
              throw new Error(
                `Opening file ${file.fileName} failed: cannot open file with both read and write flags set`
              );
            } else if (flags & 32 /* FILE_FLAGS_APPEND */) {
              throw new Error(
                `Opening file ${file.fileName} failed: appending to HTTP/S3 files is not supported`
              );
            } else if (flags & 2 /* FILE_FLAGS_WRITE */) {
              const xhr = new XMLHttpRequest();
              if (file.dataProtocol == 5 /* S3 */) {
                xhr.open("HEAD", getHTTPUrl(file.s3Config, file.dataUrl), false);
                addS3Headers(xhr, file.s3Config, file.dataUrl, "HEAD");
              } else {
                xhr.open("HEAD", file.dataUrl, false);
              }
              xhr.send(null);
              if (xhr.status != 200 && xhr.status != 404) {
                throw new Error(
                  `Opening file ${file.fileName} failed: Unexpected return status from server (${xhr.status})`
                );
              } else if (xhr.status == 404 && !(flags & 8 /* FILE_FLAGS_FILE_CREATE */ || flags & 16 /* FILE_FLAGS_FILE_CREATE_NEW */)) {
                throw new Error(
                  `Opening file ${file.fileName} failed: Cannot write to non-existent file without FILE_FLAGS_FILE_CREATE or FILE_FLAGS_FILE_CREATE_NEW flag.`
                );
              }
              const data = mod._malloc(1);
              const src = new Uint8Array();
              mod.HEAPU8.set(src, data);
              const result = mod._malloc(2 * 8);
              mod.HEAPF64[(result >> 3) + 0] = 1;
              mod.HEAPF64[(result >> 3) + 1] = data;
              return result;
            } else if (flags != 1 /* FILE_FLAGS_READ */) {
              throw new Error(`Opening file ${file.fileName} failed: unsupported file flags: ${flags}`);
            }
            let contentLength = null;
            let error = null;
            try {
              const xhr = new XMLHttpRequest();
              if (file.dataProtocol == 5 /* S3 */) {
                xhr.open("HEAD", getHTTPUrl(file.s3Config, file.dataUrl), false);
                addS3Headers(xhr, file.s3Config, file.dataUrl, "HEAD");
              } else {
                xhr.open("HEAD", file.dataUrl, false);
              }
              xhr.setRequestHeader("Range", `bytes=0-`);
              xhr.send(null);
              contentLength = xhr.getResponseHeader("Content-Length");
              if (contentLength !== null && xhr.status == 206) {
                const result = mod._malloc(2 * 8);
                mod.HEAPF64[(result >> 3) + 0] = +contentLength;
                mod.HEAPF64[(result >> 3) + 1] = 0;
                return result;
              }
            } catch (e) {
              error = e;
              console.warn(`HEAD request with range header failed: ${e}`);
            }
            if (file.allowFullHttpReads) {
              if (contentLength !== null && +contentLength > 1) {
                const xhr2 = new XMLHttpRequest();
                if (file.dataProtocol == 5 /* S3 */) {
                  xhr2.open("GET", getHTTPUrl(file.s3Config, file.dataUrl), false);
                  addS3Headers(xhr2, file.s3Config, file.dataUrl, "GET");
                } else {
                  xhr2.open("GET", file.dataUrl, false);
                }
                xhr2.responseType = "arraybuffer";
                xhr2.setRequestHeader("Range", `bytes=0-0`);
                xhr2.send(null);
                const contentLength2 = xhr2.getResponseHeader("Content-Length");
                if (xhr2.status == 206 && contentLength2 !== null && +contentLength2 == 1) {
                  const result = mod._malloc(2 * 8);
                  mod.HEAPF64[(result >> 3) + 0] = +contentLength;
                  mod.HEAPF64[(result >> 3) + 1] = 0;
                  return result;
                }
                if (xhr2.status == 200 && contentLength2 !== null && +contentLength2 == +contentLength) {
                  console.warn(`fall back to full HTTP read for: ${file.dataUrl}`);
                  const data = mod._malloc(xhr2.response.byteLength);
                  const src = new Uint8Array(xhr2.response, 0, xhr2.response.byteLength);
                  mod.HEAPU8.set(src, data);
                  const result = mod._malloc(2 * 8);
                  mod.HEAPF64[(result >> 3) + 0] = xhr2.response.byteLength;
                  mod.HEAPF64[(result >> 3) + 1] = data;
                  return result;
                }
              }
              console.warn(`falling back to full HTTP read for: ${file.dataUrl}`);
              const xhr = new XMLHttpRequest();
              if (file.dataProtocol == 5 /* S3 */) {
                xhr.open("GET", getHTTPUrl(file.s3Config, file.dataUrl), false);
                addS3Headers(xhr, file.s3Config, file.dataUrl, "GET");
              } else {
                xhr.open("GET", file.dataUrl, false);
              }
              xhr.responseType = "arraybuffer";
              xhr.send(null);
              if (xhr.status == 200) {
                const data = mod._malloc(xhr.response.byteLength);
                const src = new Uint8Array(xhr.response, 0, xhr.response.byteLength);
                mod.HEAPU8.set(src, data);
                const result = mod._malloc(2 * 8);
                mod.HEAPF64[(result >> 3) + 0] = xhr.response.byteLength;
                mod.HEAPF64[(result >> 3) + 1] = data;
                return result;
              }
            }
            if (error != null) {
              throw new Error(`Reading file ${file.fileName} failed with error: ${error}`);
            }
            return 0;
          }
          case 2 /* BROWSER_FILEREADER */: {
            const handle = BROWSER_RUNTIME._files?.get(file.fileName);
            if (handle) {
              const result2 = mod._malloc(2 * 8);
              mod.HEAPF64[(result2 >> 3) + 0] = handle.size;
              mod.HEAPF64[(result2 >> 3) + 1] = 0;
              return result2;
            }
            console.warn(`Buffering missing file: ${file.fileName}`);
            const result = mod._malloc(2 * 8);
            const buffer = mod._malloc(1);
            mod.HEAPF64[(result >> 3) + 0] = 1;
            mod.HEAPF64[(result >> 3) + 1] = buffer;
            return result;
          }
        }
      } catch (e) {
        console.error(e.toString());
        failWith(mod, e.toString());
      }
      return 0;
    },
    glob: (mod, pathPtr, pathLen) => {
      try {
        const path = readString(mod, pathPtr, pathLen);
        if (path.startsWith("http") || path.startsWith("s3://")) {
          const xhr = new XMLHttpRequest();
          if (path.startsWith("s3://")) {
            const globalInfo = BROWSER_RUNTIME.getGlobalFileInfo(mod);
            xhr.open("HEAD", getHTTPUrl(globalInfo?.s3Config, path), false);
            addS3Headers(xhr, globalInfo?.s3Config, path, "HEAD");
          } else {
            xhr.open("HEAD", path, false);
          }
          xhr.send(null);
          if (xhr.status != 200 && xhr.status !== 206) {
            if (!BROWSER_RUNTIME.getGlobalFileInfo(mod)?.allowFullHttpReads) {
              failWith(mod, `HEAD request failed: ${path}, with full http reads are disabled`);
              return;
            }
            const xhr2 = new XMLHttpRequest();
            if (path.startsWith("s3://")) {
              const globalInfo = BROWSER_RUNTIME.getGlobalFileInfo(mod);
              xhr2.open("GET", getHTTPUrl(globalInfo?.s3Config, path), false);
              addS3Headers(xhr2, globalInfo?.s3Config, path, "HEAD");
            } else {
              xhr2.open("GET", path, false);
            }
            xhr2.setRequestHeader("Range", `bytes=0-0`);
            xhr2.send(null);
            if (xhr2.status != 200 && xhr2.status !== 206) {
              failWith(mod, `HEAD and GET requests failed: ${path}`);
              return;
            }
            const contentLength = xhr2.getResponseHeader("Content-Length");
            if (contentLength && +contentLength > 1) {
              console.warn(`Range request for ${path} did not return a partial response: ${xhr2.status} "${xhr2.statusText}"`);
            }
          }
          mod.ccall("duckdb_web_fs_glob_add_path", null, ["string"], [path]);
        }
      } catch (e) {
        console.log(e);
        failWith(mod, e.toString());
        return 0;
      }
    },
    checkFile: (mod, pathPtr, pathLen) => {
      try {
        const path = readString(mod, pathPtr, pathLen);
        if (path.startsWith("http") || path.startsWith("s3://")) {
          const xhr = new XMLHttpRequest();
          if (path.startsWith("s3://")) {
            const globalInfo = BROWSER_RUNTIME.getGlobalFileInfo(mod);
            xhr.open("HEAD", getHTTPUrl(globalInfo?.s3Config, path), false);
            addS3Headers(xhr, globalInfo?.s3Config, path, "HEAD");
          } else {
            xhr.open("HEAD", path, false);
          }
          xhr.send(null);
          return xhr.status == 206 || xhr.status == 200;
        }
      } catch (e) {
        console.log(e);
        return false;
      }
      return false;
    },
    syncFile: (_mod, _fileId) => {
    },
    closeFile: (mod, fileId) => {
      const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
      BROWSER_RUNTIME._fileInfoCache.delete(fileId);
      switch (file?.dataProtocol) {
        case 0 /* BUFFER */:
        case 4 /* HTTP */:
        case 5 /* S3 */:
          break;
        case 1 /* NODE_FS */:
        case 2 /* BROWSER_FILEREADER */:
          return;
        case 3 /* BROWSER_FSACCESS */: {
          const handle = BROWSER_RUNTIME._files?.get(file.fileName);
          if (!handle) {
            throw new Error(`No OPFS access handle registered with name: ${file.fileName}`);
          }
          return handle.flush();
        }
      }
    },
    truncateFile: (mod, fileId, newSize) => {
      const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
      switch (file?.dataProtocol) {
        case 4 /* HTTP */:
          failWith(mod, `Cannot truncate a http file`);
          return;
        case 5 /* S3 */:
          failWith(mod, `Cannot truncate an s3 file`);
          return;
        case 0 /* BUFFER */:
        case 1 /* NODE_FS */:
        case 2 /* BROWSER_FILEREADER */:
          failWith(mod, `truncateFile not implemented`);
          return;
        case 3 /* BROWSER_FSACCESS */: {
          const handle = BROWSER_RUNTIME._files?.get(file.fileName);
          if (!handle) {
            throw new Error(`No OPFS access handle registered with name: ${file.fileName}`);
          }
          return handle.truncate(newSize);
        }
      }
      return 0;
    },
    readFile(mod, fileId, buf, bytes, location) {
      if (bytes == 0) {
        return 0;
      }
      try {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.dataProtocol) {
          case 4 /* HTTP */:
          case 5 /* S3 */: {
            if (!file.dataUrl) {
              throw new Error(`Missing data URL for file ${fileId}`);
            }
            try {
              const xhr = new XMLHttpRequest();
              if (file.dataProtocol == 5 /* S3 */) {
                xhr.open("GET", getHTTPUrl(file?.s3Config, file.dataUrl), false);
                addS3Headers(xhr, file?.s3Config, file.dataUrl, "GET");
              } else {
                xhr.open("GET", file.dataUrl, false);
              }
              xhr.responseType = "arraybuffer";
              xhr.setRequestHeader("Range", `bytes=${location}-${location + bytes - 1}`);
              xhr.send(null);
              if (xhr.status == 206 || xhr.status == 200 && bytes == xhr.response.byteLength && location == 0) {
                const src = new Uint8Array(xhr.response, 0, Math.min(xhr.response.byteLength, bytes));
                mod.HEAPU8.set(src, buf);
                return src.byteLength;
              } else if (xhr.status == 200) {
                console.warn(`Range request for ${file.dataUrl} did not return a partial response: ${xhr.status} "${xhr.statusText}"`);
                const src = new Uint8Array(xhr.response, location, Math.min(xhr.response.byteLength - location, bytes));
                mod.HEAPU8.set(src, buf);
                return src.byteLength;
              } else {
                throw new Error(
                  `Range request for ${file.dataUrl} did returned non-success status: ${xhr.status} "${xhr.statusText}"`
                );
              }
            } catch (e) {
              console.log(e);
              throw new Error(`Range request for ${file.dataUrl} failed with error: ${e}"`);
            }
          }
          case 2 /* BROWSER_FILEREADER */: {
            const handle = BROWSER_RUNTIME._files?.get(file.fileName);
            if (!handle) {
              throw new Error(`No HTML5 file registered with name: ${file.fileName}`);
            }
            const sliced = handle.slice(location, location + bytes);
            const data = new Uint8Array(new FileReaderSync().readAsArrayBuffer(sliced));
            mod.HEAPU8.set(data, buf);
            return data.byteLength;
          }
          case 3 /* BROWSER_FSACCESS */: {
            const handle = BROWSER_RUNTIME._files?.get(file.fileName);
            if (!handle) {
              throw new Error(`No OPFS access handle registered with name: ${file.fileName}`);
            }
            const out = mod.HEAPU8.subarray(buf, buf + bytes);
            return handle.read(out, { at: location });
          }
        }
        return 0;
      } catch (e) {
        console.log(e);
        failWith(mod, e.toString());
        return 0;
      }
    },
    writeFile: (mod, fileId, buf, bytes, location) => {
      const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
      switch (file?.dataProtocol) {
        case 4 /* HTTP */:
          failWith(mod, "Cannot write to HTTP file");
          return 0;
        case 5 /* S3 */: {
          const buffer = mod.HEAPU8.subarray(buf, buf + bytes);
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", getHTTPUrl(file?.s3Config, file.dataUrl), false);
          addS3Headers(xhr, file?.s3Config, file.dataUrl, "PUT", "", buffer);
          xhr.send(buffer);
          if (xhr.status !== 200) {
            failWith(mod, "Failed writing file: HTTP " + xhr.status);
            return 0;
          }
          return bytes;
        }
        case 2 /* BROWSER_FILEREADER */:
          failWith(mod, "cannot write using the html5 file reader api");
          return 0;
        case 3 /* BROWSER_FSACCESS */: {
          const handle = BROWSER_RUNTIME._files?.get(file.fileName);
          if (!handle) {
            throw new Error(`No OPFS access handle registered with name: ${file.fileName}`);
          }
          const input = mod.HEAPU8.subarray(buf, buf + bytes);
          return handle.write(input, { at: location });
        }
      }
      return 0;
    },
    getLastFileModificationTime: (mod, fileId) => {
      const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
      switch (file?.dataProtocol) {
        case 2 /* BROWSER_FILEREADER */: {
          const handle = BROWSER_RUNTIME._files?.get(file.fileName);
          if (!handle) {
            throw Error(`No handle available for file: ${file.fileName}`);
          }
          return 0;
        }
        case 4 /* HTTP */:
        case 5 /* S3 */:
          return (/* @__PURE__ */ new Date()).getTime();
      }
      return 0;
    },
    checkDirectory: (mod, pathPtr, pathLen) => {
      const path = readString(mod, pathPtr, pathLen);
      console.log(`checkDirectory: ${path}`);
      return false;
    },
    createDirectory: (mod, pathPtr, pathLen) => {
      const path = readString(mod, pathPtr, pathLen);
      console.log(`createDirectory: ${path}`);
    },
    removeDirectory: (mod, pathPtr, pathLen) => {
      const path = readString(mod, pathPtr, pathLen);
      console.log(`removeDirectory: ${path}`);
    },
    listDirectoryEntries: (mod, pathPtr, pathLen) => {
      const path = readString(mod, pathPtr, pathLen);
      console.log(`listDirectoryEntries: ${path}`);
      return false;
    },
    moveFile: (mod, fromPtr, fromLen, toPtr, toLen) => {
      const from = readString(mod, fromPtr, fromLen);
      const to = readString(mod, toPtr, toLen);
      const handle = BROWSER_RUNTIME._files?.get(from);
      if (handle !== void 0) {
        BROWSER_RUNTIME._files.delete(handle);
        BROWSER_RUNTIME._files.set(to, handle);
      }
      for (const [key, value] of BROWSER_RUNTIME._fileInfoCache?.entries() || []) {
        if (value.dataUrl == from) {
          BROWSER_RUNTIME._fileInfoCache.delete(key);
          break;
        }
      }
      return true;
    },
    removeFile: (_mod, _pathPtr, _pathLen) => {
    },
    callScalarUDF: (mod, response, funcId, descPtr, descSize, ptrsPtr, ptrsSize) => {
      callScalarUDF(BROWSER_RUNTIME, mod, response, funcId, descPtr, descSize, ptrsPtr, ptrsSize);
    }
  };
  var runtime_browser_default = BROWSER_RUNTIME;

  // src/bindings/bindings_browser_mvp.ts
  var import_duckdb_mvp = __toESM(require_duckdb_mvp());

  // src/bindings/bindings_browser_base.ts
  var DuckDBBrowserBindings = class extends DuckDBBindingsBase {
    /** Constructor */
    constructor(logger, runtime, mainModuleURL, pthreadWorkerURL) {
      super(logger, runtime);
      this.mainModuleURL = mainModuleURL;
      this.pthreadWorkerURL = pthreadWorkerURL;
    }
    /** Locate a file */
    locateFile(path, prefix) {
      if (path.endsWith(".wasm")) {
        return this.mainModuleURL;
      }
      if (path.endsWith(".worker.js")) {
        if (!this.pthreadWorkerURL) {
          throw new Error("Missing DuckDB worker URL!");
        }
        return this.pthreadWorkerURL;
      }
      throw new Error(`WASM instantiation requested unexpected file: prefix=${prefix} path=${path}`);
    }
    /** Instantiate the wasm module */
    instantiateWasm(imports, success) {
      globalThis.DUCKDB_RUNTIME = this._runtime;
      const handlers = this.onInstantiationProgress;
      if (WebAssembly.instantiateStreaming) {
        if (typeof TransformStream === "function") {
          const fetchWithProgress = async () => {
            const request = new Request(this.mainModuleURL);
            const response2 = await fetch(request);
            const contentLengthHdr = response2.headers.get("content-length");
            const contentLength = contentLengthHdr ? parseInt(contentLengthHdr, 10) || 0 : 0;
            const start = /* @__PURE__ */ new Date();
            const progress = {
              startedAt: start,
              updatedAt: start,
              bytesTotal: contentLength || 0,
              bytesLoaded: 0
            };
            const tracker = {
              transform(chunk, ctrl) {
                progress.bytesLoaded += chunk.byteLength;
                const now = /* @__PURE__ */ new Date();
                if (now.getTime() - progress.updatedAt.getTime() < 20) {
                  progress.updatedAt = now;
                  ctrl.enqueue(chunk);
                  return;
                }
                for (const p of handlers) {
                  p(progress);
                }
                ctrl.enqueue(chunk);
              }
            };
            const ts = new TransformStream(tracker);
            return new Response(response2.body?.pipeThrough(ts), response2);
          };
          const response = fetchWithProgress();
          WebAssembly.instantiateStreaming(response, imports).then((output) => {
            success(output.instance, output.module);
          });
        } else {
          console.warn("instantiating without progress handler since transform streams are unavailable");
          const request = new Request(this.mainModuleURL);
          WebAssembly.instantiateStreaming(fetch(request), imports).then((output) => {
            success(output.instance, output.module);
          });
        }
      } else if (typeof XMLHttpRequest == "function") {
        const xhr = new XMLHttpRequest();
        const url = this.mainModuleURL;
        const start = /* @__PURE__ */ new Date();
        const progress = {
          startedAt: start,
          updatedAt: start,
          bytesTotal: 0,
          bytesLoaded: 0
        };
        xhr.open("GET", url);
        xhr.responseType = "arraybuffer";
        xhr.onerror = (error) => {
          this.logger.log({
            timestamp: /* @__PURE__ */ new Date(),
            level: 4 /* ERROR */,
            origin: 3 /* BINDINGS */,
            topic: 5 /* INSTANTIATE */,
            event: 2 /* ERROR */,
            value: "Failed to load WASM: " + error
          });
          throw new Error(error.toString());
        };
        xhr.onprogress = (e) => {
          progress.bytesTotal = e.total;
          progress.bytesLoaded = e.loaded;
          const now = /* @__PURE__ */ new Date();
          if (now.getTime() - progress.updatedAt.getTime() < 20) {
            progress.updatedAt = now;
            return;
          }
          for (const p of handlers) {
            p(progress);
          }
        };
        xhr.onload = () => {
          WebAssembly.instantiate(xhr.response, imports).then((output) => {
            success(output.instance, output.module);
          }).catch((error) => {
            this.logger.log({
              timestamp: /* @__PURE__ */ new Date(),
              level: 4 /* ERROR */,
              origin: 3 /* BINDINGS */,
              topic: 5 /* INSTANTIATE */,
              event: 2 /* ERROR */,
              value: "Failed to instantiate WASM: " + error
            });
            throw new Error(error);
          });
        };
        xhr.send();
      } else {
        console.warn("instantiating with manual fetch since streaming instantiation and xhrs are unavailable");
        const run = async () => {
          const request = new Request(this.mainModuleURL);
          const response = await fetch(request);
          const buffer = await response.arrayBuffer();
          WebAssembly.instantiate(buffer, imports).then((output) => {
            success(output.instance, output.module);
          });
        };
        run();
      }
      return [];
    }
  };

  // src/bindings/bindings_browser_mvp.ts
  var DuckDB = class extends DuckDBBrowserBindings {
    /** Constructor */
    constructor(logger, runtime, mainModuleURL, pthreadWorkerURL = null) {
      super(logger, runtime, mainModuleURL, pthreadWorkerURL);
    }
    /** Instantiate the bindings */
    instantiateImpl(moduleOverrides) {
      return (0, import_duckdb_mvp.default)({
        ...moduleOverrides,
        instantiateWasm: this.instantiateWasm.bind(this),
        locateFile: this.locateFile.bind(this)
      });
    }
  };

  // src/bindings/bindings_browser_eh.ts
  var import_duckdb_eh = __toESM(require_duckdb_eh());
  var DuckDB2 = class extends DuckDBBrowserBindings {
    /** Constructor */
    constructor(logger, runtime, mainModuleURL, pthreadWorkerURL = null) {
      super(logger, runtime, mainModuleURL, pthreadWorkerURL);
    }
    /** Instantiate the bindings */
    instantiateImpl(moduleOverrides) {
      return (0, import_duckdb_eh.default)({
        ...moduleOverrides,
        instantiateWasm: this.instantiateWasm.bind(this),
        locateFile: this.locateFile.bind(this)
      });
    }
  };

  // src/targets/duckdb-browser-blocking.ts
  async function createDuckDB(bundles, logger, runtime) {
    const platform = await getPlatformFeatures();
    if (platform.wasmExceptions) {
      if (bundles.eh) {
        return new DuckDB2(logger, runtime, bundles.eh.mainModule);
      }
    }
    return new DuckDB(logger, runtime, bundles.mvp.mainModule);
  }

  // src/parallel/async_connection.ts
  var AsyncDuckDBConnection = class {
    constructor(bindings, conn) {
      this._bindings = bindings;
      this._conn = conn;
    }
    /** Access the database bindings */
    get bindings() {
      return this._bindings;
    }
    /** Disconnect from the database */
    async close() {
      return this._bindings.disconnect(this._conn);
    }
    /** Brave souls may use this function to consume the underlying connection id */
    useUnsafe(callback) {
      return callback(this._bindings, this._conn);
    }
    /** Run a query */
    async query(text) {
      this._bindings.logger.log({
        timestamp: /* @__PURE__ */ new Date(),
        level: 2 /* INFO */,
        origin: 4 /* ASYNC_DUCKDB */,
        topic: 4 /* QUERY */,
        event: 4 /* RUN */,
        value: text
      });
      const buffer = await this._bindings.runQuery(this._conn, text);
      const reader = RecordBatchReader.from(buffer);
      console.assert(reader.isSync(), "Reader is not sync");
      console.assert(reader.isFile(), "Reader is not file");
      return new Table(reader);
    }
    /** Send a query */
    async send(text) {
      this._bindings.logger.log({
        timestamp: /* @__PURE__ */ new Date(),
        level: 2 /* INFO */,
        origin: 4 /* ASYNC_DUCKDB */,
        topic: 4 /* QUERY */,
        event: 4 /* RUN */,
        value: text
      });
      let header = await this._bindings.startPendingQuery(this._conn, text);
      while (header == null) {
        header = await this._bindings.pollPendingQuery(this._conn);
      }
      const iter = new AsyncResultStreamIterator(this._bindings, this._conn, header);
      const reader = await RecordBatchReader.from(iter);
      console.assert(reader.isAsync());
      console.assert(reader.isStream());
      return reader;
    }
    /** Cancel a query that was sent earlier */
    async cancelSent() {
      return await this._bindings.cancelPendingQuery(this._conn);
    }
    /** Get table names */
    async getTableNames(query) {
      return await this._bindings.getTableNames(this._conn, query);
    }
    /** Create a prepared statement */
    async prepare(text) {
      const stmt = await this._bindings.createPrepared(this._conn, text);
      return new AsyncPreparedStatement(this._bindings, this._conn, stmt);
    }
    /** Insert an arrow table */
    async insertArrowTable(table, options) {
      const buffer = tableToIPC(table, "stream");
      await this.insertArrowFromIPCStream(buffer, options);
    }
    /** Insert an arrow table from an ipc stream */
    async insertArrowFromIPCStream(buffer, options) {
      await this._bindings.insertArrowFromIPCStream(this._conn, buffer, options);
    }
    /** Insert csv file from path */
    async insertCSVFromPath(text, options) {
      await this._bindings.insertCSVFromPath(this._conn, text, options);
    }
    /** Insert json file from path */
    async insertJSONFromPath(text, options) {
      await this._bindings.insertJSONFromPath(this._conn, text, options);
    }
  };
  var AsyncResultStreamIterator = class {
    constructor(db2, conn, header) {
      this.db = db2;
      this.conn = conn;
      this.header = header;
      this._first = true;
      this._depleted = false;
      this._inFlight = null;
    }
    async next() {
      if (this._first) {
        this._first = false;
        return { done: false, value: this.header };
      }
      if (this._depleted) {
        return { done: true, value: null };
      }
      let buffer;
      if (this._inFlight != null) {
        buffer = await this._inFlight;
        this._inFlight = null;
      } else {
        buffer = await this.db.fetchQueryResults(this.conn);
      }
      this._depleted = buffer.length == 0;
      if (!this._depleted) {
        this._inFlight = this.db.fetchQueryResults(this.conn);
      }
      return {
        done: this._depleted,
        value: buffer
      };
    }
    [Symbol.asyncIterator]() {
      return this;
    }
  };
  var AsyncPreparedStatement = class {
    /** Constructor */
    constructor(bindings, connectionId, statementId) {
      this.bindings = bindings;
      this.connectionId = connectionId;
      this.statementId = statementId;
    }
    /** Close a prepared statement */
    async close() {
      await this.bindings.closePrepared(this.connectionId, this.statementId);
    }
    /** Run a prepared statement */
    async query(...params) {
      const buffer = await this.bindings.runPrepared(this.connectionId, this.statementId, params);
      const reader = RecordBatchReader.from(buffer);
      console.assert(reader.isSync());
      console.assert(reader.isFile());
      return new Table(reader);
    }
    /** Send a prepared statement */
    async send(...params) {
      const header = await this.bindings.sendPrepared(this.connectionId, this.statementId, params);
      const iter = new AsyncResultStreamIterator(this.bindings, this.connectionId, header);
      const reader = await RecordBatchReader.from(iter);
      console.assert(reader.isAsync());
      console.assert(reader.isStream());
      return reader;
    }
  };

  // src/parallel/worker_request.ts
  var WorkerTask = class {
    constructor(type, data) {
      this.promiseResolver = () => {
      };
      this.promiseRejecter = () => {
      };
      this.type = type;
      this.data = data;
      this.promise = new Promise(
        (resolve, reject) => {
          this.promiseResolver = resolve;
          this.promiseRejecter = reject;
        }
      );
    }
  };

  // src/parallel/async_bindings.ts
  var TEXT_ENCODER3 = new TextEncoder();
  var AsyncDuckDB = class {
    constructor(logger, worker2 = null) {
      /** Instantiate the module */
      this._onInstantiationProgress = [];
      /** The worker */
      this._worker = null;
      /** The promise for the worker shutdown */
      this._workerShutdownPromise = null;
      /** Make the worker as terminated */
      this._workerShutdownResolver = () => {
      };
      /** The next message id */
      this._nextMessageId = 0;
      /** The pending requests */
      this._pendingRequests = /* @__PURE__ */ new Map();
      this._logger = logger;
      this._onMessageHandler = this.onMessage.bind(this);
      this._onErrorHandler = this.onError.bind(this);
      this._onCloseHandler = this.onClose.bind(this);
      if (worker2 != null)
        this.attach(worker2);
    }
    /** Get the logger */
    get logger() {
      return this._logger;
    }
    /** Attach to worker */
    attach(worker2) {
      this._worker = worker2;
      this._worker.addEventListener("message", this._onMessageHandler);
      this._worker.addEventListener("error", this._onErrorHandler);
      this._worker.addEventListener("close", this._onCloseHandler);
      this._workerShutdownPromise = new Promise(
        (resolve, _reject) => {
          this._workerShutdownResolver = resolve;
        }
      );
    }
    /** Detach from worker */
    detach() {
      if (!this._worker)
        return;
      this._worker.removeEventListener("message", this._onMessageHandler);
      this._worker.removeEventListener("error", this._onErrorHandler);
      this._worker.removeEventListener("close", this._onCloseHandler);
      this._worker = null;
      this._workerShutdownResolver(null);
      this._workerShutdownPromise = null;
      this._workerShutdownResolver = () => {
      };
    }
    /** Kill the worker */
    async terminate() {
      if (!this._worker)
        return;
      this._worker.terminate();
      this._worker = null;
      this._workerShutdownPromise = null;
      this._workerShutdownResolver = () => {
      };
    }
    /** Post a task */
    async postTask(task, transfer = []) {
      if (!this._worker) {
        console.error("cannot send a message since the worker is not set!");
        return void 0;
      }
      const mid = this._nextMessageId++;
      this._pendingRequests.set(mid, task);
      this._worker.postMessage(
        {
          messageId: mid,
          type: task.type,
          data: task.data
        },
        transfer
      );
      return await task.promise;
    }
    /** Received a message */
    onMessage(event) {
      const response = event.data;
      switch (response.type) {
        case "LOG" /* LOG */: {
          this._logger.log(response.data);
          return;
        }
        case "INSTANTIATE_PROGRESS" /* INSTANTIATE_PROGRESS */: {
          for (const p of this._onInstantiationProgress) {
            p(response.data);
          }
          return;
        }
      }
      const task = this._pendingRequests.get(response.requestId);
      if (!task) {
        console.warn(`unassociated response: [${response.requestId}, ${response.type.toString()}]`);
        return;
      }
      this._pendingRequests.delete(response.requestId);
      if (response.type == "ERROR" /* ERROR */) {
        const e = new Error(response.data.message);
        e.name = response.data.name;
        if (Object.getOwnPropertyDescriptor(e, "stack")?.writable) {
          e.stack = response.data.stack;
        }
        task.promiseRejecter(e);
        return;
      }
      switch (task.type) {
        case "CLOSE_PREPARED" /* CLOSE_PREPARED */:
        case "COLLECT_FILE_STATISTICS" /* COLLECT_FILE_STATISTICS */:
        case "COPY_FILE_TO_PATH" /* COPY_FILE_TO_PATH */:
        case "DISCONNECT" /* DISCONNECT */:
        case "DROP_FILE" /* DROP_FILE */:
        case "DROP_FILES" /* DROP_FILES */:
        case "FLUSH_FILES" /* FLUSH_FILES */:
        case "INSERT_ARROW_FROM_IPC_STREAM" /* INSERT_ARROW_FROM_IPC_STREAM */:
        case "IMPORT_CSV_FROM_PATH" /* INSERT_CSV_FROM_PATH */:
        case "IMPORT_JSON_FROM_PATH" /* INSERT_JSON_FROM_PATH */:
        case "OPEN" /* OPEN */:
        case "PING" /* PING */:
        case "REGISTER_FILE_BUFFER" /* REGISTER_FILE_BUFFER */:
        case "REGISTER_FILE_HANDLE" /* REGISTER_FILE_HANDLE */:
        case "REGISTER_FILE_URL" /* REGISTER_FILE_URL */:
        case "RESET" /* RESET */:
          if (response.type == "OK" /* OK */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "INSTANTIATE" /* INSTANTIATE */:
          this._onInstantiationProgress = [];
          if (response.type == "OK" /* OK */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "GLOB_FILE_INFOS" /* GLOB_FILE_INFOS */:
          if (response.type == "FILE_INFOS" /* FILE_INFOS */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "GET_VERSION" /* GET_VERSION */:
          if (response.type == "VERSION_STRING" /* VERSION_STRING */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "GET_FEATURE_FLAGS" /* GET_FEATURE_FLAGS */:
          if (response.type == "FEATURE_FLAGS" /* FEATURE_FLAGS */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "GET_TABLE_NAMES" /* GET_TABLE_NAMES */:
          if (response.type == "TABLE_NAMES" /* TABLE_NAMES */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "TOKENIZE" /* TOKENIZE */:
          if (response.type == "SCRIPT_TOKENS" /* SCRIPT_TOKENS */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "COPY_FILE_TO_BUFFER" /* COPY_FILE_TO_BUFFER */:
          if (response.type == "FILE_BUFFER" /* FILE_BUFFER */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "EXPORT_FILE_STATISTICS" /* EXPORT_FILE_STATISTICS */:
          if (response.type == "FILE_STATISTICS" /* FILE_STATISTICS */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "CONNECT" /* CONNECT */:
          if (response.type == "CONNECTION_INFO" /* CONNECTION_INFO */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "RUN_PREPARED" /* RUN_PREPARED */:
        case "RUN_QUERY" /* RUN_QUERY */:
          if (response.type == "QUERY_RESULT" /* QUERY_RESULT */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "SEND_PREPARED" /* SEND_PREPARED */:
          if (response.type == "QUERY_RESULT_HEADER" /* QUERY_RESULT_HEADER */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "START_PENDING_QUERY" /* START_PENDING_QUERY */:
          if (response.type == "QUERY_RESULT_HEADER_OR_NULL" /* QUERY_RESULT_HEADER_OR_NULL */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "POLL_PENDING_QUERY" /* POLL_PENDING_QUERY */:
          if (response.type == "QUERY_RESULT_HEADER_OR_NULL" /* QUERY_RESULT_HEADER_OR_NULL */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "CANCEL_PENDING_QUERY" /* CANCEL_PENDING_QUERY */:
          this._onInstantiationProgress = [];
          if (response.type == "SUCCESS" /* SUCCESS */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "FETCH_QUERY_RESULTS" /* FETCH_QUERY_RESULTS */:
          if (response.type == "QUERY_RESULT_CHUNK" /* QUERY_RESULT_CHUNK */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
        case "CREATE_PREPARED" /* CREATE_PREPARED */:
          if (response.type == "PREPARED_STATEMENT_ID" /* PREPARED_STATEMENT_ID */) {
            task.promiseResolver(response.data);
            return;
          }
          break;
      }
      task.promiseRejecter(new Error(`unexpected response type: ${response.type.toString()}`));
    }
    /** Received an error */
    onError(event) {
      console.error(event);
      console.error(`error in duckdb worker: ${event.message}`);
      this._pendingRequests.clear();
    }
    /** The worker was closed */
    onClose() {
      this._workerShutdownResolver(null);
      if (this._pendingRequests.size != 0) {
        console.warn(`worker terminated with ${this._pendingRequests.size} pending requests`);
        return;
      }
      this._pendingRequests.clear();
    }
    /** Reset the duckdb */
    async reset() {
      const task = new WorkerTask("RESET" /* RESET */, null);
      return await this.postTask(task);
    }
    /** Ping the worker thread */
    async ping() {
      const task = new WorkerTask("PING" /* PING */, null);
      await this.postTask(task);
    }
    /** Try to drop a file */
    async dropFile(name) {
      const task = new WorkerTask("DROP_FILE" /* DROP_FILE */, name);
      return await this.postTask(task);
    }
    /** Try to drop files */
    async dropFiles() {
      const task = new WorkerTask("DROP_FILES" /* DROP_FILES */, null);
      return await this.postTask(task);
    }
    /** Flush all files */
    async flushFiles() {
      const task = new WorkerTask("FLUSH_FILES" /* FLUSH_FILES */, null);
      return await this.postTask(task);
    }
    /** Open the database */
    async instantiate(mainModuleURL, pthreadWorkerURL = null, progress = (_p2) => {
    }) {
      this._onInstantiationProgress.push(progress);
      const task = new WorkerTask(
        "INSTANTIATE" /* INSTANTIATE */,
        [mainModuleURL, pthreadWorkerURL]
      );
      return await this.postTask(task);
    }
    /** Get the version */
    async getVersion() {
      const task = new WorkerTask("GET_VERSION" /* GET_VERSION */, null);
      const version = await this.postTask(task);
      return version;
    }
    /** Get the feature flags */
    async getFeatureFlags() {
      const task = new WorkerTask(
        "GET_FEATURE_FLAGS" /* GET_FEATURE_FLAGS */,
        null
      );
      const feature = await this.postTask(task);
      return feature;
    }
    /** Open a new database */
    async open(config) {
      const task = new WorkerTask("OPEN" /* OPEN */, config);
      await this.postTask(task);
    }
    /** Tokenize a script text */
    async tokenize(text) {
      const task = new WorkerTask("TOKENIZE" /* TOKENIZE */, text);
      const tokens = await this.postTask(task);
      return tokens;
    }
    /** Connect to the database */
    async connectInternal() {
      const task = new WorkerTask("CONNECT" /* CONNECT */, null);
      return await this.postTask(task);
    }
    /** Connect to the database */
    async connect() {
      const cid = await this.connectInternal();
      return new AsyncDuckDBConnection(this, cid);
    }
    /** Disconnect from the database */
    async disconnect(conn) {
      const task = new WorkerTask(
        "DISCONNECT" /* DISCONNECT */,
        conn
      );
      await this.postTask(task);
    }
    /** Run a query */
    async runQuery(conn, text) {
      const task = new WorkerTask(
        "RUN_QUERY" /* RUN_QUERY */,
        [conn, text]
      );
      return await this.postTask(task);
    }
    /** Start a pending query */
    async startPendingQuery(conn, text) {
      const task = new WorkerTask(
        "START_PENDING_QUERY" /* START_PENDING_QUERY */,
        [conn, text]
      );
      return await this.postTask(task);
    }
    /** Poll a pending query */
    async pollPendingQuery(conn) {
      const task = new WorkerTask(
        "POLL_PENDING_QUERY" /* POLL_PENDING_QUERY */,
        conn
      );
      return await this.postTask(task);
    }
    /** Cancel a pending query */
    async cancelPendingQuery(conn) {
      const task = new WorkerTask(
        "CANCEL_PENDING_QUERY" /* CANCEL_PENDING_QUERY */,
        conn
      );
      return await this.postTask(task);
    }
    /** Fetch query results */
    async fetchQueryResults(conn) {
      const task = new WorkerTask(
        "FETCH_QUERY_RESULTS" /* FETCH_QUERY_RESULTS */,
        conn
      );
      return await this.postTask(task);
    }
    /** Get table names */
    async getTableNames(conn, text) {
      const task = new WorkerTask(
        "GET_TABLE_NAMES" /* GET_TABLE_NAMES */,
        [conn, text]
      );
      return await this.postTask(task);
    }
    /** Prepare a statement and return its identifier */
    async createPrepared(conn, text) {
      const task = new WorkerTask(
        "CREATE_PREPARED" /* CREATE_PREPARED */,
        [conn, text]
      );
      return await this.postTask(task);
    }
    /** Close a prepared statement */
    async closePrepared(conn, statement) {
      const task = new WorkerTask(
        "CLOSE_PREPARED" /* CLOSE_PREPARED */,
        [conn, statement]
      );
      await this.postTask(task);
    }
    /** Execute a prepared statement and return the full result */
    async runPrepared(conn, statement, params) {
      const task = new WorkerTask(
        "RUN_PREPARED" /* RUN_PREPARED */,
        [conn, statement, params]
      );
      return await this.postTask(task);
    }
    /** Execute a prepared statement and stream the result */
    async sendPrepared(conn, statement, params) {
      const task = new WorkerTask(
        "SEND_PREPARED" /* SEND_PREPARED */,
        [conn, statement, params]
      );
      return await this.postTask(task);
    }
    /** Glob file infos */
    async globFiles(path) {
      const task = new WorkerTask(
        "GLOB_FILE_INFOS" /* GLOB_FILE_INFOS */,
        path
      );
      return await this.postTask(task);
    }
    /** Register file text */
    async registerFileText(name, text) {
      const buffer = TEXT_ENCODER3.encode(text);
      await this.registerFileBuffer(name, buffer);
    }
    /** Register a file path. */
    async registerFileURL(name, url, proto, directIO) {
      if (url === void 0) {
        url = name;
      }
      const task = new WorkerTask("REGISTER_FILE_URL" /* REGISTER_FILE_URL */, [name, url, proto, directIO]);
      await this.postTask(task);
    }
    /** Register an empty file buffer. */
    async registerEmptyFileBuffer(name) {
      const task = new WorkerTask(
        "REGISTER_FILE_BUFFER" /* REGISTER_FILE_BUFFER */,
        [name, new Uint8Array()]
      );
      await this.postTask(task);
    }
    /** Register a file buffer. */
    async registerFileBuffer(name, buffer) {
      const task = new WorkerTask(
        "REGISTER_FILE_BUFFER" /* REGISTER_FILE_BUFFER */,
        [name, buffer]
      );
      await this.postTask(task, [buffer.buffer]);
    }
    /** Register a file handle. */
    async registerFileHandle(name, handle, protocol, directIO) {
      const task = new WorkerTask("REGISTER_FILE_HANDLE" /* REGISTER_FILE_HANDLE */, [name, handle, protocol, directIO]);
      await this.postTask(task, []);
    }
    /** Enable file statistics */
    async collectFileStatistics(name, enable) {
      const task = new WorkerTask(
        "COLLECT_FILE_STATISTICS" /* COLLECT_FILE_STATISTICS */,
        [name, enable]
      );
      await this.postTask(task, []);
    }
    /** Export file statistics */
    async exportFileStatistics(name) {
      const task = new WorkerTask(
        "EXPORT_FILE_STATISTICS" /* EXPORT_FILE_STATISTICS */,
        name
      );
      return await this.postTask(task, []);
    }
    /** Copy a file to a buffer. */
    async copyFileToBuffer(name) {
      const task = new WorkerTask(
        "COPY_FILE_TO_BUFFER" /* COPY_FILE_TO_BUFFER */,
        name
      );
      return await this.postTask(task);
    }
    /** Copy a file to a path. */
    async copyFileToPath(name, path) {
      const task = new WorkerTask(
        "COPY_FILE_TO_PATH" /* COPY_FILE_TO_PATH */,
        [name, path]
      );
      await this.postTask(task);
    }
    /** Insert arrow from an ipc stream */
    async insertArrowFromIPCStream(conn, buffer, options) {
      if (buffer.length == 0)
        return;
      const task = new WorkerTask("INSERT_ARROW_FROM_IPC_STREAM" /* INSERT_ARROW_FROM_IPC_STREAM */, [conn, buffer, options]);
      await this.postTask(task, [buffer.buffer]);
    }
    /** Insert a csv file */
    async insertCSVFromPath(conn, path, options) {
      if (options.columns !== void 0) {
        const out = [];
        for (const k in options.columns) {
          const type = options.columns[k];
          out.push(arrowToSQLField(k, type));
        }
        options.columnsFlat = out;
        delete options.columns;
      }
      const task = new WorkerTask(
        "IMPORT_CSV_FROM_PATH" /* INSERT_CSV_FROM_PATH */,
        [conn, path, options]
      );
      await this.postTask(task);
    }
    /** Insert a json file */
    async insertJSONFromPath(conn, path, options) {
      if (options.columns !== void 0) {
        const out = [];
        for (const k in options.columns) {
          const type = options.columns[k];
          out.push(arrowToSQLField(k, type));
        }
        options.columnsFlat = out;
        delete options.columns;
      }
      const task = new WorkerTask(
        "IMPORT_JSON_FROM_PATH" /* INSERT_JSON_FROM_PATH */,
        [conn, path, options]
      );
      await this.postTask(task);
    }
  };

  // src/worker.ts
  var import_web_worker = __toESM(require_browser());
  async function createWorker(url) {
    const request = new Request(url);
    const workerScript = await fetch(request);
    const workerURL = URL.createObjectURL(await workerScript.blob());
    return new import_web_worker.default(workerURL);
  }

  // test/all_types.test.ts
  var MINIMUM_DATE_STR = "-271821-04-20";
  var MINIMUM_DATE = new Date(Date.UTC(-271821, 3, 20));
  var MAXIMUM_DATE_STR = "275760-09-13";
  var MAXIMUM_DATE = new Date(Date.UTC(275760, 8, 13));
  var NOT_IMPLEMENTED_TYPES = [
    "timestamp_s",
    "timestamp_ms",
    "timestamp_ns",
    "time_tz",
    "timestamp_tz",
    "hugeint",
    "dec_18_6",
    "dec38_10",
    "uuid",
    "map",
    "json",
    "date_array",
    "timestamp_array",
    "timestamptz_array"
  ];
  var PARTIALLY_IMPLEMENTED_TYPES = ["date", "timestamp"];
  var PARTIALLY_IMPLEMENTED_ANSWER_MAP = {
    date: [MINIMUM_DATE.valueOf(), MAXIMUM_DATE.valueOf(), null],
    timestamp: [MINIMUM_DATE.valueOf(), MAXIMUM_DATE.valueOf(), null]
  };
  var PARTIALLY_IMPLEMENTED_TYPES_SUBSTITUTIONS = [
    `(SELECT array_extract(['${MINIMUM_DATE_STR}'::Date,'${MAXIMUM_DATE_STR}'::Date,null],i + 1)) as date`,
    `(SELECT array_extract(['${MINIMUM_DATE_STR}'::Timestamp,'${MAXIMUM_DATE_STR}'::Timestamp,null],i + 1)) as timestamp`
  ];
  var TYPES_REQUIRING_CUSTOM_CONFIG = ["dec_4_1", "dec_9_4"];
  var FULLY_IMPLEMENTED_ANSWER_MAP = {
    bool: [false, true, null],
    tinyint: [-128, 127, null],
    smallint: [-32768, 32767, null],
    int: [-2147483648, 2147483647, null],
    utinyint: [0, 255, null],
    usmallint: [0, 65535, null],
    uint: [0, 4294967295, null],
    ubigint: [BigInt(0), BigInt("18446744073709551615"), null],
    bigint: [BigInt("-9223372036854775808"), BigInt("9223372036854775807"), null],
    // Note that we multiply by thousand (and add 999 for the max) because the value returned by DuckDB is in microseconds,
    // whereas the Date object is in milliseconds.
    time: [BigInt(0), BigInt((/* @__PURE__ */ new Date("1970-01-01T23:59:59.999+00:00")).valueOf()) * BigInt(1e3) + BigInt(999), null],
    interval: [new Int32Array([0, 0]), new Int32Array([0, 0]), null],
    float: [-34028234663852886e22, 34028234663852886e22, null],
    double: [-17976931348623157e292, 17976931348623157e292, null],
    varchar: ["\u{1F986}\u{1F986}\u{1F986}\u{1F986}\u{1F986}\u{1F986}", "goo\0se", null],
    small_enum: ["DUCK_DUCK_ENUM", "GOOSE", null],
    medium_enum: ["enum_0", "enum_299", null],
    large_enum: ["enum_0", "enum_69999", null],
    int_array: [[], [42, 999, null, null, -42], null],
    double_array: [[], [42, NaN, Infinity, -Infinity, null, -42], null],
    varchar_array: [[], ["\u{1F986}\u{1F986}\u{1F986}\u{1F986}\u{1F986}\u{1F986}", "goose", null, ""], null],
    nested_int_array: [[], [[], [42, 999, null, null, -42], null, [], [42, 999, null, null, -42]], null],
    struct: ['{"a":null,"b":null}', '{"a":42,"b":"\u{1F986}\u{1F986}\u{1F986}\u{1F986}\u{1F986}\u{1F986}"}', null],
    struct_of_arrays: [
      '{"a":null,"b":null}',
      '{"a":[42,999,null,null,-42],"b":["\u{1F986}\u{1F986}\u{1F986}\u{1F986}\u{1F986}\u{1F986}","goose",null,""]}',
      null
    ],
    array_of_structs: [[], ['{"a":null,"b":null}', '{"a":42,"b":"\u{1F986}\u{1F986}\u{1F986}\u{1F986}\u{1F986}\u{1F986}"}', null], null],
    // XXX sometimes throws
    // map: ['{}', '{"key1":"🦆🦆🦆🦆🦆🦆","key2":"goose"}', null],
    blob: [
      Uint8Array.from([
        116,
        104,
        105,
        115,
        105,
        115,
        97,
        108,
        111,
        110,
        103,
        98,
        108,
        111,
        98,
        0,
        119,
        105,
        116,
        104,
        110,
        117,
        108,
        108,
        98,
        121,
        116,
        101,
        115
      ]),
      Uint8Array.from([0, 0, 0, 97]),
      null
    ]
  };
  var REPLACE_COLUMNS = PARTIALLY_IMPLEMENTED_TYPES.concat(NOT_IMPLEMENTED_TYPES).concat(TYPES_REQUIRING_CUSTOM_CONFIG);
  function unpack(v) {
    if (v === null)
      return null;
    if (v instanceof Vector) {
      const ret = Array.from(v.toArray());
      for (let i = 0; i < ret.length; i++) {
        if (!v.isValid(i)) {
          ret[i] = null;
        }
      }
      return unpack(ret);
    } else if (v instanceof Array) {
      const ret = [];
      for (let i = 0; i < v.length; i++) {
        ret[i] = unpack(v[i]);
      }
      return ret;
    } else if (v instanceof Uint8Array) {
      return v;
    } else if (v.toJSON instanceof Function) {
      return JSON.stringify(v.toJSON());
    }
    return v;
  }
  function getValue(x) {
    if (typeof x?.valueOf === "function") {
      return x.valueOf();
    } else {
      return x;
    }
  }
  var ALL_TYPES_TEST = [
    {
      name: "fully supported types",
      query: `SELECT * REPLACE('not_implemented' as map) FROM test_all_types()`,
      skip: REPLACE_COLUMNS,
      answerMap: FULLY_IMPLEMENTED_ANSWER_MAP,
      answerCount: REPLACE_COLUMNS.length + Object.keys(FULLY_IMPLEMENTED_ANSWER_MAP).length,
      queryConfig: null
    },
    {
      name: "partially supported types",
      query: `SELECT ${PARTIALLY_IMPLEMENTED_TYPES_SUBSTITUTIONS.join(", ")}
                FROM range(0, 3) tbl(i)`,
      skip: [],
      answerMap: PARTIALLY_IMPLEMENTED_ANSWER_MAP,
      answerCount: PARTIALLY_IMPLEMENTED_TYPES.length,
      queryConfig: null
    },
    {
      name: "types with custom config",
      query: `SELECT ${TYPES_REQUIRING_CUSTOM_CONFIG.join(",")} FROM test_all_types()`,
      skip: [],
      answerMap: {
        dec_4_1: [-999.9000000000001, 999.9000000000001, null],
        dec_9_4: [-99999.99990000001, 99999.99990000001, null]
      },
      answerCount: TYPES_REQUIRING_CUSTOM_CONFIG.length,
      queryConfig: {
        castDecimalToDouble: true
      }
    }
  ];
  function testAllTypes(db2) {
    let conn;
    beforeEach(() => {
      db2().flushFiles();
    });
    afterEach(() => {
      if (conn) {
        conn.close();
        conn = null;
      }
      db2().flushFiles();
      db2().dropFiles();
    });
    describe("Test All Types", () => {
      for (const test of ALL_TYPES_TEST) {
        it(test.name, () => {
          if (test.queryConfig)
            db2().open({ query: test.queryConfig });
          conn = db2().connect();
          const results = conn.query(test.query);
          expect(results.numCols).toEqual(test.answerCount);
          const skip = /* @__PURE__ */ new Map();
          for (const s of test.skip) {
            skip.set(s, true);
          }
          for (let i = 0; i < results.numCols; i++) {
            const name = results.schema.fields[i].name;
            if (name == "bit")
              continue;
            const col = results.getChildAt(i);
            if (skip.get(name))
              continue;
            expect(col).not.toBeNull();
            expect(col?.length).not.toEqual(0);
            expect(unpack(getValue(col.get(0)))).withContext(name).toEqual(test.answerMap[name][0]);
            expect(unpack(getValue(col.get(1)))).withContext(name).toEqual(test.answerMap[name][1]);
            expect(col.get(2)).withContext(name).toEqual(test.answerMap[name][2]);
          }
        });
      }
    });
  }
  function testAllTypesAsync(db2) {
    let conn = null;
    beforeEach(async () => {
      await db2().flushFiles();
    });
    afterEach(async () => {
      if (conn) {
        await conn.close();
        conn = null;
      }
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("Test All Types Async", () => {
      for (const test of ALL_TYPES_TEST) {
        it(test.name, async () => {
          if (test.queryConfig)
            db2().open({ query: test.queryConfig });
          conn = await db2().connect();
          const results = await conn.query(test.query);
          expect(results.numCols).toEqual(test.answerCount);
          const skip = /* @__PURE__ */ new Map();
          for (const s of test.skip) {
            skip.set(s, true);
          }
          for (let i = 0; i < results.numCols; i++) {
            const name = results.schema.fields[i].name;
            if (name == "bit")
              continue;
            const col = results.getChildAt(i);
            if (skip.get(name))
              continue;
            expect(col).not.toBeNull();
            expect(col?.length).not.toEqual(0);
            expect(Object.keys(test.answerMap)).toContain(name);
            expect(unpack(getValue(col.get(0)))).withContext(name + "|" + col?.toString() + "|[0]").toEqual(test.answerMap[name][0]);
            expect(unpack(getValue(col.get(1)))).withContext(name + "|" + col?.toString() + "|[1]").toEqual(test.answerMap[name][1]);
            expect(col.get(2)).withContext(name + "|" + col?.toString() + "|[2]").toEqual(test.answerMap[name][2]);
          }
        });
      }
    });
  }

  // test/httpfs_test.ts
  var BUCKET_NAME = "test-bucket";
  var ACCESS_KEY_ID = "S3RVER";
  var ACCESS_KEY_SECRET = "S3RVER";
  var S3_ENDPOINT = "http://localhost:4923";
  var S3_REGION = "eu-west-1";
  var setAwsConfig = async function(conn, type = 1 /* VALID */) {
    switch (type) {
      case 0 /* EMPTY */:
        await conn.query("SET s3_region='';");
        await conn.query("SET s3_access_key_id='';");
        await conn.query("SET s3_secret_access_key='';");
        await conn.query("SET s3_session_token='';");
        await conn.query(`SET s3_endpoint='${S3_ENDPOINT}';`);
        break;
      case 1 /* VALID */:
        await conn.query(`SET s3_region='${S3_REGION}';`);
        await conn.query(`SET s3_access_key_id='${ACCESS_KEY_ID}';`);
        await conn.query(`SET s3_secret_access_key='${ACCESS_KEY_SECRET}';`);
        await conn.query("SET s3_session_token='';");
        await conn.query(`SET s3_endpoint='${S3_ENDPOINT}';`);
        break;
      case 2 /* INVALID */:
        await conn.query("SET s3_region='a-very-remote-and-non-existent-s3-region';");
        await conn.query("SET s3_access_key_id='THISACCESSKEYIDISNOTVALID';");
        await conn.query("SET s3_secret_access_key='THISSECRETACCESSKEYISNOTVALID';");
        await conn.query("SET s3_session_token='INVALIDSESSIONTOKEN';");
        await conn.query(`SET s3_endpoint='${S3_ENDPOINT}';`);
        break;
    }
  };
  function testHTTPFS(sdb) {
    let conn;
    const getModule = function() {
      let module2 = null;
      conn.useUnsafe((bindings, con_number) => {
        module2 = bindings.mod;
      });
      expect(module2).toBeDefined();
      return module2;
    };
    const reset = async () => {
      sdb().reset();
      conn = sdb().connect();
    };
    beforeEach(async () => await reset());
    afterEach(async () => await reset());
    describe("HTTPFS", () => {
      it("s3 config is set correctly", async () => {
        const module2 = getModule();
        const globalFileInfo = runtime_browser_default.getGlobalFileInfo(module2);
        const cacheEpoch = globalFileInfo.cacheEpoch;
        expect(globalFileInfo?.s3Config).toBeDefined();
        expect(globalFileInfo?.s3Config?.region).toEqual("");
        expect(globalFileInfo?.s3Config?.accessKeyId).toEqual("");
        expect(globalFileInfo?.s3Config?.secretAccessKey).toEqual("");
        expect(globalFileInfo?.s3Config?.sessionToken).toEqual("");
        expect(globalFileInfo?.s3Config?.endpoint).toEqual("");
        conn.query("SET s3_region='a-very-remote-and-non-existent-s3-region';");
        conn.query("SET s3_access_key_id='THISACCESSKEYIDISNOTVALID';");
        conn.query("SET s3_secret_access_key='THISSECRETACCESSKEYISNOTVALID';");
        conn.query("SET s3_session_token='ANICESESSIONTOKEN';");
        conn.query("SET s3_endpoint='s3.some.sort.of.cloud';");
        const globalFileInfoUpdated = runtime_browser_default.getGlobalFileInfo(module2);
        expect(globalFileInfoUpdated?.s3Config).toBeDefined();
        expect(globalFileInfoUpdated?.cacheEpoch).toEqual(cacheEpoch + 5);
        const params = getS3Params(globalFileInfoUpdated?.s3Config, "s3://test-bucket/testfile.txt", "GET");
        expect(params.url).toEqual("/testfile.txt");
        expect(params.query).toEqual("");
        expect(params.host).toEqual("test-bucket.s3.some.sort.of.cloud");
        expect(params.region).toEqual("a-very-remote-and-non-existent-s3-region");
        expect(params.service).toEqual("s3");
        expect(params.method).toEqual("GET");
        expect(params.accessKeyId).toEqual("THISACCESSKEYIDISNOTVALID");
        expect(params.secretAccessKey).toEqual("THISSECRETACCESSKEYISNOTVALID");
        expect(params.sessionToken).toEqual("ANICESESSIONTOKEN");
        conn.query("SET s3_endpoint='http://localhost:1337';");
        const globalFileInfoFullHttpEndpoint = runtime_browser_default.getGlobalFileInfo(module2);
        const paramsFullHttpEndpoint = getS3Params(
          globalFileInfoFullHttpEndpoint?.s3Config,
          "s3://test-bucket/testfile.txt",
          "GET"
        );
        expect(paramsFullHttpEndpoint.host).toEqual("localhost:1337");
        await reset();
        const globalFileInfoCleared = runtime_browser_default.getGlobalFileInfo(module2);
        const paramsCleared = getS3Params(globalFileInfoCleared?.s3Config, "s3://test-bucket/testfile.txt", "GET");
        expect(paramsCleared.url).toEqual("/testfile.txt");
        expect(paramsCleared.query).toEqual("");
        expect(paramsCleared.host).toEqual("test-bucket.s3.amazonaws.com");
        expect(paramsCleared.region).toEqual("");
        expect(paramsCleared.service).toEqual("s3");
        expect(paramsCleared.method).toEqual("GET");
        expect(paramsCleared.accessKeyId).toEqual("");
        expect(paramsCleared.secretAccessKey).toEqual("");
        expect(paramsCleared.sessionToken).toEqual("");
      });
      it("url parsing is correct", () => {
        const module2 = getModule();
        conn.query("SET s3_endpoint='';");
        const globalFileInfoDefault = runtime_browser_default.getGlobalFileInfo(module2);
        expect(globalFileInfoDefault?.s3Config).toBeDefined();
        const defaultUrl = getHTTPUrl(globalFileInfoDefault?.s3Config, `s3://${BUCKET_NAME}/test-file.csv`);
        expect(defaultUrl).toEqual(`https://${BUCKET_NAME}.s3.amazonaws.com/test-file.csv`);
        conn.query("SET s3_endpoint='https://duckdblabs.com';");
        const globalFileInfoFullUrl = runtime_browser_default.getGlobalFileInfo(module2);
        expect(globalFileInfoFullUrl?.s3Config).toBeDefined();
        const fullUrl = getHTTPUrl(globalFileInfoFullUrl?.s3Config, `s3://${BUCKET_NAME}/test-file.csv`);
        expect(fullUrl).toEqual(`https://duckdblabs.com/${BUCKET_NAME}/test-file.csv`);
        conn.query("SET s3_endpoint='duckdblabs.com';");
        const globalFileInfoDomain = runtime_browser_default.getGlobalFileInfo(module2);
        expect(globalFileInfoDomain?.s3Config).toBeDefined();
        const domainOnlyUrl = getHTTPUrl(globalFileInfoDomain?.s3Config, `s3://${BUCKET_NAME}/test-file.csv`);
        expect(domainOnlyUrl).toEqual(`https://${BUCKET_NAME}.duckdblabs.com/test-file.csv`);
      });
      it("s3 helper passes validation", () => {
        const testParams1 = {
          url: "/",
          query: "",
          host: "my-precious-bucket.s3.amazonaws.com",
          region: "us-east-1",
          service: "s3",
          method: "GET",
          accessKeyId: "AKIAIOSFODNN7EXAMPLE",
          secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
          sessionToken: "",
          dateNow: "20150915",
          datetimeNow: "20150915T124500Z"
        };
        const result = createS3Headers(testParams1).get("Authorization");
        expect(result).toEqual(
          "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20150915/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=182072eb53d85c36b2d791a1fa46a12d23454ec1e921b02075c23aee40166d5a"
        );
        const canonical_query_string = "delimiter=%2F&encoding-type=url&list-type=2&prefix=";
        const testParams2 = {
          url: "/",
          query: canonical_query_string,
          host: "my-precious-bucket.s3.eu-west-1.amazonaws.com",
          region: "eu-west-1",
          service: "s3",
          method: "GET",
          accessKeyId: "ASIAYSPIOYDTHTBIITVC",
          secretAccessKey: "vs1BZPxSL2qVARBSg5vCMKJsavCoEPlo/HSHRaVe",
          sessionToken: "IQoJb3JpZ2luX2VjENX//////////wEaCWV1LXdlc3QtMSJHMEUCIQDfjzs9BYHrEXDMU/NR+PHV1uSTr7CSVSQdjKSfiPRLdgIgCCztF0VMbi9+uHHAfBVKhV4t9MlUrQg3VAOIsLxrWyoqlAIIHRAAGgw1ODk0MzQ4OTY2MTQiDOGl2DsYxENcKCbh+irxARe91faI+hwUhT60sMGRFg0GWefKnPclH4uRFzczrDOcJlAAaQRJ7KOsT8BrJlrY1jSgjkO7PkVjPp92vi6lJX77bg99MkUTJActiOKmd84XvAE5bFc/jFbqechtBjXzopAPkKsGuaqAhCenXnFt6cwq+LZikv/NJGVw7TRphLV+Aq9PSL9XwdzIgsW2qXwe1c3rxDNj53yStRZHVggdxJ0OgHx5v040c98gFphzSULHyg0OY6wmCMTYcswpb4kO2IIi6AiD9cY25TlwPKRKPi5CdBsTPnyTeW62u7PvwK0fTSy4ZuJUuGKQnH2cKmCXquEwoOHEiQY6nQH9fzY/EDGHMRxWWhxu0HiqIfsuFqC7GS0p0ToKQE+pzNsvVwMjZc+KILIDDQpdCWRIwu53I5PZy2Cvk+3y4XLvdZKQCsAKqeOc4c94UAS4NmUT7mCDOuRV0cLBVM8F0JYBGrUxyI+YoIvHhQWmnRLuKgTb5PkF7ZWrXBHFWG5/tZDOvBbbaCWTlRCL9b0Vpg5+BM/81xd8jChP4w83",
          dateNow: "20210904",
          datetimeNow: "20210904T121746Z"
        };
        const result2 = createS3Headers(testParams2).get("Authorization");
        expect(result2).toEqual(
          "AWS4-HMAC-SHA256 Credential=ASIAYSPIOYDTHTBIITVC/20210904/eu-west-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=4d9d6b59d7836b6485f6ad822de97be40287da30347d83042ea7fbed530dc4c0"
        );
        const testParams3 = {
          url: "/correct_auth_test.csv",
          query: "",
          host: "test-bucket-ceiveran.s3.amazonaws.com",
          region: "eu-west-1",
          service: "s3",
          method: "PUT",
          accessKeyId: "S3RVER",
          secretAccessKey: "S3RVER",
          sessionToken: "",
          dateNow: "20220121",
          datetimeNow: "20220121T141452Z"
        };
        const test3PayloadParams = {
          contentHash: "28a0cf6ac5c4cb73793091fe6ecc6a68bf90855ac9186158748158f50241bb0c",
          contentType: "text/data;charset=utf-8"
        };
        const result3 = createS3Headers(testParams3, test3PayloadParams).get("Authorization");
        expect(result3).toEqual(
          "AWS4-HMAC-SHA256 Credential=S3RVER/20220121/eu-west-1/s3/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=5d9a6cbfaa78a6d0f2ab7df0445e2f1cc9c80cd3655ac7de9e7219c036f23f02"
        );
        expect(uriEncode("/category=Books/")).toEqual("/category%3DBooks/");
        expect(uriEncode("/?category=Books&title=Ducks Retreat/")).toEqual(
          "/%3Fcategory%3DBooks%26title%3DDucks%20Retreat/"
        );
        expect(uriEncode("/?category=Books&title=Ducks Retreat/", true)).toEqual(
          "%2F%3Fcategory%3DBooks%26title%3DDucks%20Retreat%2F"
        );
      });
    });
  }
  function testHTTPFSAsync(adb2, resolveData2, baseDir) {
    let conn;
    const putTestFileToS3 = async function(fileName, format, test_data) {
      await adb2().registerFileBuffer("test_file.parquet", test_data);
      if (!conn) {
        conn = await adb2().connect();
      }
      await setAwsConfig(conn, 1 /* VALID */);
      await conn.query(`CREATE TABLE test_table AS (SELECT * FROM parquet_scan('test_file.parquet'));`);
      await conn.query(`COPY test_table TO 's3://${BUCKET_NAME}/${fileName}.${format}' (FORMAT '${format}');`);
      await adb2().flushFiles();
      await adb2().dropFiles();
    };
    const assertTestFileResultCorrect = async function(result, test_data) {
      await adb2().registerFileBuffer("test_file_baseline.parquet", test_data);
      await conn.query(`SELECT * FROM parquet_scan('test_file_baseline.parquet');`);
    };
    const reset = async () => {
      await adb2().reset();
      conn = await adb2().connect();
    };
    beforeEach(async () => await reset());
    afterEach(async () => await reset());
    describe("HTTPFS Async", () => {
      it("can fetch https file", async () => {
        const results = await conn.query(
          `select * from "https://raw.githubusercontent.com/duckdb/duckdb-wasm/main/data/test.csv";`
        );
        expect(BigInt(results.getChildAt(2)?.get(2))).toEqual(BigInt(9n));
      });
      it("can read and write csv file from S3 with correct auth credentials", async () => {
        let data = await resolveData2("/uni/studenten.parquet");
        await setAwsConfig(conn);
        await putTestFileToS3("correct_auth_test", "csv", data);
        const results_with_auth = await conn.query(`select * from "s3://${BUCKET_NAME}/correct_auth_test.csv";`);
        data = await resolveData2("/uni/studenten.parquet");
        assertTestFileResultCorrect(results_with_auth, data);
      });
      it("can read and write parquet file from S3 with correct auth credentials", async () => {
        let data = await resolveData2("/uni/studenten.parquet");
        await putTestFileToS3("correct_auth_test", "parquet", data);
        await setAwsConfig(conn);
        const results_with_auth = await conn.query(
          `select * from "s3://${BUCKET_NAME}/correct_auth_test.parquet";`
        );
        data = await resolveData2("/uni/studenten.parquet");
        assertTestFileResultCorrect(results_with_auth, data);
      });
      it("can not read a file with incorrect credentials", async () => {
        const data = await resolveData2("/uni/studenten.parquet");
        await putTestFileToS3("incorrect_auth_test", "parquet", data);
        await setAwsConfig(conn, 2 /* INVALID */);
        await expectAsync(
          conn.query(`select * from "s3://${BUCKET_NAME}/incorrect_auth_test.csv";`)
        ).toBeRejected();
      });
      it("properly invalidates file caches on settings update.", async () => {
        const data = await resolveData2("/tpch/0_01/parquet/lineitem.parquet");
        await putTestFileToS3("file_cache_invalidation_test", "parquet", data);
        await setAwsConfig(conn);
        const results_correct = await conn.query(
          `select l_partkey from "s3://${BUCKET_NAME}/file_cache_invalidation_test.parquet" limit 1;`
        );
        expect(results_correct.getChildAt(0)?.get(0)).toEqual(1552);
        await setAwsConfig(conn, 2 /* INVALID */);
        await expectAsync(
          conn.query(`select avg(l_partkey) from "s3://${BUCKET_NAME}/lineitem.parquet";`)
        ).toBeRejected();
      });
      it("write after read throws incorrect flag error without dropping files", async () => {
        await setAwsConfig(conn);
        await conn.query(
          `COPY (SELECT * FROM range(1000,1010) tbl(i)) TO 's3://${BUCKET_NAME}/test_written.csv' (FORMAT 'csv');`
        );
        const result = await conn.query(`SELECT * FROM "s3://${BUCKET_NAME}/test_written.csv";`);
        expect(Number(result.getChildAt(0)?.get(6))).toEqual(Number(1006));
        await expectAsync(
          conn.query(
            `COPY (SELECT * FROM range(2000,2010) tbl(i)) TO 's3://${BUCKET_NAME}/test_written.csv' (FORMAT 'csv');`
          )
        ).toBeRejectedWithError("Invalid Error: File is not opened in write mode");
      });
    });
  }

  // test/bindings.test.ts
  function testBindings(db2, baseURL2) {
    let conn;
    beforeEach(() => {
      conn = db2().connect();
    });
    afterEach(() => {
      conn.close();
      db2().flushFiles();
      db2().dropFiles();
    });
    describe("DuckDBBindings", () => {
      describe("error handling", () => {
        it("INVALID SQL", async () => {
          let error = null;
          try {
            await conn.send("INVALID");
          } catch (e) {
            error = e;
          }
          expect(error).not.toBe(null);
        });
      });
      describe("Check version", () => {
        it("Version check", async () => {
          await db2().reset();
          conn = db2().connect();
          const version = conn.query(
            "select * from (select version()) where version() != 'v0.0.1-dev0';"
          );
          const rows = version.toArray();
          expect(rows.length).toEqual(1);
          await db2().reset();
        });
      });
      describe("Check platform", () => {
        it("Platform check", async () => {
          await db2().reset();
          conn = db2().connect();
          const version = conn.query(
            "PRAGMA platform;"
          );
          const rows = version.getChildAt(0)?.toArray();
          expect(rows.length).toEqual(1);
          expect(rows[0].toString().substr(0, 5)).toEqual("wasm_");
          await db2().reset();
        });
      });
      describe("Reset", () => {
        it("table must disappear", async () => {
          await db2().reset();
          conn = db2().connect();
          conn.query("CREATE TABLE foo (a int)");
          let table = conn.query("PRAGMA show_tables;");
          let rows = table.toArray();
          expect(rows.length).toEqual(1);
          expect(rows[0]?.name).toEqual("foo");
          await db2().reset();
          conn = db2().connect();
          table = conn.query("PRAGMA show_tables;");
          rows = table.toArray();
          expect(rows.length).toEqual(0);
        });
      });
      describe("Prepared Statement", () => {
        it("Materialized", async () => {
          const stmt = conn.prepare("SELECT v::INTEGER + ? AS v FROM generate_series(0, 10000) as t(v);");
          const result = stmt.query(234);
          expect(result.numRows).toBe(10001);
          stmt.close();
        });
        it("Streaming", async () => {
          const stmt = conn.prepare("SELECT v::INTEGER + ? AS v FROM generate_series(0, 10000) as t(v);");
          const stream = stmt.send(234);
          let size = 0;
          for (const batch of stream) {
            size += batch.numRows;
          }
          expect(size).toBe(10001);
          conn.close();
        });
        it("Typecheck", async () => {
          conn.query(`CREATE TABLE typecheck (
                    a BOOLEAN DEFAULT NULL,
                    b TINYINT DEFAULT NULL,
                    c SMALLINT DEFAULT NULL,
                    d INTEGER DEFAULT NULL,
                    e BIGINT DEFAULT NULL,
                    f FLOAT DEFAULT NULL,
                    g DOUBLE DEFAULT NULL,
                    h CHAR(11) DEFAULT NULL,
                    i VARCHAR(11) DEFAULT NULL
                )`);
          const stmt = conn.prepare("INSERT INTO typecheck VALUES(?,?,?,?,?,?,?,?,?)");
          expect(
            () => stmt.query(true, 100, 1e4, 1e6, 5e9, 0.5, Math.PI, "hello world", "hi")
          ).not.toThrow();
          expect(
            () => stmt.query(
              "test",
              // varchar for bool
              100,
              1e4,
              1e6,
              5e9,
              0.5,
              Math.PI,
              "hello world",
              "hi"
            )
          ).toThrow();
          expect(
            () => stmt.query(
              true,
              1e4,
              // smallint for tinyint
              1e4,
              1e6,
              5e9,
              0.5,
              Math.PI,
              "hello world",
              "hi"
            )
          ).toThrow();
          expect(
            () => stmt.query(
              true,
              100,
              1e6,
              // int for smallint
              1e6,
              5e9,
              0.5,
              Math.PI,
              "hello world",
              "hi"
            )
          ).toThrow();
          expect(
            () => stmt.query(
              true,
              100,
              1e4,
              5e9,
              // bigint for int
              5e9,
              0.5,
              Math.PI,
              "hello world",
              "hi"
            )
          ).toThrow();
          conn.close();
        });
      });
    });
  }
  function testAsyncBindings(adb2, baseURL2, baseDirProto) {
    beforeEach(async () => {
    });
    afterEach(async () => {
      await adb2().flushFiles();
      await adb2().dropFiles();
      await adb2().open({
        path: ":memory:"
      });
    });
    describe("Bindings", () => {
      describe("Open", () => {
        it("Remote TPCH 0_01", async () => {
          await adb2().registerFileURL("tpch_0_01.db", `${baseURL2}/tpch/0_01/duckdb/db`, baseDirProto, false);
          await adb2().open({
            path: "tpch_0_01.db"
          });
        });
      });
      describe("Patching", () => {
        it("Count(*) Default", async () => {
          await adb2().open({
            path: ":memory:",
            query: {
              castBigIntToDouble: false
            }
          });
          const conn = await adb2().connect();
          const table = await conn.query("select 1::BIGINT");
          expect(table.schema.fields.length).toEqual(1);
          expect(table.schema.fields[0].typeId).toEqual(Type.Int);
        });
        it("Count(*) No BigInt", async () => {
          await adb2().open({
            path: ":memory:",
            query: {
              castBigIntToDouble: true
            }
          });
          const conn = await adb2().connect();
          const table = await conn.query("select 1::BIGINT");
          expect(table.schema.fields.length).toEqual(1);
          expect(table.schema.fields[0].typeId).toEqual(Type.Float);
        });
      });
      describe("Prepared Statement", () => {
        it("Materialized", async () => {
          const conn = await adb2().connect();
          const stmt = await conn.prepare("SELECT v + ? FROM generate_series(0, 10000) as t(v);");
          const result = await stmt.query(234);
          expect(result.numRows).toBe(10001);
          await stmt.close();
        });
        it("Streaming", async () => {
          const conn = await adb2().connect();
          const stmt = await conn.prepare("SELECT v::INTEGER + ? AS v FROM generate_series(0, 10000) as t(v);");
          const stream = await stmt.send(234);
          let size = 0;
          for await (const batch of stream) {
            size += batch.numRows;
          }
          expect(size).toBe(10001);
          await conn.close();
        });
        it("Typecheck", async () => {
          const conn = await adb2().connect();
          await conn.query(`CREATE TABLE typecheck (
                    a BOOLEAN DEFAULT NULL,
                    b TINYINT DEFAULT NULL,
                    c SMALLINT DEFAULT NULL,
                    d INTEGER DEFAULT NULL,
                    e BIGINT DEFAULT NULL,
                    f FLOAT DEFAULT NULL,
                    g DOUBLE DEFAULT NULL,
                    h CHAR(11) DEFAULT NULL,
                    i VARCHAR(11) DEFAULT NULL
                )`);
          const stmt = await conn.prepare("INSERT INTO typecheck VALUES(?,?,?,?,?,?,?,?,?)");
          const expectToThrow = async (fn) => {
            let throwed = false;
            try {
              await fn();
            } catch (e) {
              throwed = true;
            }
            expect(throwed).toBe(true);
          };
          expectToThrow(async () => {
            await stmt.query(
              "test",
              // varchar for bool
              100,
              1e4,
              1e6,
              5e9,
              0.5,
              Math.PI,
              "hello world",
              "hi"
            );
          });
          expectToThrow(async () => {
            await stmt.query(
              true,
              1e4,
              // smallint for tinyint
              1e4,
              1e6,
              5e9,
              0.5,
              Math.PI,
              "hello world",
              "hi"
            );
          });
          expectToThrow(async () => {
            await stmt.query(
              true,
              100,
              1e6,
              // int for smallint
              1e6,
              5e9,
              0.5,
              Math.PI,
              "hello world",
              "hi"
            );
          });
          expectToThrow(async () => {
            await stmt.query(
              true,
              100,
              1e4,
              5e9,
              // bigint for int
              5e9,
              0.5,
              Math.PI,
              "hello world",
              "hi"
            );
          });
          await conn.close();
        });
      });
      describe("AccessMode", () => {
        it("READ_ONLY", async () => {
          await expectAsync(
            adb2().open({
              accessMode: 2 /* READ_ONLY */
            })
          ).toBeRejectedWithError(/Cannot launch in-memory database in read-only mode/);
        });
        it("READ_WRITE", async () => {
          await expectAsync(
            adb2().open({
              accessMode: 3 /* READ_WRITE */
            })
          ).toBeResolved();
        });
      });
      describe("Cancellation", () => {
        it("hello cancel", async () => {
          await adb2().open({
            path: ":memory:",
            query: {
              queryPollingInterval: 0
            }
          });
          const conn = await adb2().connect();
          const result = await conn.useUnsafe(
            (db2, id) => db2.startPendingQuery(id, "SELECT SUM(i) FROM range(1000000) tbl(i);")
          );
          expect(result).toBeNull();
          const cancelOK = await conn.useUnsafe((db2, id) => db2.cancelPendingQuery(id));
          expect(cancelOK).toBeTrue();
          let polledHeader = null;
          let polledError = null;
          try {
            polledHeader = await conn.useUnsafe((db2, id) => db2.pollPendingQuery(id));
          } catch (e) {
            polledError = e;
          }
          expect(polledHeader).toBeNull();
          expect(polledError).not.toBeNull();
          expect(polledError.toString()).toEqual("Error: query was canceled");
          const canceledAgain = await conn.useUnsafe((db2, id) => db2.cancelPendingQuery(id));
          expect(canceledAgain).toBeFalse();
          const table = await conn.query("select 42::integer;");
          expect(table.schema.fields.length).toEqual(1);
        });
        it("noop cancel", async () => {
          await adb2().open({
            path: ":memory:",
            query: {
              queryPollingInterval: 0
            }
          });
          const conn = await adb2().connect();
          const result = await conn.useUnsafe(
            (db2, id) => db2.startPendingQuery(id, "SELECT SUM(i) FROM range(1000000) tbl(i);")
          );
          expect(result).toBeNull();
          let polledHeader = null;
          let polledError = null;
          try {
            while (polledHeader == null) {
              polledHeader = await conn.useUnsafe((db2, id) => db2.pollPendingQuery(id));
            }
          } catch (e) {
            polledError = e;
          }
          expect(polledHeader).not.toBeNull();
          expect(polledError).toBeNull();
          const cancelOK = await conn.useUnsafe((db2, id) => db2.cancelPendingQuery(id));
          expect(cancelOK).toBeFalse();
          const anotherOne = await conn.useUnsafe((db2, id) => db2.cancelPendingQuery(id));
          expect(anotherOne).toBeFalse();
        });
      });
    });
  }

  // test/batch_stream.test.ts
  var testRows = 1e4;
  function testBatchStream(db2) {
    let conn;
    beforeEach(() => {
      conn = db2().connect();
    });
    afterEach(() => {
      conn.close();
      db2().flushFiles();
      db2().dropFiles();
    });
    describe("Arrow Record-Batches Row-Major", () => {
      describe("single column", () => {
        it("TINYINT", async () => {
          const result = await conn.send(`
                    SELECT (v & 127)::TINYINT AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const row of batch) {
              expect(row.v).toBe(i++ & 127);
            }
          }
          expect(i).toBe(testRows + 1);
        });
        it("SMALLINT", async () => {
          const result = await conn.send(`
                    SELECT (v & 32767)::SMALLINT AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const row of batch) {
              expect(row.v).toBe(i++ & 32767);
            }
          }
          expect(i).toBe(testRows + 1);
        });
        it("INTEGER", async () => {
          const result = await conn.send(`
                    SELECT v::INTEGER AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const row of batch) {
              expect(row.v).toBe(i++);
            }
          }
          expect(i).toBe(testRows + 1);
        });
        it("BIGINT", async () => {
          const result = await conn.send(`
                    SELECT v::BIGINT AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const row of batch) {
              expect(row.v).toBe(BigInt(i++));
            }
          }
          expect(i).toBe(testRows + 1);
        });
        it("STRING", async () => {
          const result = await conn.send(`
                    SELECT v::VARCHAR AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const row of batch) {
              expect(row.v).toBe(String(i++));
            }
          }
          expect(i).toBe(testRows + 1);
        });
      });
    });
    describe("Arrow Record-Batches Column-Major", () => {
      describe("single column", () => {
        it("TINYINT", async () => {
          const result = await conn.send(`
                    SELECT (v & 127)::TINYINT AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(i++ & 127);
            }
          }
          expect(i).toBe(testRows + 1);
        });
        it("SMALLINT", async () => {
          const result = await conn.send(`
                    SELECT (v & 32767)::SMALLINT AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(i++ & 32767);
            }
          }
          expect(i).toBe(testRows + 1);
        });
        it("INTEGER", async () => {
          const result = await conn.send(`
                    SELECT v::INTEGER AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(i++);
            }
          }
          expect(i).toBe(testRows + 1);
        });
        it("BIGINT", async () => {
          const result = await conn.send(`
                    SELECT v::BIGINT AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(BigInt(i++));
            }
          }
          expect(i).toBe(testRows + 1);
        });
        it("STRING", async () => {
          const result = await conn.send(`
                    SELECT v::VARCHAR AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(String(i++));
            }
          }
          expect(i).toBe(testRows + 1);
        });
      });
    });
    describe("Arrow Table Row-Major", () => {
      describe("single column", () => {
        it("TINYINT", () => {
          const table = conn.query(`
                    SELECT (v & 127)::TINYINT AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const row of table) {
            expect(row?.v).toBe(i++ & 127);
          }
          expect(i).toBe(testRows + 1);
        });
        it("SMALLINT", () => {
          const table = conn.query(`
                    SELECT (v & 32767)::SMALLINT AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const row of table) {
            expect(row?.v).toBe(i++ & 32767);
          }
          expect(i).toBe(testRows + 1);
        });
        it("INTEGER", () => {
          const table = conn.query(`
                    SELECT v::INTEGER AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const row of table) {
            expect(row?.v).toBe(i++);
          }
          expect(i).toBe(testRows + 1);
        });
        it("BIGINT", () => {
          const table = conn.query(`
                    SELECT v::BIGINT AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const row of table) {
            expect(row?.v).toBe(BigInt(i++));
          }
          expect(i).toBe(testRows + 1);
        });
        it("STRING", () => {
          const table = conn.query(`
                    SELECT v::VARCHAR AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const row of table) {
            expect(row?.v.valueOf()).toBe(String(i++));
          }
          expect(i).toBe(testRows + 1);
        });
      });
    });
    describe("Arrow Table Column-Major", () => {
      describe("single column", () => {
        it("TINYINT", () => {
          const table = conn.query(`
                    SELECT (v & 127)::TINYINT AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const v of table.getChildAt(0)) {
            expect(v).toBe(i++ & 127);
          }
          expect(i).toBe(testRows + 1);
        });
        it("SMALLINT", () => {
          const table = conn.query(`
                    SELECT (v & 32767)::SMALLINT AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const v of table.getChildAt(0)) {
            expect(v).toBe(i++ & 32767);
          }
          expect(i).toBe(testRows + 1);
        });
        it("INTEGER", () => {
          const table = conn.query(`
                    SELECT v::INTEGER AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const v of table.getChildAt(0)) {
            expect(v).toBe(i++);
          }
          expect(i).toBe(testRows + 1);
        });
        it("BIGINT", () => {
          const table = conn.query(`
                    SELECT v::BIGINT AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const v of table.getChildAt(0)) {
            expect(v).toBe(BigInt(i++));
          }
          expect(i).toBe(testRows + 1);
        });
        it("STRING", () => {
          const table = conn.query(`
                    SELECT v::VARCHAR AS v FROM generate_series(0, ${testRows}) as t(v);
                `);
          let i = 0;
          for (const v of table.getChildAt(0)) {
            expect(v).toBe(String(i++));
          }
          expect(i).toBe(testRows + 1);
        });
      });
    });
  }

  // test/batch_stream_async.test.ts
  var testRows2 = 1e4;
  function testAsyncBatchStream(db2) {
    let conn;
    beforeEach(async () => {
      conn = await db2().connect();
    });
    afterEach(async () => {
      await conn.close();
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("AsyncDuckDB", () => {
      it("ping", async () => {
        await db2().ping();
      });
    });
    describe("Arrow Record-Batches Row-Major", () => {
      describe("single column", () => {
        it("TINYINT", async () => {
          const result = await conn.send(`
                    SELECT (v & 127)::TINYINT AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for await (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const row of batch) {
              expect(row.v).toBe(i++ & 127);
            }
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("SMALLINT", async () => {
          const result = await conn.send(`
                    SELECT (v & 32767)::SMALLINT AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for await (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(i++ & 32767);
            }
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("INTEGER", async () => {
          const result = await conn.send(`
                    SELECT v::INTEGER AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for await (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(i++);
            }
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("BIGINT", async () => {
          const result = await conn.send(`
                    SELECT v::BIGINT AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for await (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(BigInt(i++));
            }
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("STRING", async () => {
          const result = await conn.send(`
                    SELECT v::VARCHAR AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for await (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(String(i++));
            }
          }
          expect(i).toBe(testRows2 + 1);
        });
      });
      describe("scripts", () => {
        it("test1", async () => {
          const result = await conn.send(`
                    SELECT v::INTEGER AS x, (sin(v) * 100 + 100)::INTEGER AS y FROM generate_series(0, ${testRows2}) as t(v)
                `);
          let i = 0;
          for await (const batch of result) {
            expect(batch.numCols).toBe(2);
            for (const row of batch) {
              expect(row.x).toBe(i++);
            }
          }
          expect(i).toBe(testRows2 + 1);
        });
      });
    });
    describe("Arrow Record-Batches Column-Major", () => {
      describe("single column", () => {
        it("TINYINT", async () => {
          const result = await conn.send(`
                    SELECT (v & 127)::TINYINT AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for await (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(i++ & 127);
            }
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("SMALLINT", async () => {
          const result = await conn.send(`
                    SELECT (v & 32767)::SMALLINT AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for await (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(i++ & 32767);
            }
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("INTEGER", async () => {
          const result = await conn.send(`
                    SELECT v::INTEGER AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for await (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(i++);
            }
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("BIGINT", async () => {
          const result = await conn.send(`
                    SELECT v::BIGINT AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for await (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(BigInt(i++));
            }
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("STRING", async () => {
          const result = await conn.send(`
                    SELECT v::VARCHAR AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for await (const batch of result) {
            expect(batch.numCols).toBe(1);
            for (const v of batch.getChildAt(0)) {
              expect(v).toBe(String(i++));
            }
          }
          expect(i).toBe(testRows2 + 1);
        });
      });
    });
    describe("Arrow Table Row-Major", () => {
      describe("single column", () => {
        it("TINYINT", async () => {
          const table = await conn.query(`
                    SELECT (v & 127)::TINYINT AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for (const row of table) {
            expect(row?.v).toBe(i++ & 127);
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("SMALLINT", async () => {
          const table = await conn.query(`
                    SELECT (v & 32767)::SMALLINT AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for (const row of table) {
            expect(row?.v).toBe(i++ & 32767);
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("INTEGER", async () => {
          const table = await conn.query(`
                    SELECT v::INTEGER AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for (const row of table) {
            expect(row?.v).toBe(i++);
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("BIGINT", async () => {
          const table = await conn.query(`
                    SELECT v::BIGINT AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for (const row of table) {
            expect(row?.v).toBe(BigInt(i++));
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("STRING", async () => {
          const table = await conn.query(`
                    SELECT v::VARCHAR AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for (const row of table) {
            expect(row?.v.valueOf()).toBe(String(i++));
          }
          expect(i).toBe(testRows2 + 1);
        });
      });
    });
    describe("Arrow Table Column-Major", () => {
      describe("single column", () => {
        it("TINYINT", async () => {
          const table = await conn.query(`
                    SELECT (v & 127)::TINYINT AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for (const v of table.getChildAt(0)) {
            expect(v).toBe(i++ & 127);
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("SMALLINT", async () => {
          const table = await conn.query(`
                    SELECT (v & 32767)::SMALLINT AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for (const v of table.getChildAt(0)) {
            expect(v).toBe(i++ & 32767);
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("INTEGER", async () => {
          const table = await conn.query(`
                    SELECT v::INTEGER AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for (const v of table.getChildAt(0)) {
            expect(v).toBe(i++);
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("BIGINT", async () => {
          const table = await conn.query(`
                    SELECT v::BIGINT AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for (const v of table.getChildAt(0)) {
            expect(v).toBe(BigInt(i++));
          }
          expect(i).toBe(testRows2 + 1);
        });
        it("STRING", async () => {
          const table = await conn.query(`
                    SELECT v::VARCHAR AS v FROM generate_series(0, ${testRows2}) as t(v);
                `);
          let i = 0;
          for (const v of table.getChildAt(0)) {
            expect(v).toBe(String(i++));
          }
          expect(i).toBe(testRows2 + 1);
        });
      });
    });
  }

  // test/filesystem.test.ts
  var decoder2 = new TextDecoder();
  function testFilesystem(db2, resolveData2, baseDir, baseDirProto) {
    let conn;
    beforeEach(async () => {
      conn = await db2().connect();
    });
    afterEach(async () => {
      await conn.close();
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("File buffer registration", () => {
      const test = async () => {
        const result = await conn.send(`SELECT matrnr FROM parquet_scan('studenten.parquet');`);
        const batches = [];
        for await (const batch of result) {
          batches.push(batch);
        }
        const table = await new Table(batches);
        expect(table.getChildAt(0)?.toArray()).toEqual(
          new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555])
        );
      };
      it("File buffer used once", async () => {
        const students = await resolveData2("/uni/studenten.parquet");
        expect(students).not.toBeNull();
        await db2().registerFileBuffer("studenten.parquet", students);
        await test();
      });
      it("File buffer registered twice", async () => {
        const students0 = await resolveData2("/uni/studenten.parquet");
        const students1 = await resolveData2("/uni/studenten.parquet");
        expect(students0).not.toBeNull();
        expect(students1).not.toBeNull();
        await db2().registerFileBuffer("studenten.parquet", students0);
        await test();
        await db2().registerFileBuffer("studenten.parquet", students1);
        await test();
      });
      it("File buffer used twice", async () => {
        const students = await resolveData2("/uni/studenten.parquet");
        expect(students).not.toBeNull();
        await db2().registerFileBuffer("studenten.parquet", students);
        await test();
        await test();
      });
    });
    describe("Parquet Scans", () => {
      it("single table from buffer", async () => {
        const students = await resolveData2("/uni/studenten.parquet");
        expect(students).not.toBeNull();
        await db2().registerFileBuffer("studenten.parquet", students);
        const result = await conn.send(`SELECT matrnr FROM parquet_scan('studenten.parquet');`);
        const batches = [];
        for await (const batch of result) {
          batches.push(batch);
        }
        const table = await new Table(batches);
        expect(table.getChildAt(0)?.toArray()).toEqual(
          new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555])
        );
      });
      it("simple join", async () => {
        const students = await resolveData2("/uni/studenten.parquet");
        const hoeren = await resolveData2("/uni/hoeren.parquet");
        const vorlesungen = await resolveData2("/uni/vorlesungen.parquet");
        expect(students).not.toBeNull();
        expect(hoeren).not.toBeNull();
        expect(vorlesungen).not.toBeNull();
        await db2().registerFileBuffer("studenten.parquet", students);
        await db2().registerFileBuffer("hoeren.parquet", hoeren);
        await db2().registerFileBuffer("vorlesungen.parquet", vorlesungen);
        const result = await conn.send(`
                    SELECT students.matrnr, vorlesungen.titel
                    FROM parquet_scan('studenten.parquet') students
                    INNER JOIN parquet_scan('hoeren.parquet') hoeren ON (students.matrnr = hoeren.matrnr)
                    INNER JOIN parquet_scan('vorlesungen.parquet') vorlesungen ON (vorlesungen.vorlnr = hoeren.vorlnr);
                `);
        const batches = [];
        for await (const batch of result) {
          batches.push(batch);
        }
        const table = await new Table(batches);
        expect(table.numCols).toBe(2);
        const flat = [];
        for (const row of table) {
          flat.push({
            matrnr: row?.matrnr,
            titel: row?.titel?.toString()
          });
        }
        expect(flat).toEqual([
          { matrnr: 26120, titel: "Grundz\xFCge" },
          { matrnr: 27550, titel: "Grundz\xFCge" },
          { matrnr: 27550, titel: "Logik" },
          { matrnr: 28106, titel: "Ethik" },
          { matrnr: 28106, titel: "Wissenschaftstheorie" },
          { matrnr: 28106, titel: "Bioethik" },
          { matrnr: 28106, titel: "Der Wiener Kreis" },
          { matrnr: 29120, titel: "Grundz\xFCge" },
          { matrnr: 29120, titel: "Ethik" },
          { matrnr: 29120, titel: "M\xE4eutik" },
          { matrnr: 29555, titel: "Glaube und Wissen" },
          { matrnr: 25403, titel: "Glaube und Wissen" }
        ]);
      });
    });
    describe("Writing", () => {
      it("Copy To CSV Buffer", async () => {
        const students = await resolveData2("/uni/studenten.parquet");
        expect(students).not.toBeNull();
        await db2().registerFileBuffer("studenten.parquet", students);
        await db2().registerEmptyFileBuffer("students.csv");
        await conn.query(`CREATE TABLE students AS SELECT * FROM parquet_scan('studenten.parquet');`);
        await conn.query(`COPY students TO 'students.csv' WITH (HEADER 1, DELIMITER ';', FORMAT CSV);`);
        await conn.query(`DROP TABLE IF EXISTS students`);
        const outBuffer = await db2().copyFileToBuffer("students.csv");
        expect(outBuffer).not.toBeNull();
        const text = decoder2.decode(outBuffer);
        expect(text).toBe(`matrnr;name;semester
24002;Xenokrates;18
25403;Jonas;12
26120;Fichte;10
26830;Aristoxenos;8
27550;Schopenhauer;6
28106;Carnap;3
29120;Theophrastos;2
29555;Feuerbach;2
`);
      });
      it("Copy To Parquet", async () => {
        const students = await resolveData2("/uni/studenten.parquet");
        expect(students).not.toBeNull();
        await db2().registerFileBuffer("studenten.parquet", students);
        await db2().registerEmptyFileBuffer("students2.parquet");
        await conn.query(`CREATE TABLE students2 AS SELECT * FROM parquet_scan('studenten.parquet');`);
        await conn.query(`COPY students2 TO 'students2.parquet' (FORMAT PARQUET);`);
        const url = await db2().copyFileToBuffer("students2.parquet");
        expect(url).not.toBeNull();
      });
      it("Copy To Parquet And Load Again", async () => {
        const students = await resolveData2("/uni/studenten.parquet");
        expect(students).not.toBeNull();
        await db2().registerFileBuffer("studenten.parquet", students);
        await db2().registerEmptyFileBuffer("students3.parquet");
        await conn.query(`CREATE TABLE students3 AS SELECT * FROM parquet_scan('studenten.parquet');`);
        await conn.query(`COPY students3 TO 'students3.parquet' (FORMAT PARQUET);`);
        const url = await db2().copyFileToBuffer("students3.parquet");
        expect(url).not.toBeNull();
        await conn.query(`CREATE TABLE students4 AS SELECT * FROM parquet_scan('students3.parquet');`);
        const result = await conn.send(`SELECT matrnr FROM students4;`);
        const batches = [];
        for await (const batch of result) {
          batches.push(batch);
        }
        const table = await new Table(batches);
        expect(table.getChildAt(0)?.toArray()).toEqual(
          new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555])
        );
      });
    });
    describe("File access", () => {
      it("Small Parquet file", async () => {
        await db2().registerFileURL("studenten.parquet", `${baseDir}/uni/studenten.parquet`, baseDirProto, true);
        const result = await conn.send(`SELECT matrnr FROM parquet_scan('studenten.parquet');`);
        const batches = [];
        for await (const batch of result) {
          batches.push(batch);
        }
        const table = await new Table(batches);
        expect(table.getChildAt(0)?.toArray()).toEqual(
          new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555])
        );
      });
      it("Large Parquet file", async () => {
        await db2().registerFileURL(
          "lineitem.parquet",
          `${baseDir}/tpch/0_01/parquet/lineitem.parquet`,
          baseDirProto,
          true
        );
        const result = await conn.send(`SELECT count(*)::INTEGER as cnt FROM parquet_scan('lineitem.parquet');`);
        const batches = [];
        for await (const batch of result) {
          batches.push(batch);
        }
        const table = await new Table(batches);
        expect(table.getChildAt(0)?.get(0)).toBeGreaterThan(6e4);
      });
    });
    describe("Export", () => {
      it("Generate Series as CSV", async () => {
        await conn.query("CREATE TABLE foo AS SELECT * FROM generate_series(1, 5) t(v)");
        await conn.query(`EXPORT DATABASE '/tmp/duckdbexportcsv'`);
        const results = await db2().globFiles("/tmp/duckdbexportcsv/*");
        expect(results).not.toEqual([]);
        expect(results.length).toEqual(3);
        const filenames = results.map((file) => file.fileName).sort();
        expect(filenames).toEqual([
          "/tmp/duckdbexportcsv/foo.csv",
          "/tmp/duckdbexportcsv/load.sql",
          "/tmp/duckdbexportcsv/schema.sql"
        ]);
        const csv_buffer_utf8 = await db2().copyFileToBuffer("/tmp/duckdbexportcsv/foo.csv");
        const load_script_utf8 = await db2().copyFileToBuffer("/tmp/duckdbexportcsv/load.sql");
        const schema_script_utf8 = await db2().copyFileToBuffer("/tmp/duckdbexportcsv/schema.sql");
        expect(load_script_utf8.length).not.toEqual(0);
        expect(schema_script_utf8.length).not.toEqual(0);
        expect(csv_buffer_utf8.length).not.toEqual(0);
      });
      it("Generate Series as Parquet", async () => {
        await conn.query("CREATE TABLE foo AS SELECT * FROM generate_series(1, 5) t(v)");
        await conn.query(`EXPORT DATABASE '/tmp/duckdbexportparquet' (FORMAT PARQUET)`);
        const results = await db2().globFiles("/tmp/duckdbexportparquet/*");
        expect(results).not.toEqual([]);
        expect(results.length).toEqual(3);
        const filenames = results.map((file) => file.fileName).sort();
        expect(filenames).toEqual([
          "/tmp/duckdbexportparquet/foo.parquet",
          "/tmp/duckdbexportparquet/load.sql",
          "/tmp/duckdbexportparquet/schema.sql"
        ]);
        const parquet_buffer = await db2().copyFileToBuffer("/tmp/duckdbexportparquet/foo.parquet");
        const load_script_utf8 = await db2().copyFileToBuffer("/tmp/duckdbexportparquet/load.sql");
        const schema_script_utf8 = await db2().copyFileToBuffer("/tmp/duckdbexportparquet/schema.sql");
        expect(load_script_utf8.length).not.toEqual(0);
        expect(schema_script_utf8.length).not.toEqual(0);
        expect(parquet_buffer.length).not.toEqual(0);
        const content = await conn.query(
          `SELECT v::integer FROM parquet_scan('/tmp/duckdbexportparquet/foo.parquet')`
        );
        expect(content.nullCount).toEqual(0);
        expect(content.numRows).toEqual(5);
        expect(content.getChildAt(0)?.toArray()).toEqual(new Int32Array([1, 2, 3, 4, 5]));
      });
    });
    describe("Copy", () => {
      it("Generate Series as Parquet", async () => {
        await conn.query(
          `COPY (SELECT * FROM generate_series(1, 5) t(v)) TO '/tmp/duckdbcopytest.parquet' (FORMAT 'parquet')`
        );
        const results = await db2().globFiles("/tmp/duckdbcopytest*");
        expect(results).not.toEqual([]);
        expect(results.length).toEqual(1);
        const filenames = results.map((file) => file.fileName).sort();
        expect(filenames).toEqual(["/tmp/duckdbcopytest.parquet"]);
        const parquet_buffer = await db2().copyFileToBuffer("/tmp/duckdbcopytest.parquet");
        expect(parquet_buffer.length).not.toEqual(0);
        const content = await conn.query(`SELECT v::integer FROM parquet_scan('/tmp/duckdbcopytest.parquet')`);
        expect(content.numRows).toEqual(5);
        expect(content.getChildAt(0)?.toArray()).toEqual(new Int32Array([1, 2, 3, 4, 5]));
      });
    });
  }

  // test/table_test.ts
  function compareTable(table, expected) {
    const colCount = expected.length;
    expect(table.numCols).toEqual(colCount);
    if (colCount == 0)
      return;
    const rowCount = expected[0].values.length;
    for (let i = 0; i < colCount; ++i) {
      expect(expected[i].values.length).toEqual(rowCount);
      expect(table.getChildAt(i)?.length).toEqual(rowCount);
      expect(table.schema.fields[i]?.name).toEqual(expected[i].name);
    }
    for (let i = 0; i < colCount; ++i) {
      const col = table.getChildAt(i);
      const have = [];
      for (let j = 0; j < rowCount; ++j) {
        have.push(col.get(j));
      }
      expect(Number(have)).toEqual(Number(expected[i].values));
    }
  }

  // test/insert_arrow.test.ts
  var buildUtf8Array = (values) => {
    const builder = new Utf8Builder({
      type: new Utf8()
    });
    for (const v of values) {
      builder.append(v);
    }
    builder.finish();
    return builder.flush();
  };
  var ARROW_INSERT_TESTS = [
    {
      name: "integers_1",
      schema: new Schema2([
        new Field2("a", new Int32()),
        new Field2("b", new Int32()),
        new Field2("c", new Int32())
      ]),
      batches: [
        {
          numRows: 3,
          columns: [
            makeData({ type: new Int32(), data: new Int32Array([1, 4, 7]) }),
            makeData({ type: new Int32(), data: new Int32Array([2, 5, 8]) }),
            makeData({ type: new Int32(), data: new Int32Array([3, 6, 9]) })
          ]
        }
      ],
      options: {
        schema: "main",
        name: "foo"
      },
      query: "SELECT * FROM main.foo",
      expectedColumns: [
        { name: "a", values: [1, 4, 7] },
        { name: "b", values: [2, 5, 8] },
        { name: "c", values: [3, 6, 9] }
      ]
    },
    {
      name: "combined_1",
      schema: new Schema2([
        new Field2("a", new Int32()),
        new Field2("b", new Int16()),
        new Field2("c", new Utf8())
      ]),
      batches: [
        {
          numRows: 3,
          columns: [
            makeData({ type: new Int32(), data: new Int32Array([1, 4, 7]) }),
            makeData({ type: new Int16(), data: new Int16Array([2, 5, 8]) }),
            buildUtf8Array(["3", "6", "9"])
          ]
        }
      ],
      options: {
        schema: "main",
        name: "foo"
      },
      query: "SELECT * FROM main.foo",
      expectedColumns: [
        { name: "a", values: [1, 4, 7] },
        { name: "b", values: [2, 5, 8] },
        { name: "c", values: ["3", "6", "9"] }
      ]
    },
    {
      name: "combined_2",
      schema: new Schema2([
        new Field2("a", new Int32()),
        new Field2("b", new Int16()),
        new Field2("c", new Utf8())
      ]),
      batches: [
        {
          numRows: 3,
          columns: [
            makeData({ type: new Int32(), data: new Int32Array([1, 4, 7]) }),
            makeData({ type: new Int16(), data: new Int16Array([2, 5, 8]) }),
            buildUtf8Array(["3", "6", "9"])
          ]
        },
        {
          numRows: 2,
          columns: [
            makeData({ type: new Int32(), data: new Int32Array([10, 13]) }),
            makeData({ type: new Int16(), data: new Int16Array([11, 14]) }),
            buildUtf8Array(["12", "15"])
          ]
        }
      ],
      options: {
        schema: "main",
        name: "foo"
      },
      query: "SELECT * FROM main.foo",
      expectedColumns: [
        { name: "a", values: [1, 4, 7, 10, 13] },
        { name: "b", values: [2, 5, 8, 11, 14] },
        { name: "c", values: ["3", "6", "9", "12", "15"] }
      ]
    }
  ];
  function testArrowInsert(db2) {
    let conn;
    beforeEach(async () => {
      db2().flushFiles();
      conn = db2().connect();
    });
    afterEach(async () => {
      conn.close();
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("Arrow insert from iterable", () => {
      for (const test of ARROW_INSERT_TESTS) {
        it(test.name, () => {
          conn.query(`DROP TABLE IF EXISTS ${test.options.schema || "main"}.${test.options.name}`);
          const batches = test.batches.map((b) => {
            const data = makeData({
              type: new Struct(test.schema.fields),
              children: b.columns
            });
            return new RecordBatch(test.schema, data);
          });
          const table = new Table(test.schema, batches);
          conn.insertArrowTable(table, test.options);
          const results = conn.query(test.query);
          compareTable(results, test.expectedColumns);
        });
      }
    });
  }
  function testArrowInsertAsync(db2) {
    let conn;
    beforeEach(async () => {
      await db2().flushFiles();
      conn = await db2().connect();
    });
    afterEach(async () => {
      await conn.close();
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("Arrow async insert from iterable", () => {
      for (const test of ARROW_INSERT_TESTS) {
        it(test.name, async () => {
          await conn.query(`DROP TABLE IF EXISTS ${test.options.schema || "main"}.${test.options.name}`);
          const batches = test.batches.map((b) => {
            const data = makeData({
              type: new Struct(test.schema.fields),
              children: b.columns
            });
            return new RecordBatch(test.schema, data);
          });
          const table = new Table(test.schema, batches);
          await conn.insertArrowTable(table, test.options);
          const results = await conn.query(test.query);
          compareTable(results, test.expectedColumns);
        });
      }
    });
    describe("Arrow async insert from table", () => {
      it("simple integers", async () => {
        await conn.query(`DROP TABLE IF EXISTS insert_from_table`);
        const table = new Table({
          a: makeVector(new Int32Array([1, 4, 7])),
          b: makeVector(new Int32Array([2, 5, 8])),
          c: vectorFromArray(["3", "6", "9"])
        });
        await conn.insertArrowTable(table, {
          name: "insert_from_vectors"
        });
        const results = await conn.query("select * from insert_from_vectors");
        compareTable(results, [
          { name: "a", values: [1, 4, 7] },
          { name: "b", values: [2, 5, 8] },
          { name: "c", values: ["3", "6", "9"] }
        ]);
      });
    });
  }

  // test/insert_json.test.ts
  function describeBrowser(description, specDefinitions) {
    if (typeof window !== "undefined") {
      describe(description, specDefinitions);
    }
  }
  var encoder2 = new TextEncoder();
  var JSON_INSERT_TESTS = [
    {
      name: "rows_integers",
      input: `[
            {"a":1, "b":2, "c":3},
            {"a":4, "b":5, "c":6},
            {"a":7, "b":8, "c":9},
        ]`,
      options: {
        schema: "main",
        name: "foo"
      },
      query: "SELECT * FROM main.foo",
      expectedColumns: [
        { name: "a", values: [1, 4, 7] },
        { name: "b", values: [2, 5, 8] },
        { name: "c", values: [3, 6, 9] }
      ]
    },
    {
      name: "cols_integers",
      input: `{
            "a": [1, 4, 7],
            "b": [2, 5, 8],
            "c": [3, 6, 9]
        }`,
      options: {
        schema: "main",
        name: "foo"
      },
      query: "SELECT * FROM main.foo",
      expectedColumns: [
        { name: "a", values: [1, 4, 7] },
        { name: "b", values: [2, 5, 8] },
        { name: "c", values: [3, 6, 9] }
      ]
    },
    {
      name: "options_1",
      input: `[
            {"a":1, "b":2, "c":3},
            {"a":4, "b":5, "c":6},
            {"a":7, "b":8, "c":9},
        ]`,
      options: {
        schema: "main",
        name: "foo",
        shape: "row-array" /* ROW_ARRAY */,
        columns: {
          a: new Int16(),
          b: new Int32(),
          c: new Utf8()
        }
      },
      query: "SELECT * FROM main.foo",
      expectedColumns: [
        { name: "a", values: [1, 4, 7] },
        { name: "b", values: [2, 5, 8] },
        { name: "c", values: ["3", "6", "9"] }
      ]
    }
  ];
  var TEST_FILE = "TEST";
  function testJSONInsert(db2) {
    let conn;
    beforeEach(async () => {
      db2().flushFiles();
      conn = db2().connect();
    });
    afterEach(async () => {
      conn.close();
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("JSON Insert Sync", () => {
      for (const test of JSON_INSERT_TESTS) {
        it(test.name, () => {
          conn.query(`DROP TABLE IF EXISTS ${test.options.schema || "main"}.${test.options.name}`);
          const buffer = encoder2.encode(test.input);
          db2().registerFileBuffer(TEST_FILE, buffer);
          conn.insertJSONFromPath(TEST_FILE, test.options);
          const results = conn.query(test.query);
          compareTable(results, test.expectedColumns);
        });
      }
    });
  }
  function testJSONInsertAsync(db2) {
    let conn;
    beforeEach(async () => {
      await db2().flushFiles();
      conn = await db2().connect();
    });
    afterEach(async () => {
      await conn.close();
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("JSON Insert Buffer Async", () => {
      for (const test of JSON_INSERT_TESTS) {
        it(test.name, async () => {
          await conn.query(`DROP TABLE IF EXISTS ${test.options.schema || "main"}.${test.options.name}`);
          const buffer = encoder2.encode(test.input);
          await db2().registerFileBuffer(TEST_FILE, buffer);
          await conn.insertJSONFromPath(TEST_FILE, test.options);
          const results = await conn.query(test.query);
          compareTable(results, test.expectedColumns);
        });
      }
    });
    describeBrowser("JSON Insert Blob Async", () => {
      for (const test of JSON_INSERT_TESTS) {
        it(test.name, async () => {
          await conn.query(`DROP TABLE IF EXISTS ${test.options.schema || "main"}.${test.options.name}`);
          const buffer = encoder2.encode(test.input);
          const blob = new Blob([buffer]);
          await db2().registerFileHandle(TEST_FILE, blob, 2 /* BROWSER_FILEREADER */, false);
          await conn.insertJSONFromPath(TEST_FILE, test.options);
          const results = await conn.query(test.query);
          compareTable(results, test.expectedColumns);
        });
      }
    });
  }

  // test/insert_csv.test.ts
  function describeBrowser2(description, specDefinitions) {
    if (typeof window !== "undefined") {
      describe(description, specDefinitions);
    }
  }
  var encoder3 = new TextEncoder();
  var CSV_INSERT_TESTS = [
    {
      name: "integers_auto_1",
      input: `"a","b","c"
1,2,3
4,5,6
7,8,9
`,
      options: {
        schema: "main",
        name: "foo"
      },
      query: "SELECT * FROM main.foo",
      expectedColumns: [
        { name: "a", values: [1, 4, 7] },
        { name: "b", values: [2, 5, 8] },
        { name: "c", values: [3, 6, 9] }
      ]
    },
    {
      name: "integers_auto_2",
      input: `a,b,c
1,2,3
4,5,6
7,8,9
`,
      options: {
        schema: "main",
        name: "foo"
      },
      query: "SELECT * FROM main.foo",
      expectedColumns: [
        { name: "a", values: [1, 4, 7] },
        { name: "b", values: [2, 5, 8] },
        { name: "c", values: [3, 6, 9] }
      ]
    },
    {
      name: "integers_auto_3",
      input: `a,b,c`,
      options: {
        schema: "main",
        name: "foo"
      },
      query: "SELECT * FROM main.foo",
      expectedColumns: [
        { name: "column0", values: ["a"] },
        { name: "column1", values: ["b"] },
        { name: "column2", values: ["c"] }
      ]
    },
    {
      name: "integers_auto_2",
      input: `a
1
4
7
`,
      options: {
        schema: "main",
        name: "foo"
      },
      query: "SELECT * FROM main.foo",
      expectedColumns: [{ name: "a", values: [1, 4, 7] }]
    },
    {
      name: "options_1",
      input: `1,2,3
4,5,6
7,8,9
`,
      options: {
        schema: "main",
        name: "foo2",
        header: false,
        detect: false,
        columns: {
          a: new Int16(),
          b: new Int32(),
          c: new Utf8()
        }
      },
      query: "SELECT * FROM main.foo2",
      expectedColumns: [
        { name: "a", values: [1, 4, 7] },
        { name: "b", values: [2, 5, 8] },
        { name: "c", values: ["3", "6", "9"] }
      ]
    },
    {
      name: "options_2",
      input: `1|2|01/02/2020
4|5|01/03/2020
7|8|01/04/2020
`,
      options: {
        schema: "main",
        name: "foo",
        detect: false,
        header: false,
        delimiter: "|",
        dateFormat: "%m/%d/%Y",
        columns: {
          a: new Int16(),
          b: new Int32(),
          c: new DateDay()
        }
      },
      query: "SELECT * FROM main.foo",
      expectedColumns: [
        { name: "a", values: [1, 4, 7] },
        { name: "b", values: [2, 5, 8] },
        {
          name: "c",
          values: [
            new Date(Date.UTC(2020, 0, 2)),
            new Date(Date.UTC(2020, 0, 3)),
            new Date(Date.UTC(2020, 0, 4))
          ]
        }
      ]
    },
    {
      name: "options_3",
      input: `1|2|20:32:45 1992-03-02
4|5|20:32:50 1992-03-02
7|8|20:32:55 1992-03-02
`,
      options: {
        schema: "main",
        name: "foo",
        detect: false,
        header: false,
        delimiter: "|",
        quote: "'",
        timestampFormat: "%H:%M:%S %Y-%m-%d",
        columns: {
          a: new Int16(),
          b: new Int32(),
          c: new TimestampSecond()
        }
      },
      query: "SELECT * FROM main.foo",
      expectedColumns: [
        { name: "a", values: [1, 4, 7] },
        { name: "b", values: [2, 5, 8] },
        {
          name: "c",
          values: [
            new Date(Date.UTC(1992, 2, 2, 20, 32, 45)).getTime(),
            new Date(Date.UTC(1992, 2, 2, 20, 32, 50)).getTime(),
            new Date(Date.UTC(1992, 2, 2, 20, 32, 55)).getTime()
          ]
        }
      ]
    }
  ];
  var TEST_FILE2 = "TEST";
  function testCSVInsert(db2) {
    let conn;
    beforeEach(async () => {
      db2().flushFiles();
      conn = db2().connect();
    });
    afterEach(async () => {
      conn.close();
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("CSV Insert Sync", () => {
      for (const test of CSV_INSERT_TESTS) {
        it(test.name, () => {
          conn.query(`DROP TABLE IF EXISTS ${test.options.schema || "main"}.${test.options.name}`);
          const buffer = encoder3.encode(test.input);
          db2().registerFileBuffer(TEST_FILE2, buffer);
          conn.insertCSVFromPath(TEST_FILE2, test.options);
          const results = conn.query(test.query);
          compareTable(results, test.expectedColumns);
        });
      }
    });
  }
  function testCSVInsertAsync(db2) {
    let conn;
    beforeEach(async () => {
      await db2().flushFiles();
      conn = await db2().connect();
    });
    afterEach(async () => {
      await conn.close();
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("CSV Insert Buffer Async", () => {
      for (const test of CSV_INSERT_TESTS) {
        it(test.name, async () => {
          await conn.query(`DROP TABLE IF EXISTS ${test.options.schema || "main"}.${test.options.name}`);
          const buffer = encoder3.encode(test.input);
          await db2().registerFileBuffer(TEST_FILE2, buffer);
          await conn.insertCSVFromPath(TEST_FILE2, test.options);
          const results = await conn.query(test.query);
          compareTable(results, test.expectedColumns);
        });
      }
    });
    describeBrowser2("CSV Insert Blob Async", () => {
      for (const test of CSV_INSERT_TESTS) {
        it(test.name, async () => {
          await conn.query(`DROP TABLE IF EXISTS ${test.options.schema || "main"}.${test.options.name}`);
          const buffer = encoder3.encode(test.input);
          const blob = new Blob([buffer]);
          await db2().registerFileHandle(TEST_FILE2, blob, 2 /* BROWSER_FILEREADER */, false);
          await conn.insertCSVFromPath(TEST_FILE2, test.options);
          const results = await conn.query(test.query);
          compareTable(results, test.expectedColumns);
        });
      }
    });
  }

  // test/tokenizer.test.ts
  function testTokenization(db2) {
    describe("Tokenizer", () => {
      it("SELECT 1", async () => {
        expect(db2().tokenize("SELECT 1")).toEqual({
          offsets: [0, 7],
          types: [4, 1]
        });
      });
      it("SELECT * FROM region", async () => {
        expect(db2().tokenize("SELECT * FROM region")).toEqual({
          offsets: [0, 7, 9, 14],
          types: [4, 3, 4, 0]
        });
      });
    });
  }
  function testTokenizationAsync(db2) {
    describe("Tokenizer", () => {
      it("SELECT 1", async () => {
        expect(await db2().tokenize("SELECT 1")).toEqual({
          offsets: [0, 7],
          types: [4, 1]
        });
      });
      it("SELECT * FROM region", async () => {
        expect(await db2().tokenize("SELECT * FROM region")).toEqual({
          offsets: [0, 7, 9, 14],
          types: [4, 3, 4, 0]
        });
      });
    });
  }

  // test/tablenames.test.ts
  var TABLENAME_TESTS = [
    {
      name: "standard",
      input: "SELECT * FROM my_table",
      tables: ["my_table"]
    },
    {
      name: "fetch_specific",
      input: "SELECT col_a FROM my_table",
      tables: ["my_table"]
    },
    {
      name: "multiple_tables",
      input: "SELECT * FROM my_table1, my_table2, my_table3",
      tables: ["my_table1", "my_table2", "my_table3"]
    },
    {
      name: "same_table_multiple_times",
      input: "SELECT col_a FROM my_table, my_table m2, my_table m3",
      tables: ["my_table"]
    },
    {
      name: "subqueries",
      input: "SELECT * FROM (SELECT * FROM (SELECT * FROM my_table) bla) bla3",
      tables: ["my_table"]
    },
    {
      name: "join",
      input: "SELECT col_a FROM my_table JOIN my_table2 ON (my_table.col_b=my_table2.col_d)",
      tables: ["my_table", "my_table2"]
    },
    {
      name: "scalar_subquery",
      input: "SELECT (SELECT COUNT(*) FROM my_table)",
      tables: ["my_table"]
    },
    {
      name: "set_operations",
      input: "SELECT * FROM my_table UNION ALL SELECT * FROM my_table2 INTERSECT SELECT * FROM my_table3",
      tables: ["my_table", "my_table2", "my_table3"]
    },
    {
      name: "window_functions",
      input: "SELECT row_number() OVER (ORDER BY (SELECT i+j FROM my_table2)) FROM my_table",
      tables: ["my_table", "my_table2"]
    }
  ];
  function testTableNames(db2) {
    let conn;
    beforeEach(() => {
      conn = db2().connect();
    });
    afterEach(() => {
      conn.close();
    });
    describe("TableNames", () => {
      for (const test of TABLENAME_TESTS) {
        it(test.name, () => {
          const tables = conn.getTableNames(test.input);
          expect(tables).toEqual(test.tables);
        });
      }
    });
  }
  function testTableNamesAsync(db2) {
    let conn;
    beforeEach(async () => {
      conn = await db2().connect();
    });
    afterEach(async () => {
      await conn.close();
    });
    describe("TableNames Async", () => {
      for (const test of TABLENAME_TESTS) {
        it(test.name, async () => {
          const tables = await conn.getTableNames(test.input);
          expect(tables).toEqual(test.tables);
        });
      }
    });
  }

  // test/regression/github_332.test.ts
  function test332(db2) {
    let conn;
    beforeEach(async () => {
      await db2().flushFiles();
      conn = await db2().connect();
    });
    afterEach(async () => {
      await conn.close();
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("GitHub issues", () => {
      it("332", async () => {
        await db2().registerFileText(
          "Products.csv",
          `ProductGroup,Product,Year,Quarter,Revenue,Units,Count,Product Key,Reseller,Product Info,QuarterAsNumber
Electronics,Phone,2018,Q1,103,7,1,2018-Q1,Sony,Format=XML; <Properties>\u2026,1
Electronics,Phone,2018,Q1,102,4,1,2018-Q1,Sony,Format=XML; <Properties>\u2026,1
Electronics,Phone,2019,Q1,98,12,1,2019-Q1,Sony,Format=XML; <Properties>\u2026,1
Electronics,Computer,2018,Q1,104,3,1,2018-Q1,Samsung,Format=XML; <Properties>\u2026,1
Electronics,Computer,2019,Q1,83,7,1,2019-Q1,Google,Format=XML; <Properties>\u2026,1
Media,Theater,2018,Q1,17,4,1,2018-Q1,Sony,Format=XML; <Properties>\u2026,1
Media,Theater,2019,Q1,20,7,1,2019-Q1,Sony,Format=XML; <Properties>\u2026,1
Media,Movies,2018,Q1,25,12,1,2018-Q1,Microsoft,Format=XML; <Properties>\u2026,1
Media,Movies,2019,Q1,26,13,1,2019-Q1,Sony,Format=XML; <Properties>\u2026,1
Electronics,Phone,2018,Q2,105,5,1,2018-Q2,Samsung,Format=XML; <Properties>\u2026,2
Electronics,Phone,2019,Q2,82,15,1,2019-Q2,LG,Format=XML; <Properties>\u2026,2
Electronics,Computer,2018,Q2,99,4,1,2018-Q2,LG,Format=XML; <Properties>\u2026,2
Electronics,Computer,2019,Q2,84,20,1,2019-Q2,Sony,Format=XML; <Properties>\u2026,2
Media,Theater,2018,Q2,17,4,1,2018-Q2,Microsoft,Format=XML; <Properties>\u2026,2
Media,Theater,2019,Q2,22,5,1,2019-Q2,Sony,Format=XML; <Properties>\u2026,2
Media,Movies,2018,Q2,25,12,1,2018-Q2,Samsung,Format=XML; <Properties>\u2026,2
Media,Movies,2019,Q2,26,14,1,2019-Q2,Google,Format=XML; <Properties>\u2026,2
Electronics,Phone,2000,Q1,103,7,1,2000-Q1,Sony,Format=XML; <Properties>\u2026,1
Electronics,Phone,2001,Q1,102,4,1,2001-Q1,Sony,Format=XML; <Properties>\u2026,1
Electronics,Phone,2002,Q1,98,12,1,2002-Q1,Microsoft,Format=XML; <Properties>\u2026,1
Electronics,Computer,2003,Q1,104,3,1,2003-Q1,Sony,Format=XML; <Properties>\u2026,1
Electronics,Computer,2004,Q1,83,7,1,2004-Q1,Samsung,Format=XML; <Properties>\u2026,1
Media,Theater,2005,Q1,17,4,1,2005-Q1,Google,Format=XML; <Properties>\u2026,1
Media,Theater,2006,Q1,20,7,1,2006-Q1,Sony,Format=XML; <Properties>\u2026,1
Media,Movies,2007,Q1,25,12,1,2007-Q1,Sony,Format=XML; <Properties>\u2026,1
Media,Movies,2008,Q1,26,13,1,2008-Q1,Microsoft,Format=XML; <Properties>\u2026,1
Electronics,Phone,2009,Q2,105,5,1,2009-Q2,Sony,Format=XML; <Properties>\u2026,2
Electronics,Phone,2010,Q2,82,15,1,2010-Q2,Sony,Format=XML; <Properties>\u2026,2
Electronics,Computer,2011,Q2,99,4,1,2011-Q2,Sony,Format=XML; <Properties>\u2026,2
Electronics,Computer,2012,Q2,84,20,1,2012-Q2,Sony,Format=XML; <Properties>\u2026,2
Media,Theater,2013,Q2,17,4,1,2013-Q2,Sony,Format=XML; <Properties>\u2026,2
Media,Theater,2014,Q2,22,5,1,2014-Q2,Sony,Format=XML; <Properties>\u2026,2
Media,Movies,2015,Q2,25,12,1,2015-Q2,Sony,Format=XML; <Properties>\u2026,2
Media,Movies,2016,Q2,26,14,1,2016-Q2,Samsung,Format=XML; <Properties>\u2026,2
Media,Movies,2017,Q1,26,13,1,2017-Q1,Google,Format=XML; <Properties>\u2026,1
Electronics,Phone,2018,Q2,105,5,1,2018-Q2,Sony,Format=XML; <Properties>\u2026,2
Electronics,Phone,2019,Q2,82,15,1,2019-Q2,Sony,Format=XML; <Properties>\u2026,2
Electronics,Computer,2020,Q2,99,4,1,2020-Q2,Microsoft,Format=XML; <Properties>\u2026,2
Electronics,Phone,2020,Q1,103,7,1,2020-Q1,Sony,Format=XML; <Properties>\u2026,1
Electronics,Phone,2020,Q2,102,4,1,2020-Q2,Samsung,Format=XML; <Properties>\u2026,2
Electronics,Phone,2020,Q3,98,12,1,2020-Q3,LG,Format=XML; <Properties>\u2026,3
Electronics,Computer,2020,Q4,104,3,1,2020-Q4,LG,Format=XML; <Properties>\u2026,4
Electronics,Computer,2020,Q1,83,7,1,2020-Q1,Sony,Format=XML; <Properties>\u2026,1
Media,Theater,2020,Q1,17,4,1,2020-Q1,Microsoft,Format=XML; <Properties>\u2026,1
Media,Theater,2020,Q1,20,7,1,2020-Q1,Sony,Format=XML; <Properties>\u2026,1
`
        );
        await conn.query("CREATE TABLE products AS SELECT * FROM 'Products.csv'");
        const all = await conn.query("SELECT * FROM products");
        expect(all.schema.fields.length).toBe(11);
        expect(all.schema.fields[0].name).toBe("ProductGroup");
        const insensitive = await conn.query("SELECT productgroup FROM products GROUP BY productgroup");
        expect(insensitive.schema.fields.length).toBe(1);
        expect(insensitive.schema.fields[0].name).toBe("ProductGroup");
        expect(insensitive.toArray().length).toEqual(2);
        await conn.query("DROP TABLE products");
      });
    });
  }

  // test/regression/github_334.test.ts
  function test334(adb2) {
    describe("GitHub issues", () => {
      describe("334", () => {
        it("CSV insert", async () => {
          await adb2().registerFileText(`data.csv`, "1|foo\n2|bar\n");
          const conn = await adb2().connect();
          await conn.insertCSVFromPath("data.csv", {
            schema: "main",
            name: "foo",
            detect: false,
            header: false,
            delimiter: "|",
            columns: {
              col1: new Int32(),
              col2: new Utf8()
            }
          });
          await conn.query("DROP TABLE IF EXISTS foo");
          await conn.close();
          await adb2().dropFile("data.csv");
        });
        it("JSON row insert", async () => {
          await adb2().registerFileText(
            "rows.json",
            `[
                    { "col1": 1, "col2": "foo" },
                    { "col1": 2, "col2": "bar" },
                ]`
          );
          const conn = await adb2().connect();
          await conn.insertJSONFromPath("rows.json", { name: "rows" });
          await conn.query("DROP TABLE IF EXISTS rows");
          await conn.close();
          await adb2().dropFile("rows.json");
        });
        it("JSON column insert", async () => {
          await adb2().registerFileText(
            "columns.json",
            `{
                    "col1": [1, 2],
                    "col2": ["foo", "bar"]
                }`
          );
          const conn = await adb2().connect();
          await conn.insertJSONFromPath("columns.json", { name: "columns" });
          await conn.query("DROP TABLE IF EXISTS columns");
          await conn.close();
          await adb2().dropFile("columns.json");
        });
        it("Query result materialized", async () => {
          const conn = await adb2().connect();
          await conn.query(`
                SELECT * FROM generate_series(1, 100) t(v)
            `);
          await conn.close();
        });
        it("Query result streamed", async () => {
          const conn = await adb2().connect();
          for await (const batch of await conn.send(`
                SELECT * FROM generate_series(1, 100) t(v)
            `)) {
            expect(batch.numRows).toBeGreaterThan(0);
          }
          await conn.close();
        });
        it("Prepared statement materialized", async () => {
          const conn = await adb2().connect();
          const stmt = await conn.prepare(`SELECT v + ? FROM generate_series(0, 10000) as t(v);`);
          await stmt.query(234);
          await stmt.close();
          await conn.close();
        });
        it("Prepared statement streamed", async () => {
          const conn = await adb2().connect();
          const stmt = await conn.prepare(`SELECT v + ? FROM generate_series(0, 10000) as t(v);`);
          for await (const batch of await stmt.send(234)) {
            expect(batch.numRows).toBeGreaterThan(0);
          }
          await stmt.close();
          await conn.close();
        });
      });
    });
  }

  // test/regression/github_393.test.ts
  function test393(db2) {
    let conn = null;
    beforeEach(async () => {
      await db2().flushFiles();
    });
    afterEach(async () => {
      if (conn) {
        await conn.close();
        conn = null;
      }
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("GitHub issues", () => {
      it("393", async () => {
        await db2().open({
          path: ":memory:",
          query: {
            castTimestampToDate: false
          }
        });
        conn = await db2().connect();
        const resultWithoutCast = await conn.query(`SELECT TIMESTAMP '1992-03-22 01:02:03' as ts`);
        expect(resultWithoutCast.toArray()[0]?.ts).toEqual(new Date(Date.UTC(1992, 2, 22, 1, 2, 3)).getTime());
        await db2().open({
          path: ":memory:",
          query: {
            castTimestampToDate: true
          }
        });
        conn = await db2().connect();
        const resultWithCast = await conn.query(`SELECT TIMESTAMP '1992-03-22 01:02:03' as ts`);
        expect(resultWithCast.toArray()[0]?.ts).toEqual(new Date(Date.UTC(1992, 2, 22, 1, 2, 3)));
      });
    });
  }

  // test/regression/github_448.test.ts
  function test448(db2) {
    let conn = null;
    beforeEach(async () => {
      await db2().flushFiles();
    });
    afterEach(async () => {
      if (conn) {
        await conn.close();
        conn = null;
      }
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("GitHub issues", () => {
      it("448", async () => {
        conn = await db2().connect();
        await conn.query(`create temp table test448(i integer)`);
        await conn.query(`insert into test448 values (1),(2),(1)`);
        let result = await conn.query(`select * from test448`);
        expect(result.numCols).toBe(1);
        expect(result.numRows).toBe(3);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([1, 2, 1]));
        result = await conn.query(`select histogram(i) from test448`);
        expect(result.numCols).toBe(1);
        expect(result.numRows).toBe(1);
        const array = result.getChildAt(0).toArray();
        expect(array.length).toEqual(1);
        expect(array[0].toString()).toEqual("{1: 2, 2: 1}");
      });
    });
  }

  // test/regression/github_470.test.ts
  function test470(db2) {
    let conn = null;
    beforeEach(async () => {
      await db2().flushFiles();
    });
    afterEach(async () => {
      if (conn) {
        await conn.close();
        conn = null;
      }
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("GitHub issues", () => {
      it("470", async () => {
        await db2().open({
          path: ":memory:",
          query: {
            castDurationToTime64: false
          }
        });
        conn = await db2().connect();
        const result1 = await conn.query(`SELECT INTERVAL '3' MONTH AS interval`);
        expect(result1.toArray()[0]?.interval?.toString()).toEqual("0,3");
        await db2().open({
          path: ":memory:",
          query: {
            castDurationToTime64: true
          }
        });
        conn = await db2().connect();
        const resultWithCast = await conn.query(`SELECT INTERVAL '3' MONTH AS interval`);
        expect(resultWithCast.toArray()[0]?.interval?.toString()).toEqual("0,3");
        await db2().open({
          path: ":memory:",
          query: {}
        });
        conn = await db2().connect();
        const resultWithDefault = await conn.query(`SELECT INTERVAL '3' MONTH AS interval`);
        expect(resultWithDefault.toArray()[0]?.interval?.toString()).toEqual("0,3");
      });
    });
  }

  // test/regression/github_477.test.ts
  function test477(db2) {
    let conn = null;
    beforeEach(async () => {
      await db2().flushFiles();
    });
    afterEach(async () => {
      if (conn) {
        await conn.close();
        conn = null;
      }
      await db2().flushFiles();
      await db2().dropFiles();
    });
    describe("GitHub issues", () => {
      it("477", async () => {
        await db2().open({
          path: ":memory:",
          query: {}
        });
        conn = await db2().connect();
        const resultWithoutCast = await conn.query(`SELECT (-1.9)::DECIMAL(2,1) as decimal`);
        expect(resultWithoutCast.schema.fields[0].type.scale).toEqual(1);
        expect(resultWithoutCast.schema.fields[0].type.precision).toEqual(2);
        expect(resultWithoutCast.toArray()[0]?.decimal == -19).toBe(true);
        await db2().open({
          path: ":memory:",
          query: {
            castDecimalToDouble: true
          }
        });
        conn = await db2().connect();
        const resultWithCast = await conn.query(`SELECT (-1.9)::DECIMAL(2,1) as decimal`);
        expect(resultWithCast.toArray()[0]?.decimal).toEqual(-1.9000000000000001);
      });
    });
  }

  // test/regression/index.ts
  function testRegressionAsync(adb2) {
    test332(adb2);
    test334(adb2);
    test393(adb2);
    test448(adb2);
    test470(adb2);
    test477(adb2);
  }

  // test/udf.test.ts
  function testUDF(db2) {
    let conn;
    beforeEach(() => {
      conn = db2().connect();
    });
    afterEach(() => {
      conn.close();
      db2().flushFiles();
      db2().dropFiles();
    });
    describe("UDF", () => {
      it("simple", async () => {
        conn.createScalarFunction("jsudf", new Int32(), (a) => a);
        const result = conn.query(
          "SELECT max(jsudf(v::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)"
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([1e4]));
      });
      it("double", async () => {
        conn.createScalarFunction("jsudf2", new Float64(), (a) => a);
        const result = conn.query(
          "SELECT max(jsudf2(v::DOUBLE))::DOUBLE as foo FROM generate_series(1, 10000) as t(v)"
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Float64Array([1e4]));
      });
      it("2 args", async () => {
        conn.createScalarFunction("jsudf3", new Int32(), (a, b) => a + b);
        const result = conn.query(
          "SELECT max(jsudf3(v::INTEGER, v::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)"
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([2e4]));
      });
      it("3 args", async () => {
        conn.createScalarFunction("jsudf3args", new Int32(), (a, b, c) => a + b + c);
        const result = conn.query(
          "SELECT max(jsudf3args(v::INTEGER, v::INTEGER, v::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)"
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([3e4]));
      });
      it("4 args", async () => {
        conn.createScalarFunction("jsudf4args", new Int32(), (a, b, c, d) => a + b + c + d);
        const result = conn.query(
          "SELECT max(jsudf4args(v::INTEGER, v::INTEGER, v::INTEGER, v::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)"
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([4e4]));
      });
      it("noargs", async () => {
        conn.createScalarFunction("jsudf4", new Int32(), () => 42);
        const result = conn.query("SELECT max(jsudf4())::INTEGER as foo FROM generate_series(1, 10000) as t(v)");
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([42]));
      });
      it("withnulls", async () => {
        conn.createScalarFunction("jsudf5", new Int32(), (a) => a == null ? -100 : a);
        const result = conn.query(
          "SELECT min(jsudf5((case when v % 2 = 0 then v else null end)::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)"
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([-100]));
      });
      it("stringparam", async () => {
        function jsudf6(s) {
          return s.length;
        }
        conn.createScalarFunction("jsudf6", new Int32(), jsudf6);
        const result = conn.query(
          "SELECT max(jsudf6('str_' || v))::INTEGER as foo FROM generate_series(1, 10000) as t(v)"
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([9]));
      });
      it("stringparamnulls", async () => {
        function jsudf7(s) {
          if (s == void 0) {
            return 0;
          } else {
            return s.length;
          }
        }
        conn.createScalarFunction("jsudf7", new Int32(), jsudf7);
        const result = conn.query(
          "SELECT max(jsudf7((case when v % 2 = 0 then 'str_' || v else null end)::VARCHAR))::INTEGER as foo FROM generate_series(1, 10000) as t(v)"
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([9]));
      });
      it("nullintreturn", async () => {
        conn.createScalarFunction("jsudf8", new Int32(), (a) => void 0);
        const result = conn.query(
          "SELECT max(COALESCE(jsudf8(v::INTEGER), 42))::INTEGER as foo FROM generate_series(1, 10000) as t(v)"
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([42]));
      });
      it("stringreturn", async () => {
        conn.createScalarFunction("jsudf9", new Utf8(), (a) => "Hello " + a);
        const result = conn.query(
          "SELECT max(LENGTH(jsudf9(v::INTEGER)))::INTEGER as foo FROM generate_series(1, 10000) as t(v)"
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([11]));
      });
      it("nullstringreturn", async () => {
        conn.createScalarFunction("jsudf10", new Utf8(), (a) => a % 2 == 0 ? "Hello" : void 0);
        const result = conn.query(
          "SELECT COUNT(jsudf10(v::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)"
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([5e3]));
      });
      it("struct", async () => {
        conn.createScalarFunction("jsudf11", new Int32(), (a) => a.x == null ? -100 : a.x);
        const result = conn.query(
          `SELECT min(jsudf11({'x': (case when v % 2 = 0 then v else null end)::INTEGER, 'y': 42}))::INTEGER as foo FROM generate_series(1, 10000) as t(v)`
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([-100]));
      });
      it("structnested", async () => {
        conn.createScalarFunction("jsudf12", new Int32(), (a) => a.x.y == null ? -100 : a.x.y);
        const result = conn.query(
          `SELECT min(jsudf12({'x': {'y': (case when v % 2 = 0 then v else null end)::INTEGER }, 'z': 42}))::INTEGER as foo FROM generate_series(1, 10000) as t(v)`
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([-100]));
      });
      it("structnestednull", async () => {
        conn.createScalarFunction("jsudf13", new Int32(), (a) => a.x?.y == null ? -100 : a.x.y);
        const result = conn.query(
          `SELECT min(jsudf13({'x': (case when v % 2 = 0 then {'y': v::INTEGER } else null end), 'z': 42}))::INTEGER as foo FROM generate_series(1, 10000) as t(v)`
        );
        expect(result.numRows).toEqual(1);
        expect(result.numCols).toEqual(1);
        expect(result.getChildAt(0)?.length).toEqual(1);
        expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([-100]));
      });
    });
  }

  // test/index_browser.ts
  var DUCKDB_BUNDLES = {
    mvp: {
      mainModule: new URL("/static/duckdb-mvp.wasm", window.location.href).href,
      mainWorker: new URL("/static/duckdb-browser-mvp.worker.js", window.location.href).href
    },
    eh: {
      mainModule: new URL("/static/duckdb-eh.wasm", window.location.href).href,
      mainWorker: new URL("/static/duckdb-browser-eh.worker.js", window.location.href).href
    },
    coi: {
      mainModule: new URL("/static/duckdb-coi.wasm", window.location.href).href,
      mainWorker: new URL("/static/duckdb-browser-coi.worker.js", window.location.href).href,
      pthreadWorker: new URL("/static/duckdb-browser-coi.pthread.worker.js", window.location.href).href
    }
  };
  var DUCKDB_BUNDLE = null;
  describe("wasm check", () => {
    it("worker and wasm urls", async () => {
      if ((await getPlatformFeatures()).crossOriginIsolated && await exceptions() && await threads()) {
        expect(DUCKDB_BUNDLE.mainModule).toEqual(DUCKDB_BUNDLES.coi.mainModule);
        expect(DUCKDB_BUNDLE.mainWorker).toEqual(DUCKDB_BUNDLES.coi.mainWorker);
        expect(DUCKDB_BUNDLE.pthreadWorker).toEqual(DUCKDB_BUNDLES.coi.pthreadWorker);
      }
      if (await exceptions() && !await threads()) {
        expect(DUCKDB_BUNDLE.mainModule).toEqual(DUCKDB_BUNDLES.eh.mainModule);
        expect(DUCKDB_BUNDLE.mainWorker).toEqual(DUCKDB_BUNDLES.eh.mainWorker);
        expect(DUCKDB_BUNDLE.pthreadWorker).toEqual(null);
      }
      if (!await exceptions()) {
        expect(DUCKDB_BUNDLE.mainModule).toEqual(DUCKDB_BUNDLES.mvp.mainModule);
        expect(DUCKDB_BUNDLE.mainWorker).toEqual(DUCKDB_BUNDLES.mvp.mainWorker);
        expect(DUCKDB_BUNDLE.pthreadWorker).toEqual(null);
      }
    });
  });
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 6e4;
  var resolveBuffer = async (url) => {
    const req = await fetch(`/data${url}`);
    if (!req.ok)
      return null;
    return new Uint8Array(await req.arrayBuffer());
  };
  var resolveData = async (url) => {
    switch (url) {
      case "/uni/all.zip":
        return await resolveBuffer("/uni/all.zip");
      case "/uni/assistenten.parquet":
        return await resolveBuffer("/uni/assistenten.parquet");
      case "/uni/studenten.parquet":
        return await resolveBuffer("/uni/studenten.parquet");
      case "/uni/hoeren.parquet":
        return await resolveBuffer("/uni/hoeren.parquet");
      case "/uni/vorlesungen.parquet":
        return await resolveBuffer("/uni/vorlesungen.parquet");
      case "/tpch/0_01/parquet/lineitem.parquet":
        return await resolveBuffer("/tpch/0_01/parquet/lineitem.parquet");
      default:
        return null;
    }
  };
  var db = null;
  var adb = null;
  var worker = null;
  beforeAll(async () => {
    const logger = new VoidLogger();
    db = await createDuckDB(DUCKDB_BUNDLES, logger, BROWSER_RUNTIME);
    await db.instantiate((_) => {
    });
    DUCKDB_BUNDLE = await selectBundle(DUCKDB_BUNDLES);
    worker = await createWorker(DUCKDB_BUNDLE.mainWorker);
    adb = new AsyncDuckDB(logger, worker);
    await adb.instantiate(DUCKDB_BUNDLE.mainModule, DUCKDB_BUNDLE.pthreadWorker);
  });
  afterAll(async () => {
    if (worker)
      worker.terminate();
  });
  var baseURL = window.location.origin;
  var dataURL = `${baseURL}/data`;
  testHTTPFS(() => db);
  testHTTPFSAsync(() => adb, resolveData, dataURL);
  testUDF(() => db);
  testTableNames(() => db);
  testTableNamesAsync(() => adb);
  testRegressionAsync(() => adb);
  testAllTypes(() => db);
  testAllTypesAsync(() => adb);
  testBindings(() => db, dataURL);
  testAsyncBindings(() => adb, dataURL, 4 /* HTTP */);
  testBatchStream(() => db);
  testAsyncBatchStream(() => adb);
  testFilesystem(() => adb, resolveData, dataURL, 4 /* HTTP */);
  testArrowInsert(() => db);
  testArrowInsertAsync(() => adb);
  testJSONInsert(() => db);
  testJSONInsertAsync(() => adb);
  testCSVInsert(() => db);
  testCSVInsertAsync(() => adb);
  testTokenization(() => db);
  testTokenizationAsync(() => adb);
})();
/*! Bundled license information:

js-sha256/src/sha256.js:
  (**
   * [js-sha256]{@link https://github.com/emn178/js-sha256}
   *
   * @version 0.9.0
   * @author Chen, Yi-Cyuan [emn178@gmail.com]
   * @copyright Chen, Yi-Cyuan 2014-2017
   * @license MIT
   *)
*/
//# sourceMappingURL=tests-browser.js.map
