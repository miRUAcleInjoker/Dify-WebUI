module.exports = {
    publishers: [
      {
        name: '@electron-forge/publisher-github',
        config: {
          repository: {
            owner: 'machaojin1917939763',
            name: 'MiChat'
          },
          prerelease: false,
          draft: true
        }
      }
    ]
  }