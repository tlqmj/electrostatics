# Build instructions
1. Install [emscripten](http://emscripten.org/).
2. Make sure environment variables are set.
3. Run `emcc code\electrostatics_wasm.cpp -o code\electrostatics_wasm.html -s EXPORTED_FUNCTIONS="['_sor_step', '_sor', '_electric_field']" -s EXTRA_EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']"`.
