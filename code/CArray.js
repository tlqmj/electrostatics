class CVector {
  constructor(type, length) {
    this.type = type;
    this.length = length;

    this.ptr = Module._malloc(type.BYTES_PER_ELEMENT*length);
    this.heap = new Uint8Array(
      Module.HEAPU8.buffer,
      this.ptr,
      type.BYTES_PER_ELEMENT*length);
    this.data = new type(
      this.heap.buffer,
      this.ptr,
      length);
    return this;
  }

  destroy() {
    Module._free(this.ptr);
    this.type = undefined;
    this.length = undefined;
    this.ptr = undefined;
    this.heap = undefined;
    this.data = undefined;
  }

  reinterpret(type) {
    return new type(
        this.heap.buffer,
        this.ptr,
        this.heap.length/type.BYTES_PER_ELEMENT);
  }

  fill(val) {
    this.data.fill(val);
    return this;
  }

  set(arr) {
    if (!(arr instanceof this.type)) throw "ARGUMENT ERROR in CVector.set";

    this.heap.set(new Uint8Array(arr));
    return this
  }
}

class CMatrix {
  constructor(type, m, n) {
    this.type = type;
    this.m = m;
    this.n = n;

    this.ptr = Module._malloc(type.BYTES_PER_ELEMENT*m*n);
    this.heap = new Uint8Array(
        Module.HEAPU8.buffer,
        this.ptr,
        type.BYTES_PER_ELEMENT*m*n);
    this.data = [];
    for (var i = 0; i < m; i++) {
      this.data.push(new type(
        this.heap.buffer,
        this.ptr + i * type.BYTES_PER_ELEMENT * n,
        n));
    }
    return this;
  }

  destroy() {
    Module._free(this.ptr);
    this.type = undefined;
    this.m = undefined;
    this.n = undefined;
    this.ptr = undefined;
    this.heap = undefined;
    this.data = undefined;
  }

  reinterpret(type) {
    var mat = [ ];

    for (var i = 0; i < this.m; i++) {
      mat.push(new type(
        this.heap.buffer,
        this.ptr + i * this.type.BYTES_PER_ELEMENT * this.n,
        this.n * this.type.BYTES_PER_ELEMENT / type.BYTES_PER_ELEMENT));
    }

    return mat;
  }

  reinterpret_as_vector(type) {
    if (type === undefined) type = this.type;

    return new type(
        this.heap.buffer,
        this.ptr,
        this.heap.length/type.BYTES_PER_ELEMENT);
  }

  fill(val) {
    this.reinterpret_as_vector().fill(val);
    return this;
  }

  set(mat) {
    // TO DO
  }
}
