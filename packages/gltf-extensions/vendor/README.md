# Vendored files

## basis_transcoder.js / basis_transcoder.wasm

Official **Basis Universal** KTX2/ETC1S/UASTC transcoder binaries used by the
`KHR_texture_basisu` implementation (`src/basisu/BasisWasmTranscoder.ts`).

- Source: https://github.com/BinomialLLC/basis_universal (Apache License 2.0)
- Copied from the copy distributed with `three.js` v0.186.0
  (`examples/jsm/libs/basis/basis_transcoder.{js,wasm}`), which vendors the
  official BinomialLLC build unchanged. three.js itself is MIT licensed; the
  underlying Basis Universal code is Apache 2.0.
- Upstream Apache 2.0 text:
  https://github.com/BinomialLLC/basis_universal/blob/master/LICENSE

The `.js` glue is an Emscripten factory with a CommonJS/AMD export footer. This
project is ESM and consumes it via a raw import plus a scoped `new Function`
evaluation (the footer is stripped and the `BASIS` factory is returned
directly). See `BasisWasmTranscoder._initModule` for details.

Generated code — do not edit directly. To update, replace both files from a
matching three.js/mrdoob release and re-run the transcoder tests.
