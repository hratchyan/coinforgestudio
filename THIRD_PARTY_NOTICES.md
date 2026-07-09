# Third-Party Notices

CoinForge Studio bundles the following third-party components. Each remains
under its own license:

| Component | Location | License |
| --- | --- | --- |
| Cinzel, Cinzel Decorative, EB Garamond, Bebas Neue, Oswald, Black Ops One, Great Vibes, Pirata One, Rye, Special Elite (fonts) | `app/assets/fonts/`, embedded in `app/js/fonts-data.js` | [SIL Open Font License 1.1](https://openfontlicense.org/) — via Google Fonts |
| U²-Net (`u2netp.onnx`) — background-removal model | `app/assets/models/` | [Apache License 2.0](https://github.com/xuebinqin/U-2-Net/blob/master/LICENSE) |
| onnxruntime-web (`ort.min.js`, `ort-wasm-*`) | `app/vendor/` | [MIT](https://github.com/microsoft/onnxruntime/blob/main/LICENSE) — © Microsoft Corporation |
| Electron (desktop builds only) | bundled into `dist/` executables | [MIT](https://github.com/electron/electron/blob/main/LICENSE) |

The OFL fonts are embedded as base64 WOFF2 for offline use; their reserved
font names are unmodified. The U²-Net model file is redistributed unchanged.
