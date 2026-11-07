/**
 * Minimal, self-contained ISO/IEC 18004 QR Code Generator (Versions 1..12, ECC Level L, Byte Mode UTF-8)
 * Renders crisp SVG and downloadable PNG card with agency branding.
 */
(function (global) {
  'use strict';

  // Capacities for Byte mode at ECC Level L (versions 1..12)
  // [totalCodewords, ecCodewordsPerBlock, numBlocksGroup1, dataCodewordsGroup1, numBlocksGroup2, dataCodewordsGroup2]
  const VERSION_TABLE = [
    null,
    [26, 7, 1, 19, 0, 0],     // v1: 17 bytes
    [44, 10, 1, 34, 0, 0],    // v2: 32 bytes
    [70, 15, 1, 55, 0, 0],    // v3: 53 bytes
    [100, 20, 1, 80, 0, 0],   // v4: 78 bytes
    [134, 26, 1, 108, 0, 0],  // v5: 106 bytes
    [172, 18, 2, 68, 0, 0],   // v6: 134 bytes
    [196, 20, 2, 78, 0, 0],   // v7: 154 bytes
    [242, 24, 2, 97, 0, 0],   // v8: 192 bytes
    [292, 30, 2, 116, 0, 0],  // v9: 230 bytes
    [346, 18, 2, 68, 2, 69],  // v10: 271 bytes
    [404, 20, 4, 81, 0, 0],   // v11: 321 bytes
    [466, 24, 2, 92, 2, 93]   // v12: 367 bytes
  ];

  const ALIGNMENT_POS = [
    null,
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58]
  ];

  // GF(256) math for Reed-Solomon
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) {
      GF_EXP[i] = GF_EXP[i - 255];
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(degree) {
    let poly = new Uint8Array([1]);
    for (let i = 0; i < degree; i++) {
      const next = new Uint8Array(poly.length + 1);
      const factor = GF_EXP[i];
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, ecLen) {
    const gen = rsGeneratorPoly(ecLen);
    const rem = new Uint8Array(ecLen);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ rem[0];
      rem.copyWithin(0, 1);
      rem[ecLen - 1] = 0;
      if (factor !== 0) {
        for (let j = 0; j < ecLen; j++) {
          rem[j] ^= gfMul(gen[j + 1], factor);
        }
      }
    }
    return rem;
  }

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return Array.from(new TextEncoder().encode(str));
    }
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) {
        out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }
    return out;
  }

  function pickVersion(byteLength) {
    for (let v = 1; v < VERSION_TABLE.length; v++) {
      const row = VERSION_TABLE[v];
      const totalData = row[2] * row[3] + row[4] * row[5];
      const headerBits = v <= 9 ? 12 : 20; // 4 mode + (8 or 16) length
      const maxBytes = totalData - Math.ceil(headerBits / 8);
      if (byteLength <= maxBytes) return v;
    }
    throw new Error('Dữ liệu đường link quá dài cho mã QR.');
  }

  function buildDataCodewords(bytes, version) {
    const row = VERSION_TABLE[version];
    const totalData = row[2] * row[3] + row[4] * row[5];
    const bits = [];
    function pushBits(val, len) {
      for (let i = len - 1; i >= 0; i--) {
        bits.push((val >>> i) & 1);
      }
    }
    // Byte mode indicator = 0100
    pushBits(0b0100, 4);
    pushBits(bytes.length, version <= 9 ? 8 : 16);
    for (let i = 0; i < bytes.length; i++) {
      pushBits(bytes[i], 8);
    }
    const maxBits = totalData * 8;
    const term = Math.min(4, maxBits - bits.length);
    for (let i = 0; i < term; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const codewords = new Uint8Array(totalData);
    for (let i = 0; i < bits.length / 8; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) {
        b = (b << 1) | bits[i * 8 + j];
      }
      codewords[i] = b;
    }
    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    for (let i = bits.length / 8; i < totalData; i++) {
      codewords[i] = padBytes[padIdx % 2];
      padIdx++;
    }
    return codewords;
  }

  function interleaveCodewords(dataCodewords, version) {
    const [, ecLen, g1Blocks, g1Len, g2Blocks, g2Len] = VERSION_TABLE[version];
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (let i = 0; i < g1Blocks; i++) {
      const blk = dataCodewords.subarray(offset, offset + g1Len);
      offset += g1Len;
      dataBlocks.push(blk);
      ecBlocks.push(rsEncode(blk, ecLen));
    }
    for (let i = 0; i < g2Blocks; i++) {
      const blk = dataCodewords.subarray(offset, offset + g2Len);
      offset += g2Len;
      dataBlocks.push(blk);
      ecBlocks.push(rsEncode(blk, ecLen));
    }

    const result = [];
    const maxDataLen = Math.max(g1Len, g2Len);
    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < dataBlocks.length; b++) {
        if (i < dataBlocks[b].length) result.push(dataBlocks[b][i]);
      }
    }
    for (let i = 0; i < ecLen; i++) {
      for (let b = 0; b < ecBlocks.length; b++) {
        result.push(ecBlocks[b][i]);
      }
    }
    return result;
  }

  function createMatrix(version, codewords) {
    const size = version * 4 + 17;
    const modules = Array.from({ length: size }, () => new Int8Array(size));
    const isFunc = Array.from({ length: size }, () => new Uint8Array(size));

    function setFuncModule(r, c, dark) {
      if (r < 0 || r >= size || c < 0 || c >= size) return;
      modules[r][c] = dark ? 1 : 0;
      isFunc[r][c] = 1;
    }

    function drawFinder(r, c) {
      for (let dy = -1; dy <= 7; dy++) {
        for (let dx = -1; dx <= 7; dx++) {
          const dist = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
          const dark = dist !== 2 && dist !== 4;
          setFuncModule(r + dy, c + dx, dark);
        }
      }
    }

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      setFuncModule(6, i, i % 2 === 0);
      setFuncModule(i, 6, i % 2 === 0);
    }

    // Alignment patterns
    const align = ALIGNMENT_POS[version];
    for (let i = 0; i < align.length; i++) {
      for (let j = 0; j < align.length; j++) {
        if (
          (i === 0 && j === 0) ||
          (i === 0 && j === align.length - 1) ||
          (i === align.length - 1 && j === 0)
        ) {
          continue;
        }
        const cr = align[i];
        const cc = align[j];
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            setFuncModule(cr + dy, cc + dx, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
          }
        }
      }
    }

    // Reserve format info areas & dark module
    for (let i = 0; i <= 8; i++) {
      if (i !== 6) {
        setFuncModule(8, i, false);
        setFuncModule(i, 8, false);
      }
    }
    for (let i = 0; i < 8; i++) {
      setFuncModule(8, size - 1 - i, false);
      setFuncModule(size - 1 - i, 8, false);
    }
    setFuncModule(size - 8, 8, true);

    // Version info for version >= 7
    if (version >= 7) {
      let rem = version;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const vBits = (version << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const bit = ((vBits >>> i) & 1) !== 0;
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        setFuncModule(a, b, bit);
        setFuncModule(b, a, bit);
      }
    }

    // Place data bits in zigzag
    let bitIdx = 0;
    const totalBits = codewords.length * 8;
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        const r = upward ? size - 1 - vert : vert;
        for (let j = 0; j < 2; j++) {
          const c = right - j;
          if (!isFunc[r][c]) {
            let dark = false;
            if (bitIdx < totalBits) {
              dark = ((codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) !== 0;
              bitIdx++;
            }
            modules[r][c] = dark ? 1 : 0;
          }
        }
      }
      upward = !upward;
    }

    // Apply mask 0: (r + c) % 2 === 0
    const mask = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isFunc[r][c] && (r + c) % 2 === 0) {
          modules[r][c] ^= 1;
        }
      }
    }

    // Write format info for ECC Level L (01) + mask 0 (000) -> data = 01000
    const fmtData = (0b01 << 3) | mask;
    let rem = fmtData;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const fmtBits = ((fmtData << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i++) setFuncModule(8, i, ((fmtBits >>> i) & 1) !== 0);
    setFuncModule(8, 7, ((fmtBits >>> 6) & 1) !== 0);
    setFuncModule(8, 8, ((fmtBits >>> 7) & 1) !== 0);
    setFuncModule(7, 8, ((fmtBits >>> 8) & 1) !== 0);
    for (let i = 9; i < 15; i++) setFuncModule(14 - i, 8, ((fmtBits >>> i) & 1) !== 0);

    for (let i = 0; i < 8; i++) setFuncModule(size - 1 - i, 8, ((fmtBits >>> i) & 1) !== 0);
    for (let i = 8; i < 15; i++) setFuncModule(8, size - 15 + i, ((fmtBits >>> i) & 1) !== 0);

    return modules;
  }

  function encodeQR(text) {
    const bytes = utf8Bytes(text);
    const version = pickVersion(bytes.length);
    const dataCw = buildDataCodewords(bytes, version);
    const allCw = interleaveCodewords(dataCw, version);
    return createMatrix(version, allCw);
  }

  function toSVG(text, opts) {
    const options = Object.assign({ margin: 3, fg: '#24201D', bg: '#FFFDF8' }, opts);
    const matrix = encodeQR(text);
    const n = matrix.length;
    const total = n + options.margin * 2;
    let path = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          path += `M${c + options.margin},${r + options.margin}h1v1h-1z`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="Mã QR đọc sách Sống khỏe kiểu Nhật"><rect width="${total}" height="${total}" fill="${options.bg}" rx="2"/><path d="${path}" fill="${options.fg}"/></svg>`;
  }

  function downloadQRCard(text, meta) {
    const info = Object.assign({ title: 'Sống khỏe kiểu Nhật', sub: 'Quét mã để đọc sách trên điện thoại', agency: '', zalo: '' }, meta);
    const matrix = encodeQR(text);
    const n = matrix.length;
    const canvas = document.createElement('canvas');
    const W = 720;
    const H = info.agency || info.zalo ? 940 : 860;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background card
    ctx.fillStyle = '#FFFDF8';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#C3272F';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    // Header
    ctx.fillStyle = '#C3272F';
    ctx.font = '800 22px "Nunito", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CẨM NANG SỨC KHỎE GIA ĐÌNH', W / 2, 78);

    ctx.fillStyle = '#24201D';
    ctx.font = '800 44px "Baloo 2", "Nunito", system-ui, sans-serif';
    ctx.fillText(info.title, W / 2, 132);

    ctx.fillStyle = '#5E5650';
    ctx.font = '600 22px "Nunito", system-ui, sans-serif';
    ctx.fillText(info.sub, W / 2, 172);

    // QR Code matrix
    const qrBox = 480;
    const cell = Math.floor(qrBox / (n + 4));
    const actualQr = cell * n;
    const startX = Math.floor((W - actualQr) / 2);
    const startY = 210;

    ctx.fillStyle = '#F7F1E6';
    ctx.fillRect(startX - 20, startY - 20, actualQr + 40, actualQr + 40);
    ctx.fillStyle = '#FFFDF8';
    ctx.fillRect(startX - 10, startY - 10, actualQr + 20, actualQr + 20);

    ctx.fillStyle = '#24201D';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(startX + c * cell, startY + r * cell, cell, cell);
        }
      }
    }

    let footY = startY + actualQr + 64;
    if (info.agency) {
      ctx.fillStyle = '#1D6A64';
      ctx.font = '800 26px "Nunito", system-ui, sans-serif';
      const agencyLabel = info.agency.length > 38 ? info.agency.slice(0, 37) + '…' : info.agency;
      ctx.fillText('Quà tặng từ: ' + agencyLabel, W / 2, footY);
      footY += 40;
    }
    if (info.zalo) {
      ctx.fillStyle = '#24201D';
      ctx.font = '700 24px "Nunito", system-ui, sans-serif';
      ctx.fillText('Zalo tư vấn: ' + info.zalo, W / 2, footY);
    }

    const a = document.createElement('a');
    a.download = 'QR-Song-Khoe-Kieu-Nhat.png';
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  global.SimpleQR = {
    encode: encodeQR,
    toSVG: toSVG,
    downloadCard: downloadQRCard
  };
})(window);
