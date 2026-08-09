const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xEDB88320 ^ (value >>> 1)) : (value >>> 1);
  CRC_TABLE[index] = value >>> 0;
}

export function crc32(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let crc = 0xFFFFFFFF;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function safeName(value) {
  const name = String(value).replaceAll('\\', '/');
  const segments = name.split('/');
  if (!name || name.startsWith('/') || /^[A-Za-z]:\//.test(name) || segments.some((segment) => segment === '..' || !segment)) {
    throw new Error(`Unsafe ZIP entry: ${value}`);
  }
  return name;
}

function dosTimestamp(date = new Date('2024-01-01T00:00:00Z')) {
  const year = Math.max(1980, Math.min(2107, date.getUTCFullYear()));
  const time = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2);
  const day = ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  return { time, day };
}

function localHeader(nameBytes, data, checksum, stamp) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034B50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(stamp.time, 10);
  header.writeUInt16LE(stamp.day, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function centralHeader(nameBytes, data, checksum, stamp, offset) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014B50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(stamp.time, 12);
  header.writeUInt16LE(stamp.day, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(nameBytes.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  return header;
}

export function createStoredZip(entries, options = {}) {
  if (!Array.isArray(entries) || entries.length > 0xFFFF) throw new Error('ZIP entries must be an array with at most 65535 files');
  const stamp = dosTimestamp(options.date);
  const normalized = entries.map((entry) => ({
    name: safeName(entry.name),
    data: Buffer.from(entry.data)
  })).sort((left, right) => left.name.localeCompare(right.name, 'en'));
  if (new Set(normalized.map(({ name }) => name)).size !== normalized.length) throw new Error('Duplicate ZIP entry name');

  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of normalized) {
    const nameBytes = Buffer.from(entry.name, 'utf8');
    const checksum = crc32(entry.data);
    const local = localHeader(nameBytes, entry.data, checksum, stamp);
    localParts.push(local, nameBytes, entry.data);
    centralParts.push(centralHeader(nameBytes, entry.data, checksum, stamp, offset), nameBytes);
    offset += local.length + nameBytes.length + entry.data.length;
  }

  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054B50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(normalized.length, 8);
  end.writeUInt16LE(normalized.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return new Uint8Array(Buffer.concat([...localParts, central, end]));
}
