/** @type {import('next').NextConfig} */
const nextConfig = {
	webpack: (config) => {
		// Enable WebAssembly support for DuckDB-WASM
		config.experiments = {
			...config.experiments,
			asyncWebAssembly: true,
		};
		
		// Handle WASM files as resources
		config.module.rules.push({
			test: /\.wasm$/,
			type: 'asset/resource',
		});
		
		return config;
	},
};

export default nextConfig;
