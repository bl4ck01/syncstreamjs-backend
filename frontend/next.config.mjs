/** @type {import('next').NextConfig} */
const nextConfig = {
	webpack: (config) => {
		// Enable WebAssembly support for DuckDB-WASM
		config.experiments = {
			...config.experiments,
			asyncWebAssembly: true,
		};
		return config;
	},
};

export default nextConfig;
