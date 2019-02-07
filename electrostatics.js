// emcc electrostatics_wasm.cpp -o electrostatics_wasm.html -s EXPORTED_FUNCTIONS="['_sor_step', '_sor']" -s EXTRA_EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']"

// Wrap c++ classes
sor_step = Module.cwrap('sor_step', 'number', ['number', 'number', 'number', 'number', 'number']);
sor      = Module.cwrap('sor',      'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number']);

class Simulation {
  // INPUTS:
  //   m: Height of the Simulation
  //   n: Width of the Simulation
  //   [v]:  Array containing voltages on an uniform grid. It's actually an m*n matrix.
  //         The (i,j) element of this matrix can be accessed by this.v.data[i*n + j].
  //   [ie]: Array containing whether a point in the grid is fixed (Is an Electrode) or not.
  //         The (i,j) element of this matrix can be accessed by this.ie.data[i*n + j].
  constructor(m, n, v, ie) {
    if (!Number.isInteger(m) || !Number.isInteger(n)) {
      throw "ARGUMENT ERROR in Simulation.constructor. m, n must be integers."
    }

    this.m = m;
    this.n = n;

    // Allocate arrays in emscripten memory and create views ('v.data' and 'ie.data') for easy access from js.
    this.v = {};
    this.v.nbytes = m*n*Float32Array.BYTES_PER_ELEMENT;
    this.v.ptr    = Module._malloc(this.v.nbytes);
    this.v.heap   = new Uint8Array(Module.HEAPU8.buffer, this.v.ptr, this.v.nbytes);
    this.v.data   = new Float32Array( this.v.heap.buffer, this.v.heap.byteOffset, this.m*this.n);

    this.ie = {};
    this.ie.bytes = this.m*this.n*Uint8Array.BYTES_PER_ELEMENT;
    this.ie.ptr   = Module._malloc(this.ie.bytes);
    this.ie.heap  = new Uint8Array(Module.HEAPU8.buffer, this.ie.ptr, this.ie.bytes);
    this.ie.data  = new Uint8Array(  this.ie.heap.buffer, this.ie.heap.byteOffset, this.m*this.n);

    if (typeof(v) != 'undefined' && typeof(ie) != 'undefined') {
      this.set(v, ie);
    } else {
      this.v.data.fill(0.0);
      this.ie.data.fill(false);
      this.set_simple_boundary_condition();
    }
  }

  // Initialize the Simulation with the given voltage and electrode matrices.
  // INPUTS:
  //   v:  voltage matrix.
  //   ie: electrode matrix.
  set(v, ie) {
    // Sanitize inputs
    if(!(v  instanceof Float32Array)) throw "ARGUMENT ERROR in Simulation.set. v must be a Float32Array."
    if(!(ie instanceof Uint8Array))   throw "ARGUMENT ERROR in Simulation.set. ie must be a Uint8Array."
    if(!(v.length  == this.m*this.n)) throw "ARGUMENT ERROR in Simulation.set. v must have length m*n."
    if(!(ie.length == this.m*this.n)) throw "ARGUMENT ERROR in Simulation.set. ie must have length m*n."

    this.v.heap.set(new Uint8Array(v.buffer));
    this.ie.heap.set(new Uint8Array(ie.buffer));
  }

  // Sets boundary as an electrode
  // INPUTS:
  //   [val]: voltage of the electrode at the boundary.
  set_simple_boundary_condition(val) {
    if (typeof(val) != 'undefined' && typeof(val) != 'number') {
       throw "ARGUMENT ERROR in Simulation.set_simple_boundary_condition. val must be a number"
    }

    console.log("HELLOOOO")

    for (var i = 0; i < this.m; i++) {
      this.ie.data[i*this.n]              = true;
      this.ie.data[i*this.n * (this.n-1)] = true;

      if (typeof(val) != 'undefined') {
        this.v.data[i*this.n]              = val;
        this.v.data[i*this.n * (this.n-1)] = val;
      }
    }

    for (var j = 0; j < this.n; j++) {
      this.ie.data[j]                     = true;
      this.ie.data[(this.m-1)*this.n + j] = true;

      if (typeof(val) != 'undefined') {
        this.v.data[j]                     = val;
        this.v.data[(this.m-1)*this.n + j] = val;
      }
    }
  }

  // INPUTS:
  //   omega:   Over-relaxation coefficient. It should be such that 1 <= omega < 2.
  //   maxiter: Maximum number of iterations.
  //   tol:     Minimum error.
  // OUTPUT:
  //   max_delta: Approximate error.
  run(omega, maxiter, tol) {
    if(!(omega >= 1 && omega < 2))                  throw "ARGUMENT ERROR in Simulation.run. omega must be such that 1 <= omega < 2."
    if(!(Number.isInteger(maxiter) && maxiter > 0)) throw "ARGUMENT ERROR in Simulation.run. maxiter must be a positive integer."

    return sor(this.v.heap.byteOffset, this.ie.heap.byteOffset, this.m, this.n, omega, maxiter, tol);
  }

  add_electrode(i, j, val) {
    if(!(i >= 0 && i < this.m && j >= 0 && j < this.n)) throw "ARGUMENT ERROR in Simulation.add_electrode. Invalid index (i,j)"

    this.v.data[ i*this.n + j] = val;
    this.ie.data[i*this.n + j] = true;
  }

  remove_electrode(i, j) {
    if(!(i >= 0 && i < this.m && j >= 0 && j < this.n)) throw "ARGUMENT ERROR in Simulation.remove_electrode. Invalid index (i,j)"

    this.v.data[ i*this.n + j] = 0.0;
    this.ie.data[i*this.n + j] = false;
  }

  reset() {
    for (var i = 0; i < this.m*this.n; i++) {
      if (!this.ie.data[i]) this.v.data[i] = 0.0;
    }
  }

  free() {
    Module._free(this.v.ptr);
    Module._free(this.ie.ptr);

    this.m  = undefined;
    this.n  = undefined;
    this.v  = undefined;
    this.ie = undefined;
  }
}
