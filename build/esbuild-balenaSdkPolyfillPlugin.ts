import { Plugin } from "esbuild";

export function BalenaSdkPolyfillPlugin(options?: {
    stream: boolean
}): Plugin {
    return {
        name: 'balenaSdkPolyfillPlugin',
        setup(build) {

            if (options?.stream) {
                // Use our own 'stream' polyfill, instead of 'node-modules-polyfill', to satisfy usage of 'Buffer' api in balena-sdk
                build.onResolve({ filter: /^stream$/ }, async () => {
                    const result = await build.resolve('stream-browserify', { resolveDir: './node_modules/' });
                    if (result.errors.length > 0) {
                        return { errors: result.errors };
                    }
                    return { path: result.path, external: false };
                });
            }

            // Instead of relying on runtime module resolution by the default index, explicitly
            // override 'balena-sdk'/'pinejs-client-core and point it to the es2018 module
            //
            // https://github.com/balena-io/balena-sdk/blob/c0877db26efbde5907d6b322e58c21570c6adc35/index.js#L2
            build.onResolve({ filter: /^balena-sdk$/ }, async () => {
                const result = await build.resolve('balena-sdk/es2018', { resolveDir: './node_modules/' });
                if (result.errors.length > 0) {
                    return { errors: result.errors };
                }
                return { path: result.path, external: false };
            });

            // https://github.com/balena-io-modules/pinejs-client-js/blob/52f3a97dc2b5aba07090a688fcd7afa2d2d789d8/index.js#L5
            build.onResolve({ filter: /^pinejs-client-core$/ }, async () => {
                const result = await build.resolve('pinejs-client-core/es2018', { resolveDir: './node_modules/.pnpm' });
                if (result.errors.length > 0) {
                    return { errors: result.errors };
                }
                return { path: result.path, external: false };
            });

        }
    };
}