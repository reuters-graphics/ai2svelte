module.exports = {
  hooks: {
    readPackage(pkg, context) {
      // Block any attempts to read or process package.json files from internal folders
      if (context.dir.includes("ai2svelte") || context.dir.includes("legacy")) {
        return null; // Return null to ignore these packages completely
      }
      return pkg;
    },
  },
};
