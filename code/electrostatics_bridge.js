// emcc electrostatics_wasm.cpp -o electrostatics_wasm.html -s EXPORTED_FUNCTIONS="['_sor_step', '_sor']" -s EXTRA_EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']"

// Wrap c++ classes
sor_step       = Module.cwrap('sor_step',      'number', ['number', 'number', 'number', 'number', 'number']);
sor            = Module.cwrap('sor',           'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number']);
electric_field = Module.cwrap('electric_field', null,    ['number', 'number', 'number', 'number', 'number']);

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

    // Allocate arrays in emscripten memory and create views ('v.data',
    // 'v.data_vec', 'ie.data' and 'ie.data_vec') for easy access from js.
    this.v          = {};
    this.v._ptr     = Module._malloc(this.m*this.n*Float32Array.BYTES_PER_ELEMENT);
    this.v._heap    = new Uint8Array(Module.HEAPU8.buffer, this.v._ptr, this.m*this.n*Float32Array.BYTES_PER_ELEMENT);
    this.v.data_vec = new Float32Array( this.v._heap.buffer, this.v._heap.byteOffset, this.m*this.n);
    this.v.data     = []
    for (var i = 0; i < this.m; i++) {
      this.v.data.push(new Float32Array(this.v._heap.buffer, this.v._heap.byteOffset + i*Float32Array.BYTES_PER_ELEMENT*this.n, this.n))
    }

    this.ie          = {};
    this.ie._ptr     = Module._malloc(this.m*this.n*Uint8Array.BYTES_PER_ELEMENT);
    this.ie._heap    = new Uint8Array(Module.HEAPU8.buffer, this.ie._ptr, this.m*this.n*Uint8Array.BYTES_PER_ELEMENT);
    this.ie.data_vec = new Uint8Array(  this.ie._heap.buffer, this.ie._heap.byteOffset, this.m*this.n);
    this.ie.data     = []
    for (var i = 0; i < this.m; i++) {
      this.ie.data.push(new Uint8Array(this.ie._heap.buffer, this.ie._heap.byteOffset + i*Uint8Array.BYTES_PER_ELEMENT*this.n, this.n))
    }

    this.e            = {};
    this.e.u          = {};
    this.e.u._ptr     = Module._malloc(this.m*this.n*Float32Array.BYTES_PER_ELEMENT);
    this.e.u._heap    = new Uint8Array(Module.HEAPU8.buffer, this.e.u._ptr, this.m*this.n*Float32Array.BYTES_PER_ELEMENT);
    this.e.u.data_vec = new Float32Array( this.e.u._heap.buffer, this.e.u._heap.byteOffset, this.m*this.n);
    this.e.u.data     = []
    for (var i = 0; i < this.m; i++) {
      this.e.u.data.push(new Float32Array(this.e.u._heap.buffer, this.e.u._heap.byteOffset + i*Float32Array.BYTES_PER_ELEMENT*this.n, this.n))
    }

    this.e.v          = {};
    this.e.v._ptr     = Module._malloc(this.m*this.n*Float32Array.BYTES_PER_ELEMENT);
    this.e.v._heap    = new Uint8Array(Module.HEAPU8.buffer, this.e.v._ptr, this.m*this.n*Float32Array.BYTES_PER_ELEMENT);
    this.e.v.data_vec = new Float32Array( this.e.v._heap.buffer, this.e.v._heap.byteOffset, this.m*this.n);
    this.e.v.data     = []
    for (var i = 0; i < this.m; i++) {
      this.e.v.data.push(new Float32Array(this.e.v._heap.buffer, this.e.v._heap.byteOffset + i*Float32Array.BYTES_PER_ELEMENT*this.n, this.n))
    }

    if (v !== undefined && ie !== undefined) {
      this.set(v, ie);
    } else {
      this.v.data_vec.fill(0.0);
      this.ie.data_vec.fill(false);
      this.e.u.data_vec.fill(0.0);
      this.e.v.data_vec.fill(0.0);
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

    this.v._heap.set(new Uint8Array(v.buffer));
    this.ie._heap.set(new Uint8Array(ie.buffer));
  }

  // Sets boundary as an electrode
  // INPUTS:
  //   [val]: voltage of the electrode at the boundary.
  set_simple_boundary_condition(val) {
    if (val !== undefined && typeof(val) != 'number') {
       throw "ARGUMENT ERROR in Simulation.set_simple_boundary_condition. val must be a number"
    }

    for (var i = 0; i < this.m; i++) {
      this.ie.data[i][0]        = true;
      this.ie.data[i][this.n-1] = true;

      if (val !== undefined) {
        this.v.data[i][0]        = val;
        this.v.data[i][this.n-1] = val;
      }
    }

    for (var j = 0; j < this.n; j++) {
      this.ie.data[0][j]        = true;
      this.ie.data[this.m-1][j] = true;

      if (val !== undefined) {
        this.v.data[0][j]        = val;
        this.v.data[this.m-1][j] = val;
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

    var delta = sor(this.v._heap.byteOffset, this.ie._heap.byteOffset, this.m, this.n, omega, maxiter, tol);
    electric_field(this.e.u._heap.byteOffset, this.e.v._heap.byteOffset, this.v._heap.byteOffset, this.m, this.n);

    return delta;
  }

  add_electrode(i, j, val) {
    if(!(i >= 0 && i < this.m && j >= 0 && j < this.n)) throw "ARGUMENT ERROR in Simulation.add_electrode. Invalid index (i,j)"
    if(typeof(val) != 'number') throw "ARGUMENT ERROR in Simulation.add_electrode. val has to be a number"

    this.v.data[i][j]  = val;
    this.ie.data[i][j] = true;
  }

  remove_electrode(i, j) {
    if(!(i >= 0 && i < this.m && j >= 0 && j < this.n)) throw "ARGUMENT ERROR in Simulation.remove_electrode. Invalid index (i,j)"

    this.v.data[i][j]  = 0.0;
    this.ie.data[i][j] = false;
  }

  // Resets the simulation result.
  // Keeps the electrode configuration as is so that the same situation
  // can be simulated with different parameters
  reset() {
    for (var i = 0; i < this.m*this.n; i++) {
      if (!this.ie.data_vec[i]) this.v.data_vec[i] = 0.0;
    }
  }

  // Clears everything.
  // You end up with a blank simulation canvas so that a new configuration
  // can be simulated.
  clear() {
    this.v.data_vec.fill(0.0);
    this.ie.data_vec.fill(false);
    this.e.u.data_vec.fill(0.0);
    this.e.v.data_vec.fill(0.0);
    this.set_simple_boundary_condition();
  }

  free() {
    Module._free(this.v._ptr);
    Module._free(this.ie._ptr);

    this.m  = undefined;
    this.n  = undefined;
    this.v  = undefined;
    this.ie = undefined;
  }
}
